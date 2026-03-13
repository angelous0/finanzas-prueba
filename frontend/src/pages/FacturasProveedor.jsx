/**
 * FacturasProveedor — Orquestador.
 *
 * La lógica está distribuida en sub-módulos:
 *   helpers.js           → Formatters, cálculos, PDF
 *   FacturasTable.jsx    → Tabla con filtros y acciones
 *   FacturaFormModal.jsx → Modal crear/editar factura
 *   PagoModal.jsx        → Modal registrar pago
 *   LetrasModal.jsx      → Modal canjear por letras
 *   VerPagosModal.jsx    → Modal ver historial de pagos
 *   VerLetrasModal.jsx   → Modal ver letras vinculadas
 *   ExportModal.jsx      → Modal exportar CompraAPP
 *   ProveedorModal.jsx   → Modal crear proveedor
 */
import React, { useState, useEffect } from 'react';
import {
  getFacturasProveedor, deleteFacturaProveedor,
  getProveedores, getMonedas, getCategorias, getLineasNegocio, getCentrosCosto,
  getInventario, getModelosCortes, getCuentasFinancieras
} from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

import { formatCurrency, generatePDFAndPrint } from './facturasProveedor/helpers';
import FacturasTable from './facturasProveedor/FacturasTable';
import FacturaFormModal from './facturasProveedor/FacturaFormModal';
import PagoModal from './facturasProveedor/PagoModal';
import LetrasModal from './facturasProveedor/LetrasModal';
import VerPagosModal from './facturasProveedor/VerPagosModal';
import VerLetrasModal from './facturasProveedor/VerLetrasModal';
import ExportModal from './facturasProveedor/ExportModal';
import ProveedorModal from './facturasProveedor/ProveedorModal';

