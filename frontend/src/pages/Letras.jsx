import React, { useState, useEffect } from 'react';
import { 
  getFacturasProveedor, getLetras, generarLetras, deleteLetra,
  createPago, getCuentasFinancieras
} from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Plus, Trash2, DollarSign, FileText, X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value, symbol = 'S/') => {
  return `${symbol} ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PE');
};

const estadoBadge = (estado) => {
  const badges = {
    pendiente: 'badge badge-warning',
    parcial: 'badge badge-info',
    pagada: 'badge badge-success',
    vencida: 'badge badge-error',
    protestada: 'badge badge-error',
    anulada: 'badge badge-neutral'
  };
  return badges[estado] || 'badge badge-neutral';
};

export const Letras = () => {
  const { empresaActual } = useEmpresa();

  const [letras, setLetras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerarModal, setShowGenerarModal] = useState(false);
  const [showPagarModal, setShowPagarModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [cuentasFinancieras, setCuentasFinancieras] = useState([]);
  const [letraAPagar, setLetraAPagar] = useState(null);
  
  const [generarForm, setGenerarForm] = useState({
    factura_id: '',
    cantidad_letras: 3,
    monto_por_letra: '',
    dias_entre_letras: 30
  });

  const [pagarForm, setPagarForm] = useState({
    cuenta_financiera_id: '',
    monto: 0,
    medio_pago: 'transferencia',
    referencia: ''
  });

  useEffect(() => {
    loadData();
  }, [empresaActual]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [letrasRes, facturasRes, cuentasRes] = await Promise.all([
        getLetras(),
        getFacturasProveedor({ estado: 'pendiente' }),
        getCuentasFinancieras()
      ]);
      setLetras(letrasRes.data);
      setFacturasPendientes(facturasRes.data.filter(f => f.estado === 'pendiente' || f.estado === 'parcial'));
      setCuentasFinancieras(cuentasRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarLetras = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await generarLetras({
        factura_id: parseInt(generarForm.factura_id),
        cantidad_letras: parseInt(generarForm.cantidad_letras),
        monto_por_letra: generarForm.monto_por_letra ? parseFloat(generarForm.monto_por_letra) : null,
        dias_entre_letras: parseInt(generarForm.dias_entre_letras)
      });
      toast.success('Letras generadas exitosamente');
      setShowGenerarModal(false);
      setGenerarForm({
        factura_id: '',
        cantidad_letras: 3,
        monto_por_letra: '',
        dias_entre_letras: 30
      });
      loadData();
    } catch (error) {
      console.error('Error generating letras:', error);
      toast.error(error.response?.data?.detail || 'Error al generar letras');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePagarLetra = async (e) => {
    e.preventDefault();
    if (!letraAPagar || submitting) return;
    const montoExacto = parseFloat(letraAPagar.saldo_pendiente);

    setSubmitting(true);
    try {
      await createPago({
        tipo: 'egreso',
        fecha: new Date().toISOString().split('T')[0],
        cuenta_financiera_id: parseInt(pagarForm.cuenta_financiera_id),
        monto_total: montoExacto,
        referencia: pagarForm.referencia,
        notas: `Pago letra ${letraAPagar.numero}`,
        detalles: [{
          cuenta_financiera_id: parseInt(pagarForm.cuenta_financiera_id),
          medio_pago: pagarForm.medio_pago,
          monto: montoExacto,
          referencia: pagarForm.referencia
        }],
        aplicaciones: [{
          tipo_documento: 'letra',
          documento_id: letraAPagar.id,
          monto_aplicado: montoExacto
        }]
      });
      toast.success('Letra pagada exitosamente');
      setShowPagarModal(false);
      setLetraAPagar(null);
      setPagarForm({
        cuenta_financiera_id: '',
        monto: 0,
        medio_pago: 'transferencia',
        referencia: ''
      });
      loadData();
    } catch (error) {
      console.error('Error paying letra:', error);
      toast.error(error.response?.data?.detail || 'Error al pagar letra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta letra?')) return;
    try {
      await deleteLetra(id);
      toast.success('Letra eliminada');
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar letra');
    }
  };

  const openPagarModal = (letra) => {
    setLetraAPagar(letra);
    setPagarForm({
      cuenta_financiera_id: cuentasFinancieras[0]?.id || '',
      monto: letra.saldo_pendiente,
      medio_pago: 'transferencia',
      referencia: ''
    });
    setShowPagarModal(true);
  };

  const totalPendiente = letras
    .filter(l => l.estado === 'pendiente' || l.estado === 'parcial')
    .reduce((sum, l) => sum + parseFloat(l.saldo_pendiente || 0), 0);

  return (
    <div data-testid="letras-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Letras</h1>
          <p className="page-subtitle">
            Pendiente: {formatCurrency(totalPendiente)}
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowGenerarModal(true)}
          data-testid="generar-letras-btn"
        >
          <Plus size={18} />
          Generar Letras
        </button>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
              </div>
            ) : letras.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-state-icon" />
                <div className="empty-state-title">No hay letras</div>
                <div className="empty-state-description">Genera letras desde una factura de proveedor</div>
                <button className="btn btn-primary" onClick={() => setShowGenerarModal(true)}>
                  <Plus size={18} />
                  Generar Letras
                </button>
              </div>
            ) : (
              <table className="data-table" data-testid="letras-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Factura</th>
                    <th>Proveedor</th>
                    <th>Emisión</th>
                    <th>Vencimiento</th>
                    <th className="text-right">Monto</th>
                    <th className="text-right">Saldo</th>
                    <th>Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {letras.map((letra) => (
                    <tr key={letra.id}>
                      <td style={{ fontWeight: 500 }}>{letra.numero}</td>
                      <td>{letra.factura_numero || '-'}</td>
                      <td>{letra.proveedor_nombre || '-'}</td>
                      <td>{formatDate(letra.fecha_emision)}</td>
                      <td>{formatDate(letra.fecha_vencimiento)}</td>
                      <td className="text-right">{formatCurrency(letra.monto)}</td>
                      <td className="text-right" style={{ 
                        color: letra.saldo_pendiente > 0 ? '#EF4444' : '#22C55E',
                        fontWeight: 500
                      }}>
                        {formatCurrency(letra.saldo_pendiente)}
                      </td>
                      <td>
                        <span className={estadoBadge(letra.estado)}>
                          {letra.estado}
                        </span>
                      </td>
                      <td className="text-center">
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {(letra.estado === 'pendiente' || letra.estado === 'parcial') && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => openPagarModal(letra)}
                              title="Pagar"
                            >
                              <DollarSign size={14} />
                              Pagar
                            </button>
                          )}
                          <button 
                            className="btn btn-outline btn-sm btn-icon"
                            onClick={() => handleDelete(letra.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Generar Letras */}
      {showGenerarModal && (
        <div className="modal-overlay" onClick={() => setShowGenerarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Generar Letras</h2>
              <button className="modal-close" onClick={() => setShowGenerarModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleGenerarLetras}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Factura</label>
                  <select
                    className="form-input form-select"
                    value={generarForm.factura_id}
                    onChange={(e) => setGenerarForm(prev => ({ ...prev, factura_id: e.target.value }))}
                    required
                  >
                    <option value="">Seleccionar factura...</option>
                    {facturasPendientes.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.numero} - {f.proveedor_nombre || f.beneficiario_nombre} - {formatCurrency(f.total)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label required">Cantidad de Letras</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="12"
                      value={generarForm.cantidad_letras}
                      onChange={(e) => setGenerarForm(prev => ({ ...prev, cantidad_letras: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Monto por Letra (opcional)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="Se calculará automáticamente"
                      value={generarForm.monto_por_letra}
                      onChange={(e) => setGenerarForm(prev => ({ ...prev, monto_por_letra: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Días entre letras</label>
                  <input
                    type="number"
                    className="form-input"
                    value={generarForm.dias_entre_letras}
                    onChange={(e) => setGenerarForm(prev => ({ ...prev, dias_entre_letras: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowGenerarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Generando...' : 'Generar Letras'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagar Letra */}
      {showPagarModal && letraAPagar && (
        <div className="modal-overlay" onClick={() => setShowPagarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Pagar Letra {letraAPagar.numero}</h2>
              <button className="modal-close" onClick={() => setShowPagarModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePagarLetra}>
              <div className="modal-body">
                <div className="kpi-card" style={{ marginBottom: '1rem' }}>
                  <div className="kpi-label">Saldo Pendiente</div>
                  <div className="kpi-value">{formatCurrency(letraAPagar.saldo_pendiente)}</div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Cuenta</label>
                  <select
                    className="form-input form-select"
                    value={pagarForm.cuenta_financiera_id}
                    onChange={(e) => setPagarForm(prev => ({ ...prev, cuenta_financiera_id: e.target.value }))}
                    required
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {cuentasFinancieras.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} - {formatCurrency(c.saldo_actual)}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label required">Monto a Pagar</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={letraAPagar.saldo_pendiente}
                      readOnly
                      style={{ background: '#f1f5f9', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
                      data-testid="letra-monto-pago"
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                      Las letras se pagan por el monto exacto
                    </span>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Medio de Pago</label>
                    <select
                      className="form-input form-select"
                      value={pagarForm.medio_pago}
                      onChange={(e) => setPagarForm(prev => ({ ...prev, medio_pago: e.target.value }))}
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Referencia</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Número de operación..."
                    value={pagarForm.referencia}
                    onChange={(e) => setPagarForm(prev => ({ ...prev, referencia: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPagarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <CreditCard size={18} />
                  {submitting ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Letras;