export const FacturasProveedor = () => {
  const { empresaActual } = useEmpresa();

  // Data
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [lineasNegocio, setLineasNegocio] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [modelosCortes, setModelosCortes] = useState([]);
  const [cuentasFinancieras, setCuentasFinancieras] = useState([]);
  const [valorizacionMap, setValorizacionMap] = useState({});

  // Filters
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroNumero, setFiltroNumero] = useState('');
  const [filtroProveedorId, setFiltroProveedorId] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFactura, setEditingFactura] = useState(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaParaPago, setFacturaParaPago] = useState(null);
  const [showLetrasModal, setShowLetrasModal] = useState(false);
  const [facturaParaLetras, setFacturaParaLetras] = useState(null);
  const [showVerPagosModal, setShowVerPagosModal] = useState(false);
  const [facturaParaVerPagos, setFacturaParaVerPagos] = useState(null);
  const [showVerLetrasModal, setShowVerLetrasModal] = useState(false);
  const [facturaParaVerLetras, setFacturaParaVerLetras] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProveedorModal, setShowProveedorModal] = useState(false);

  useEffect(() => { loadData(); }, [filtroEstado, filtroProveedorId, filtroFecha, empresaActual]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroProveedorId) params.proveedor_id = filtroProveedorId;
      if (filtroFecha) params.fecha_desde = filtroFecha;

      const [facturasRes, proveedoresRes, monedasRes, categoriasRes, lineasRes, centrosRes, inventarioRes, modelosRes, cuentasRes] = await Promise.all([
        getFacturasProveedor(params),
        getProveedores(),
        getMonedas(),
        getCategorias('egreso'),
        getLineasNegocio(),
        getCentrosCosto(),
        getInventario(),
        getModelosCortes(),
        getCuentasFinancieras()
      ]);

      setFacturas(facturasRes.data);
      setProveedores(proveedoresRes.data);
      setMonedas(monedasRes.data);
      setCategorias(categoriasRes.data);
      setLineasNegocio(lineasRes.data);
      setCentrosCosto(centrosRes.data);
      setInventario(inventarioRes.data);
      setModelosCortes(modelosRes.data);
      setCuentasFinancieras(cuentasRes.data);

      // Fetch FIFO valuation
      try {
        const valRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/valorizacion-inventario?empresa_id=${empresaActual?.id || 6}`);
        const valData = await valRes.json();
        const map = {};
        (valData.data || []).forEach(item => { map[item.id] = item; });
        setValorizacionMap(map);
      } catch (e) { console.warn('Could not load FIFO data:', e); }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleDelete = async (id) => {
    if (!window.confirm('Esta seguro de eliminar esta factura?')) return;
    try {
      await deleteFacturaProveedor(id);
      toast.success('Factura eliminada');
      loadData();
    } catch (error) {
      console.error('Error deleting factura:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar factura');
    }
  };

  const handleEdit = (factura) => {
    if (factura.estado !== 'pendiente') {
      toast.error('Solo se pueden editar facturas en estado pendiente');
      return;
    }
    setEditingFactura(factura);
    setShowFormModal(true);
  };

  const handleView = (factura) => {
    if (factura.estado === 'canjeado') {
      setFacturaParaVerLetras(factura); setShowVerLetrasModal(true);
    } else if (factura.estado === 'pagado' || factura.estado === 'parcial') {
      setFacturaParaVerPagos(factura); setShowVerPagosModal(true);
    } else {
      toast.info(`Factura ${factura.numero} - Total: ${formatCurrency(factura.total)}`);
    }
  };

  const handleNewFactura = () => { setEditingFactura(null); setShowFormModal(true); };

  // Calculate totals for header
  const facturasFiltradas = filtroNumero
    ? facturas.filter(f => f.numero?.toLowerCase().includes(filtroNumero.toLowerCase()))
    : facturas;
  const totalPendiente = facturasFiltradas.filter(f => f.estado === 'pendiente' || f.estado === 'parcial')
    .reduce((sum, f) => sum + parseFloat(f.saldo_pendiente || 0), 0);

  return (
    <div data-testid="facturas-proveedor-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturas de Proveedor</h1>
          <p className="page-subtitle">Pendiente: {formatCurrency(totalPendiente)}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setShowExportModal(true)} data-testid="export-compraapp-btn" title="Exportar CompraAPP">
            <FileSpreadsheet size={18} /> CompraAPP
          </button>
          <button className="btn btn-primary" onClick={handleNewFactura} data-testid="nueva-factura-btn">
            <Plus size={18} /> Nueva Factura
          </button>
        </div>
      </div>

      <div className="page-content">
        <FacturasTable
          facturas={facturas}
          loading={loading}
          proveedores={proveedores}
          filtroNumero={filtroNumero} setFiltroNumero={setFiltroNumero}
          filtroProveedorId={filtroProveedorId} setFiltroProveedorId={setFiltroProveedorId}
          filtroFecha={filtroFecha} setFiltroFecha={setFiltroFecha}
          filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
          onOpenPago={(f) => { setFacturaParaPago(f); setShowPagoModal(true); }}
          onOpenLetras={(f) => { setFacturaParaLetras(f); setShowLetrasModal(true); }}
          onVerPagos={(f) => { setFacturaParaVerPagos(f); setShowVerPagosModal(true); }}
          onVerLetras={(f) => { setFacturaParaVerLetras(f); setShowVerLetrasModal(true); }}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDownloadPDF={(f) => generatePDFAndPrint(f, proveedores, monedas)}
          onNewFactura={handleNewFactura}
        />
      </div>

      {/* Modals */}
      <FacturaFormModal
        show={showFormModal}
        editingFactura={editingFactura}
        proveedores={proveedores}
        monedas={monedas}
        categorias={categorias}
        lineasNegocio={lineasNegocio}
        centrosCosto={centrosCosto}
        inventario={inventario}
        modelosCortes={modelosCortes}
        valorizacionMap={valorizacionMap}
        onClose={() => { setShowFormModal(false); setEditingFactura(null); }}
        onSaved={loadData}
        onProveedorCreated={(newProv) => setProveedores(prev => [...prev, newProv])}
      />

      <PagoModal
        show={showPagoModal}
        factura={facturaParaPago}
        cuentasFinancieras={cuentasFinancieras}
        onClose={() => setShowPagoModal(false)}
        onPagoRegistrado={() => { setShowPagoModal(false); loadData(); }}
      />

      <LetrasModal
        show={showLetrasModal}
        factura={facturaParaLetras}
        cuentasFinancieras={cuentasFinancieras}
        onClose={() => setShowLetrasModal(false)}
        onLetrasCreadas={() => { setShowLetrasModal(false); loadData(); }}
      />

      <VerPagosModal
        show={showVerPagosModal}
        factura={facturaParaVerPagos}
        onClose={() => setShowVerPagosModal(false)}
        onDataChanged={loadData}
      />

      <VerLetrasModal
        show={showVerLetrasModal}
        factura={facturaParaVerLetras}
        onClose={() => setShowVerLetrasModal(false)}
        onDataChanged={loadData}
      />

      <ExportModal show={showExportModal} onClose={() => setShowExportModal(false)} />

      <ProveedorModal
        show={showProveedorModal}
        onClose={() => setShowProveedorModal(false)}
        onCreated={(newProv) => { setProveedores(prev => [...prev, newProv]); setShowProveedorModal(false); }}
      />
    </div>
  );
};

export default FacturasProveedor;
