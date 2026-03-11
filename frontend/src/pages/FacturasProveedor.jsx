import React, { useState, useEffect } from 'react';
import { 
  getFacturasProveedor, createFacturaProveedor, updateFacturaProveedor, deleteFacturaProveedor,
  getProveedores, getMonedas, getCategorias, getLineasNegocio, getCentrosCosto,
  getInventario, getModelosCortes, createTercero, createPago, getCuentasFinancieras, generarLetras,
  getPagosDeFactura, getLetrasDeFactura, deshacerCanjeLetras, deletePago, updatePago,
  exportCompraAPP, generarAsiento
} from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Plus, Trash2, Search, X, FileText, ChevronDown, ChevronUp, Copy, Edit2, Eye, DollarSign, FileSpreadsheet, Undo2, History, Download, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import SearchableSelect from '../components/SearchableSelect';
import TableSearchSelect from '../components/TableSearchSelect';

const formatCurrency = (value, symbol = 'S/') => {
  const s = symbol || 'S/';
  return `${s} ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PE');
};

const estadoBadge = (estado) => {
  const badges = {
    pendiente: 'badge badge-warning',
    parcial: 'badge badge-info',
    pagado: 'badge badge-success',
    canjeado: 'badge badge-canjeado',
    anulada: 'badge badge-error'
  };
  return badges[estado] || 'badge badge-neutral';
};

export const FacturasProveedor = () => {
  const { empresaActual } = useEmpresa();

  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [lineasNegocio, setLineasNegocio] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [showDetallesArticulo, setShowDetallesArticulo] = useState(true);
  const [inventario, setInventario] = useState([]);
  const [modelosCortes, setModelosCortes] = useState([]);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState('');
  const [cuentasFinancieras, setCuentasFinancieras] = useState([]);
  
  // Modal de Pago
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaParaPago, setFacturaParaPago] = useState(null);
  const [pagoData, setPagoData] = useState({
    cuenta_id: '',
    medio_pago: 'transferencia',
    monto: 0,
    referencia: ''
  });
  
  // Modal de Letras
  const [showLetrasModal, setShowLetrasModal] = useState(false);
  const [facturaParaLetras, setFacturaParaLetras] = useState(null);
  const [letrasConfig, setLetrasConfig] = useState({
    prefijo: 'LT',
    cantidad: 3,
    intervalo_dias: 30,
    fecha_giro: new Date().toISOString().split('T')[0],
    banco_id: ''
  });
  const [letrasPreview, setLetrasPreview] = useState([]);
  
  // Modal de Edición/Ver
  const [editingFactura, setEditingFactura] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  
  // Modal de Ver Pagos
  const [showPagosModal, setShowPagosModal] = useState(false);
  const [facturaParaVerPagos, setFacturaParaVerPagos] = useState(null);
  const [pagosDeFactura, setPagosDeFactura] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  
  // Modal de Ver Letras
  const [showVerLetrasModal, setShowVerLetrasModal] = useState(false);
  const [facturaParaVerLetras, setFacturaParaVerLetras] = useState(null);
  const [letrasDeFactura, setLetrasDeFactura] = useState([]);
  const [loadingLetras, setLoadingLetras] = useState(false);
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroNumero, setFiltroNumero] = useState('');
  const [filtroProveedorId, setFiltroProveedorId] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [exportDesde, setExportDesde] = useState('');
  const [exportHasta, setExportHasta] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    proveedor_id: '',
    beneficiario_nombre: '',
    moneda_id: '',
    tipo_cambio: '',
    fecha_factura: new Date().toISOString().split('T')[0],
    fecha_contable: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    terminos_dias: 30,
    tipo_documento: 'factura',
    numero: '',
    impuestos_incluidos: true,
    tipo_comprobante_sunat: '01',
    base_gravada: 0,
    igv_sunat: 0,
    base_no_gravada: 0,
    isc: 0,
    notas: '',
    lineas: [{ categoria_id: '', descripcion: '', linea_negocio_id: '', centro_costo_id: '', importe: 0, igv_aplica: true }],
    articulos: []
  });
  const [fechaContableManual, setFechaContableManual] = useState(false);

  useEffect(() => {
    loadData();
  }, [filtroEstado, filtroProveedorId, filtroFecha, empresaActual]);

  // Calculate fecha_vencimiento when fecha_factura or terminos change
  // Also sync fecha_contable if not manually edited
  useEffect(() => {
    if (formData.fecha_factura && formData.terminos_dias) {
      const fecha = new Date(formData.fecha_factura);
      fecha.setDate(fecha.getDate() + parseInt(formData.terminos_dias));
      const updates = { fecha_vencimiento: fecha.toISOString().split('T')[0] };
      if (!fechaContableManual) {
        updates.fecha_contable = formData.fecha_factura;
      }
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [formData.fecha_factura, formData.terminos_dias]);

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
      
      // Set default moneda
      const pen = monedasRes.data.find(m => m.codigo === 'PEN');
      if (pen && !formData.moneda_id) {
        setFormData(prev => ({ ...prev, moneda_id: pen.id }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLinea = () => {
    setFormData(prev => ({
      ...prev,
      lineas: [...prev.lineas, { categoria_id: '', descripcion: '', linea_negocio_id: '', centro_costo_id: '', importe: 0, igv_aplica: true }]
    }));
  };

  const handleRemoveLinea = (index) => {
    if (formData.lineas.length > 1) {
      setFormData(prev => ({
        ...prev,
        lineas: prev.lineas.filter((_, i) => i !== index)
      }));
    }
  };

  const handleDuplicateLinea = (index) => {
    setFormData(prev => ({
      ...prev,
      lineas: [...prev.lineas.slice(0, index + 1), { ...prev.lineas[index] }, ...prev.lineas.slice(index + 1)]
    }));
  };

  const handleLineaChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineas: prev.lineas.map((linea, i) => 
        i === index ? { ...linea, [field]: value } : linea
      )
    }));
  };

  // Artículos handlers
  const handleAddArticulo = () => {
    setFormData(prev => ({
      ...prev,
      articulos: [...prev.articulos, { articulo_id: '', modelo_corte_id: '', unidad: '', cantidad: 1, precio: 0, linea_negocio_id: '', igv_aplica: true }]
    }));
  };

  const handleRemoveArticulo = (index) => {
    setFormData(prev => ({
      ...prev,
      articulos: prev.articulos.filter((_, i) => i !== index)
    }));
  };

  const handleDuplicateArticulo = (index) => {
    setFormData(prev => ({
      ...prev,
      articulos: [...prev.articulos.slice(0, index + 1), { ...prev.articulos[index] }, ...prev.articulos.slice(index + 1)]
    }));
  };

  const handleArticuloChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      articulos: prev.articulos.map((art, i) => {
        if (i !== index) return art;
        
        const updated = { ...art, [field]: value };
        
        // Auto-fill unidad and precio when selecting articulo
        if (field === 'articulo_id' && value) {
          const selectedArticulo = inventario.find(inv => inv.id === value);
          if (selectedArticulo) {
            updated.unidad = selectedArticulo.unidad_medida || 'UND';
            updated.precio = parseFloat(selectedArticulo.precio_ref) || parseFloat(selectedArticulo.costo_compra) || 0;
          }
        }
        
        return updated;
      })
    }));
  };

  const calcularImporteArticulo = (articulo) => {
    const cantidad = parseFloat(articulo.cantidad) || 0;
    const precio = parseFloat(articulo.precio) || 0;
    return cantidad * precio;
  };

  const calcularTotales = () => {
    let subtotal = 0;
    let igv = 0;
    let base_gravada = 0;
    let igv_sunat = 0;
    let base_no_gravada = 0;
    
    // Sumar líneas de categoría
    formData.lineas.forEach(linea => {
      const importe = parseFloat(linea.importe) || 0;
      if (linea.igv_aplica) {
        if (formData.impuestos_incluidos) {
          const base = importe / 1.18;
          const lineaIgv = importe - base;
          subtotal += base;
          igv += lineaIgv;
          base_gravada += base;
          igv_sunat += lineaIgv;
        } else {
          subtotal += importe;
          igv += importe * 0.18;
          base_gravada += importe;
          igv_sunat += importe * 0.18;
        }
      } else {
        if (formData.impuestos_incluidos) {
          subtotal += importe;
        } else {
          subtotal += importe;
        }
        base_no_gravada += importe;
      }
    });
    
    // Sumar artículos
    formData.articulos.forEach(art => {
      const importe = calcularImporteArticulo(art);
      if (art.igv_aplica) {
        if (formData.impuestos_incluidos) {
          const base = importe / 1.18;
          const artIgv = importe - base;
          subtotal += base;
          igv += artIgv;
          base_gravada += base;
          igv_sunat += artIgv;
        } else {
          subtotal += importe;
          igv += importe * 0.18;
          base_gravada += importe;
          igv_sunat += importe * 0.18;
        }
      } else {
        subtotal += importe;
        base_no_gravada += importe;
      }
    });
    
    return {
      subtotal,
      igv,
      total: subtotal + igv,
      base_gravada: parseFloat(base_gravada.toFixed(2)),
      igv_sunat: parseFloat(igv_sunat.toFixed(2)),
      base_no_gravada: parseFloat(base_no_gravada.toFixed(2))
    };
  };

  // Crear nuevo proveedor
  const handleCreateProveedor = async (nombre) => {
    if (!nombre || nombre.trim() === '') {
      setShowProveedorModal(true);
      setNuevoProveedorNombre('');
      return;
    }
    
    try {
      const response = await createTercero({
        nombre: nombre.trim(),
        es_proveedor: true,
        tipo_documento: 'RUC',
        numero_documento: '',
        terminos_pago_dias: 30
      });
      
      // Add new proveedor to list and select it
      setProveedores(prev => [...prev, response.data]);
      setFormData(prev => ({ 
        ...prev, 
        proveedor_id: response.data.id,
        beneficiario_nombre: ''
      }));
      toast.success(`Proveedor "${nombre}" creado exitosamente`);
    } catch (error) {
      console.error('Error creating proveedor:', error);
      toast.error('Error al crear proveedor');
    }
  };

  const handleSaveNuevoProveedor = async () => {
    if (!nuevoProveedorNombre.trim()) {
      toast.error('Ingrese el nombre del proveedor');
      return;
    }
    await handleCreateProveedor(nuevoProveedorNombre);
    setShowProveedorModal(false);
  };

  const handleSubmit = async (e, createNew = false) => {
    e.preventDefault();
    if (submitting) return;
    
    try {
      const tots = calcularTotales();
      const dataToSend = {
        ...formData,
        proveedor_id: formData.proveedor_id ? parseInt(formData.proveedor_id) : null,
        moneda_id: formData.moneda_id ? parseInt(formData.moneda_id) : null,
        terminos_dias: parseInt(formData.terminos_dias) || 0,
        tipo_cambio: formData.tipo_cambio ? parseFloat(formData.tipo_cambio) : null,
        base_gravada: tots.base_gravada,
        igv_sunat: tots.igv_sunat,
        base_no_gravada: tots.base_no_gravada,
        isc: parseFloat(formData.isc) || 0,
        // Ensure dates are valid or null
        fecha_factura: formData.fecha_factura || null,
        fecha_contable: formData.fecha_contable || formData.fecha_factura || null,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        lineas: [
          ...formData.lineas.map(l => ({
            ...l,
            categoria_id: l.categoria_id ? parseInt(l.categoria_id) : null,
            linea_negocio_id: l.linea_negocio_id ? parseInt(l.linea_negocio_id) : null,
            centro_costo_id: l.centro_costo_id ? parseInt(l.centro_costo_id) : null,
            importe: parseFloat(l.importe) || 0
          })),
          ...formData.articulos.map(art => ({
            articulo_id: art.articulo_id ? parseInt(art.articulo_id) : null,
            modelo_corte_id: art.modelo_corte_id ? parseInt(art.modelo_corte_id) : null,
            linea_negocio_id: art.linea_negocio_id ? parseInt(art.linea_negocio_id) : null,
            descripcion: art.unidad || null,
            cantidad: parseFloat(art.cantidad) || 0,
            precio_unitario: parseFloat(art.precio) || 0,
            importe: (parseFloat(art.cantidad) || 0) * (parseFloat(art.precio) || 0),
            igv_aplica: art.igv_aplica !== false
          }))
        ]
      };
      // Remove articulos from payload (already merged into lineas)
      delete dataToSend.articulos;
      
      // Validate required fields
      if (!dataToSend.fecha_factura) {
        toast.error('La fecha de factura es requerida');
        return;
      }
      
      setSubmitting(true);
      
      if (editingFactura) {
        // Update existing factura
        await updateFacturaProveedor(editingFactura.id, dataToSend);
        toast.success('Factura actualizada exitosamente');
        setEditingFactura(null);
      } else {
        // Create new factura
        await createFacturaProveedor(dataToSend);
        toast.success('Factura creada exitosamente');
      }
      
      if (createNew) {
        resetForm();
      } else {
        setShowModal(false);
        resetForm();
      }
      loadData();
    } catch (error) {
      console.error('Error saving factura:', error);
      // Handle Pydantic validation errors (array of objects)
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Extract first error message
        const firstError = detail[0];
        const errorMsg = firstError?.msg || firstError?.message || 'Error de validación';
        toast.error(errorMsg);
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Error al guardar factura');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta factura?')) return;
    
    try {
      await deleteFacturaProveedor(id);
      toast.success('Factura eliminada');
      loadData();
    } catch (error) {
      console.error('Error deleting factura:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar factura');
    }
  };

  // Abrir modal de pago
  const handleOpenPago = async (factura) => {
    setFacturaParaPago(factura);
    
    // Calculate payment number based on existing payments
    let referencia = factura.numero || '';
    try {
      const pagosRes = await getPagosDeFactura(factura.id);
      const numPagos = pagosRes.data?.length || 0;
      if (numPagos > 0) {
        referencia = `${factura.numero} - PAGO ${numPagos + 1}`;
      }
    } catch (e) {
      // If can't get payments, just use document number
    }
    
    setPagoData({
      cuenta_id: cuentasFinancieras[0]?.id || '',
      medio_pago: 'transferencia',
      monto: parseFloat(factura.saldo_pendiente) || 0,
      referencia: referencia
    });
    setShowPagoModal(true);
  };

  // Registrar pago
  const handleRegistrarPago = async () => {
    if (registrandoPago) return;
    if (!pagoData.cuenta_id) {
      toast.error('Seleccione una cuenta');
      return;
    }
    if (pagoData.monto <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    
    const saldoPendiente = parseFloat(facturaParaPago.saldo_pendiente) || 0;
    if (parseFloat(pagoData.monto) > saldoPendiente) {
      toast.error(`El monto no puede ser mayor al saldo pendiente (${formatCurrency(saldoPendiente)})`);
      return;
    }
    
    setRegistrandoPago(true);
    try {
      await createPago({
        tipo: 'egreso',
        fecha: new Date().toISOString().split('T')[0],
        cuenta_financiera_id: parseInt(pagoData.cuenta_id),
        moneda_id: facturaParaPago.moneda_id || 1,
        monto_total: parseFloat(pagoData.monto),
        referencia: pagoData.referencia,
        detalles: [{
          cuenta_financiera_id: parseInt(pagoData.cuenta_id),
          medio_pago: pagoData.medio_pago,
          monto: parseFloat(pagoData.monto),
          referencia: pagoData.referencia
        }],
        aplicaciones: [{
          tipo_documento: 'factura',
          documento_id: facturaParaPago.id,
          monto_aplicado: parseFloat(pagoData.monto)
        }]
      });
      
      toast.success('Pago registrado exitosamente');
      setShowPagoModal(false);
      loadData();
    } catch (error) {
      console.error('Error registrando pago:', error);
      toast.error(error.response?.data?.detail || 'Error al registrar pago');
    } finally {
      setRegistrandoPago(false);
    }
  };

  // Abrir modal de letras
  const handleOpenLetras = (factura) => {
    setFacturaParaLetras(factura);
    setLetrasConfig({
      prefijo: 'LT',
      cantidad: 3,
      intervalo_dias: 30,
      fecha_giro: new Date().toISOString().split('T')[0],
      banco_id: cuentasFinancieras.find(c => c.tipo === 'banco')?.id || cuentasFinancieras[0]?.id || ''
    });
    // Generar preview inicial
    generateLetrasPreview(factura, 3, 30, new Date().toISOString().split('T')[0]);
    setShowLetrasModal(true);
  };

  // Generar preview de letras
  const generateLetrasPreview = (factura, cantidad, intervalo, fechaGiro) => {
    const saldo = parseFloat(factura?.saldo_pendiente || 0);
    const montoLetra = saldo / cantidad;
    const letras = [];
    
    for (let i = 0; i < cantidad; i++) {
      const fechaVenc = new Date(fechaGiro);
      fechaVenc.setDate(fechaVenc.getDate() + (intervalo * (i + 1)));
      
      letras.push({
        numero: i + 1,
        fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
        monto: montoLetra
      });
    }
    
    setLetrasPreview(letras);
  };

  // Actualizar preview cuando cambian los parámetros
  const handleLetrasConfigChange = (field, value) => {
    const newConfig = { ...letrasConfig, [field]: value };
    setLetrasConfig(newConfig);
    
    if (facturaParaLetras) {
      generateLetrasPreview(
        facturaParaLetras,
        field === 'cantidad' ? parseInt(value) : parseInt(newConfig.cantidad),
        field === 'intervalo_dias' ? parseInt(value) : parseInt(newConfig.intervalo_dias),
        field === 'fecha_giro' ? value : newConfig.fecha_giro
      );
    }
  };

  // Actualizar una letra individual en el preview
  const handleLetraPreviewChange = (index, field, value) => {
    setLetrasPreview(prev => prev.map((letra, i) => 
      i === index ? { ...letra, [field]: field === 'monto' ? parseFloat(value) || 0 : value } : letra
    ));
  };

  // Crear letras
  const handleCrearLetras = async () => {
    // Validate total matches factura
    const totalLetras = letrasPreview.reduce((sum, l) => sum + l.monto, 0);
    const totalFactura = parseFloat(facturaParaLetras.total) || 0;
    
    if (Math.abs(totalLetras - totalFactura) > 0.01) {
      toast.error(`El total de las letras (${formatCurrency(totalLetras)}) debe ser igual al total de la factura (${formatCurrency(totalFactura)})`);
      return;
    }
    
    try {
      // Send custom letras to API
      await generarLetras({
        factura_id: facturaParaLetras.id,
        cantidad_letras: letrasPreview.length,
        dias_entre_letras: parseInt(letrasConfig.intervalo_dias),
        letras_personalizadas: letrasPreview.map(l => ({
          fecha_vencimiento: l.fecha_vencimiento,
          monto: l.monto
        }))
      });
      
      toast.success(`${letrasPreview.length} letras creadas exitosamente`);
      setShowLetrasModal(false);
      loadData();
    } catch (error) {
      console.error('Error creando letras:', error);
      toast.error(error.response?.data?.detail || 'Error al crear letras');
    }
  };

  // Editar factura
  const handleEdit = (factura) => {
    // Only allow editing if factura is in 'pendiente' state
    if (factura.estado !== 'pendiente') {
      toast.error('Solo se pueden editar facturas en estado pendiente');
      return;
    }
    
    // Set the editing factura
    setEditingFactura(factura);
    
    // Load the factura data into the form
    setFormData({
      proveedor_id: factura.proveedor_id || '',
      beneficiario_nombre: factura.beneficiario_nombre || '',
      moneda_id: factura.moneda_id || '',
      tipo_cambio: factura.tipo_cambio || '',
      fecha_factura: factura.fecha_factura ? factura.fecha_factura.split('T')[0] : new Date().toISOString().split('T')[0],
      fecha_contable: factura.fecha_contable ? factura.fecha_contable.split('T')[0] : (factura.fecha_factura ? factura.fecha_factura.split('T')[0] : new Date().toISOString().split('T')[0]),
      fecha_vencimiento: factura.fecha_vencimiento ? factura.fecha_vencimiento.split('T')[0] : '',
      terminos_dias: factura.terminos_dias || 30,
      tipo_documento: factura.tipo_documento || 'factura',
      numero: factura.numero || '',
      impuestos_incluidos: factura.impuestos_incluidos !== false,
      tipo_comprobante_sunat: factura.tipo_comprobante_sunat || '',
      base_gravada: factura.base_gravada || 0,
      igv_sunat: factura.igv_sunat || 0,
      base_no_gravada: factura.base_no_gravada || 0,
      isc: factura.isc || 0,
      notas: factura.notas || '',
      lineas: (() => {
        const catLines = (factura.lineas || []).filter(l => !l.articulo_id);
        return catLines.length > 0
          ? catLines.map(l => ({
              categoria_id: l.categoria_id || '',
              descripcion: l.descripcion || '',
              linea_negocio_id: l.linea_negocio_id || '',
              centro_costo_id: l.centro_costo_id || '',
              importe: l.importe || 0,
              igv_aplica: l.igv_aplica !== false
            }))
          : [{ categoria_id: '', descripcion: '', linea_negocio_id: '', centro_costo_id: '', importe: 0, igv_aplica: true }];
      })(),
      articulos: (() => {
        const artLines = (factura.lineas || []).filter(l => l.articulo_id);
        return artLines.map(a => ({
          articulo_id: a.articulo_id || '',
          modelo_corte_id: a.modelo_corte_id || '',
          unidad: a.descripcion || '',
          cantidad: a.cantidad || 1,
          precio: a.precio_unitario || 0,
          linea_negocio_id: a.linea_negocio_id || '',
          igv_aplica: a.igv_aplica !== false
        }));
      })()
    });
    
    setShowModal(true);
  };

  // Ver factura - ahora abre el modal de pagos o letras según el estado
  const handleView = (factura) => {
    if (factura.estado === 'canjeado') {
      handleVerLetras(factura);
    } else if (factura.estado === 'pagado' || factura.estado === 'parcial') {
      handleVerPagos(factura);
    } else {
      toast.info(`Factura ${factura.numero} - Total: ${formatCurrency(factura.total)}`);
    }
  };

  // Ver pagos de una factura
  const handleVerPagos = async (factura) => {
    setFacturaParaVerPagos(factura);
    setLoadingPagos(true);
    setShowPagosModal(true);
    
    try {
      const response = await getPagosDeFactura(factura.id);
      setPagosDeFactura(response.data);
    } catch (error) {
      console.error('Error loading pagos:', error);
      toast.error('Error al cargar pagos');
    } finally {
      setLoadingPagos(false);
    }
  };

  // Ver letras de una factura canjeada
  const handleVerLetras = async (factura) => {
    setFacturaParaVerLetras(factura);
    setLoadingLetras(true);
    setShowVerLetrasModal(true);
    
    try {
      const response = await getLetrasDeFactura(factura.id);
      setLetrasDeFactura(response.data);
    } catch (error) {
      console.error('Error loading letras:', error);
      toast.error('Error al cargar letras');
    } finally {
      setLoadingLetras(false);
    }
  };

  // Anular un pago
  const handleAnularPago = async (pagoId) => {
    if (!window.confirm('¿Está seguro de anular este pago? Se revertirá el saldo de la factura.')) return;
    
    try {
      await deletePago(pagoId);
      toast.success('Pago anulado exitosamente');
      
      // Reload pagos
      if (facturaParaVerPagos) {
        const response = await getPagosDeFactura(facturaParaVerPagos.id);
        setPagosDeFactura(response.data);
        
        // If no more pagos, close modal and reload
        if (response.data.length === 0) {
          setShowPagosModal(false);
        }
      }
      loadData();
    } catch (error) {
      console.error('Error anulando pago:', error);
      toast.error(error.response?.data?.detail || 'Error al anular pago');
    }
  };

  // Deshacer canje de letras
  const handleDeshacerCanje = async () => {
    if (!window.confirm('¿Está seguro de deshacer el canje? Se eliminarán todas las letras y la factura volverá a estado pendiente.')) return;
    
    try {
      await deshacerCanjeLetras(facturaParaVerLetras.id);
      toast.success('Canje deshecho exitosamente');
      setShowVerLetrasModal(false);
      loadData();
    } catch (error) {
      console.error('Error deshaciendo canje:', error);
      toast.error(error.response?.data?.detail || 'Error al deshacer canje');
    }
  };

  // Descargar PDF de factura
  const handleDownloadPDF = (factura) => {
    const proveedor = proveedores.find(p => p.id === factura.proveedor_id);
    const moneda = monedas.find(m => m.id === factura.moneda_id);
    
    const pdfContent = `
      <html>
      <head>
        <title>Factura-${factura.numero}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1B4D3E; }
          .doc-title { font-size: 1.5rem; font-weight: 700; color: #1B4D3E; }
          .doc-number { font-family: 'JetBrains Mono', monospace; font-size: 1.125rem; font-weight: 600; margin-top: 4px; }
          .doc-date { font-size: 0.875rem; color: #64748b; margin-top: 4px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .info-item label { font-size: 0.75rem; color: #64748b; display: block; }
          .info-item p { font-size: 0.9375rem; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
          .text-right { text-align: right; }
          .currency { font-family: 'JetBrains Mono', monospace; font-weight: 500; }
          .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
          .totals-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 24px; min-width: 280px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.9375rem; }
          .totals-row.total { border-top: 2px solid #1B4D3E; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 1.125rem; }
          .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
          .badge-pendiente { background: #fef3c7; color: #92400e; }
          .badge-parcial { background: #dbeafe; color: #1d4ed8; }
          .badge-pagado { background: #dcfce7; color: #15803d; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 0.75rem; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="doc-title">FACTURA DE PROVEEDOR</div>
            <div class="doc-number">${factura.tipo_documento?.toUpperCase() || 'FAC'} ${factura.numero}</div>
          </div>
          <div style="text-align: right;">
            <div class="doc-date">Emisión: ${formatDate(factura.fecha_factura)}</div>
            <div class="doc-date">Vencimiento: ${formatDate(factura.fecha_vencimiento)}</div>
            <span class="badge badge-${factura.estado}">${factura.estado?.toUpperCase()}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Datos del Proveedor</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Proveedor</label>
              <p>${factura.proveedor_nombre || factura.beneficiario_nombre || '-'}</p>
            </div>
            <div class="info-item">
              <label>Términos</label>
              <p>${factura.terminos_dias || 0} días</p>
            </div>
            <div class="info-item">
              <label>Moneda</label>
              <p>${factura.moneda_codigo || moneda?.codigo || 'PEN'}</p>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Detalle</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th class="text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${(factura.lineas || []).map((linea, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${linea.categoria_padre_nombre ? `${linea.categoria_padre_nombre} > ${linea.categoria_nombre}` : (linea.categoria_nombre || '-')}</td>
                <td>${linea.descripcion || '-'}</td>
                <td class="text-right currency">${formatCurrency(linea.importe, moneda?.simbolo || 'S/')}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="totals">
          <div class="totals-box">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span class="currency">${formatCurrency(factura.subtotal, moneda?.simbolo || 'S/')}</span>
            </div>
            <div class="totals-row">
              <span>IGV (18%):</span>
              <span class="currency">${formatCurrency(factura.igv, moneda?.simbolo || 'S/')}</span>
            </div>
            <div class="totals-row total">
              <span>TOTAL:</span>
              <span class="currency">${formatCurrency(factura.total, moneda?.simbolo || 'S/')}</span>
            </div>
            ${factura.saldo_pendiente !== factura.total ? `
            <div class="totals-row" style="color: #dc2626;">
              <span>Saldo Pendiente:</span>
              <span class="currency">${formatCurrency(factura.saldo_pendiente, moneda?.simbolo || 'S/')}</span>
            </div>` : ''}
          </div>
        </div>
        
        ${factura.notas ? `
        <div class="section" style="margin-top: 24px;">
          <div class="section-title">Observaciones</div>
          <p style="font-size: 0.875rem; color: #64748b;">${factura.notas}</p>
        </div>` : ''}
        
        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString('es-PE')} | Finanzas 4.0</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
  };

  const resetForm = () => {
    const pen = monedas.find(m => m.codigo === 'PEN');
    const hoy = new Date().toISOString().split('T')[0];
    setFormData({
      proveedor_id: '',
      beneficiario_nombre: '',
      moneda_id: pen?.id || '',
      tipo_cambio: '1',
      fecha_factura: hoy,
      fecha_contable: hoy,
      fecha_vencimiento: '',
      terminos_dias: 30,
      tipo_documento: 'factura',
      numero: '',
      impuestos_incluidos: true,
      tipo_comprobante_sunat: '01',
      base_gravada: 0,
      igv_sunat: 0,
      base_no_gravada: 0,
      isc: 0,
      notas: '',
      lineas: [{ categoria_id: '', descripcion: '', linea_negocio_id: '', centro_costo_id: '', importe: 0, igv_aplica: true }],
      articulos: []
    });
    setFechaContableManual(false);
  };

  const handleExportCompraAPP = async () => {
    setExporting(true);
    try {
      const params = {};
      if (exportDesde) params.desde = exportDesde;
      if (exportHasta) params.hasta = exportHasta;
      const response = await exportCompraAPP(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CompraAPP_${exportDesde || 'all'}_${exportHasta || 'all'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Archivo CompraAPP exportado exitosamente');
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      const detail = error.response?.data;
      if (detail && detail instanceof Blob) {
        const text = await detail.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed.detail?.errors) {
            toast.error(`${parsed.detail.message}:\n${parsed.detail.errors.slice(0, 3).join('\n')}`);
          } else {
            toast.error(parsed.detail?.message || parsed.detail || 'Error al exportar');
          }
        } catch { toast.error('Error al exportar CompraAPP'); }
      } else {
        toast.error(detail?.detail?.message || detail?.detail || 'Error al exportar CompraAPP');
      }
    } finally {
      setExporting(false);
    }
  };

  const totales = calcularTotales();
  const monedaActual = monedas.find(m => m.id === parseInt(formData.moneda_id));

  // Filter by numero in frontend (case-insensitive)
  const facturasFiltradas = filtroNumero 
    ? facturas.filter(f => f.numero?.toLowerCase().includes(filtroNumero.toLowerCase()))
    : facturas;

  // Calcular totales para la lista
  const totalPendiente = facturasFiltradas.filter(f => f.estado === 'pendiente' || f.estado === 'parcial')
    .reduce((sum, f) => sum + parseFloat(f.saldo_pendiente || 0), 0);

  return (
    <div data-testid="facturas-proveedor-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturas de Proveedor</h1>
          <p className="page-subtitle">
            Pendiente: {formatCurrency(totalPendiente)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-outline"
            onClick={() => setShowExportModal(true)}
            data-testid="export-compraapp-btn"
            title="Exportar CompraAPP"
          >
            <FileSpreadsheet size={18} />
            CompraAPP
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { resetForm(); setShowModal(true); }}
            data-testid="nueva-factura-btn"
          >
            <Plus size={18} />
            Nueva Factura
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Filtros */}
        <div className="filters-bar">
          <div className="filter-group">
            <label className="filter-label">Nº Doc</label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar..."
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              data-testid="filtro-numero"
              style={{ width: '140px' }}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Proveedor</label>
            <SearchableSelect
              options={[{ id: '', nombre: 'Todos' }, ...proveedores]}
              value={filtroProveedorId}
              onChange={(value) => setFiltroProveedorId(value || '')}
              placeholder="Todos"
              searchPlaceholder="Buscar proveedor..."
              displayKey="nombre"
              valueKey="id"
              data-testid="filtro-proveedor"
              style={{ width: '200px' }}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Fecha emisión</label>
            <input
              type="date"
              className="form-input"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              data-testid="filtro-fecha"
              style={{ width: '150px' }}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Estado</label>
            <select 
              className="form-input form-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              data-testid="filtro-estado"
              style={{ width: '140px' }}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
              <option value="canjeado">Canjeado</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          {(filtroNumero || filtroProveedorId || filtroFecha || filtroEstado) && (
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFiltroNumero('');
                setFiltroProveedorId('');
                setFiltroFecha('');
                setFiltroEstado('');
              }}
              title="Limpiar filtros"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
              </div>
            ) : facturasFiltradas.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-state-icon" />
                <div className="empty-state-title">{facturas.length === 0 ? 'No hay facturas registradas' : 'No se encontraron facturas con los filtros aplicados'}</div>
                <div className="empty-state-description">{facturas.length === 0 ? 'Crea tu primera factura de proveedor' : 'Intenta cambiar los criterios de búsqueda'}</div>
                {facturas.length === 0 && (
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    Crear primera factura
                  </button>
                )}
              </div>
            ) : (
              <table className="data-table" data-testid="facturas-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nro. Doc</th>
                    <th>Proveedor / Beneficiario</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Pagado</th>
                    <th>Estado</th>
                    <th className="text-right">Saldo CxP</th>
                    <th className="text-center" style={{ minWidth: '200px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturasFiltradas.map((factura) => {
                    const saldo = parseFloat(factura.saldo_pendiente) || 0;
                    const total = parseFloat(factura.total) || 0;
                    const pagado = total - saldo;
                    const puedeGenerarLetras = factura.estado === 'pendiente' && saldo > 0;
                    const puedePagar = (factura.estado === 'pendiente' || factura.estado === 'parcial') && saldo > 0;
                    const tienePagos = pagado > 0;
                    const estaCanjeado = factura.estado === 'canjeado';
                    
                    return (
                      <tr key={factura.id} data-testid={`factura-row-${factura.id}`}>
                        <td>{formatDate(factura.fecha_factura)}</td>
                        <td style={{ fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
                          {factura.numero}
                        </td>
                        <td>{factura.proveedor_nombre || factura.beneficiario_nombre || '-'}</td>
                        <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatCurrency(total, factura.moneda_simbolo)}
                        </td>
                        <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: pagado > 0 ? '#22C55E' : '#64748b' }}>
                          {pagado > 0 ? (
                            <button 
                              className="btn-link"
                              onClick={() => handleVerPagos(factura)}
                              style={{ color: '#22C55E', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}
                              title="Ver pagos"
                            >
                              {formatCurrency(pagado, factura.moneda_simbolo)}
                            </button>
                          ) : (
                            formatCurrency(pagado, factura.moneda_simbolo)
                          )}
                        </td>
                        <td>
                          <span 
                            className={estadoBadge(factura.estado)}
                            style={{ cursor: estaCanjeado ? 'pointer' : 'default' }}
                            onClick={() => estaCanjeado && handleVerLetras(factura)}
                            title={estaCanjeado ? 'Ver letras vinculadas' : ''}
                          >
                            {factura.estado}
                          </span>
                        </td>
                        <td className="text-right" style={{ 
                          fontFamily: "'JetBrains Mono', monospace",
                          color: saldo > 0 ? '#EF4444' : '#22C55E',
                          fontWeight: 500
                        }}>
                          {formatCurrency(saldo, factura.moneda_simbolo)}
                        </td>
                        <td>
                          <div className="actions-row">
                            {/* Pagar */}
                            {puedePagar && !estaCanjeado && (
                              <button 
                                className="action-btn action-success"
                                onClick={() => handleOpenPago(factura)}
                                title="Pagar"
                                data-testid={`pagar-factura-${factura.id}`}
                              >
                                <DollarSign size={15} />
                              </button>
                            )}
                            
                            {/* Generar Letras */}
                            {puedeGenerarLetras && (
                              <button 
                                className="action-btn action-info"
                                onClick={() => handleOpenLetras(factura)}
                                title="Canjear por Letras"
                                data-testid={`letras-factura-${factura.id}`}
                              >
                                <FileSpreadsheet size={15} />
                              </button>
                            )}
                            
                            {/* Ver Letras (canjeado) */}
                            {estaCanjeado && (
                              <button 
                                className="action-btn"
                                onClick={() => handleVerLetras(factura)}
                                title="Ver letras"
                                data-testid={`ver-letras-${factura.id}`}
                              >
                                <FileSpreadsheet size={15} />
                              </button>
                            )}
                            
                            {/* Ver Pagos */}
                            {tienePagos && !estaCanjeado && (
                              <button 
                                className="action-btn"
                                onClick={() => handleVerPagos(factura)}
                                title="Ver pagos"
                                data-testid={`ver-pagos-${factura.id}`}
                              >
                                <History size={15} />
                              </button>
                            )}
                            
                            {/* Ver */}
                            <button 
                              className="action-btn"
                              onClick={() => handleView(factura)}
                              title="Ver"
                              data-testid={`ver-factura-${factura.id}`}
                            >
                              <Eye size={15} />
                            </button>
                            
                            {/* PDF */}
                            <button 
                              className="action-btn"
                              onClick={() => handleDownloadPDF(factura)}
                              title="Descargar PDF"
                              data-testid={`pdf-factura-${factura.id}`}
                            >
                              <Download size={15} />
                            </button>
                            
                            {/* Editar */}
                            {factura.estado !== 'pagado' && factura.estado !== 'canjeado' && (
                              <button 
                                className="action-btn"
                                onClick={() => handleEdit(factura)}
                                title="Editar"
                                data-testid={`editar-factura-${factura.id}`}
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            
                            {/* Eliminar */}
                            {factura.estado === 'pendiente' && (
                              <button 
                                className="action-btn action-danger"
                                onClick={() => handleDelete(factura.id)}
                                title="Eliminar"
                                data-testid={`delete-factura-${factura.id}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                            {/* Generar Asiento */}
                            <button
                              className="action-btn"
                              onClick={async () => {
                                try {
                                  await generarAsiento({ origen_tipo: 'FPROV', origen_id: factura.id });
                                  toast.success('Asiento generado');
                                } catch (e) { toast.error(e.response?.data?.detail || 'Error generando asiento'); }
                              }}
                              title="Generar Asiento"
                              data-testid={`generar-asiento-${factura.id}`}
                            >
                              <BookOpen size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Factura - Estilo como la imagen */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingFactura(null); }}>
          <div className="factura-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="factura-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={24} color="#1B4D3E" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                  {editingFactura ? `Editar Factura ${editingFactura.numero}` : 'Factura de proveedor'}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    SALDO PENDIENTE
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(totales.total, monedaActual?.simbolo || 'S/.')}
                  </div>
                </div>
                <button className="modal-close" onClick={() => { setShowModal(false); setEditingFactura(null); }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="factura-modal-body">
                {/* Proveedor row */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label required">Proveedor</label>
                    <SearchableSelect
                      options={proveedores}
                      value={formData.proveedor_id}
                      onChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        proveedor_id: value,
                        beneficiario_nombre: value ? '' : prev.beneficiario_nombre
                      }))}
                      placeholder="Buscar proveedor..."
                      searchPlaceholder="Buscar por nombre..."
                      displayKey="nombre"
                      valueKey="id"
                      onCreateNew={handleCreateProveedor}
                      createNewLabel="Crear proveedor"
                      data-testid="proveedor-select"
                    />
                  </div>
                  
                  {/* Mostrar campo beneficiario solo si NO hay proveedor seleccionado */}
                  {!formData.proveedor_id && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">O escribir beneficiario</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nombre del beneficiario"
                        value={formData.beneficiario_nombre}
                        onChange={(e) => setFormData(prev => ({ ...prev, beneficiario_nombre: e.target.value }))}
                        data-testid="beneficiario-input"
                      />
                    </div>
                  )}
                </div>

                {/* Términos, Moneda, Fechas */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Términos</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: 30 días"
                      value={formData.terminos_dias}
                      onChange={(e) => setFormData(prev => ({ ...prev, terminos_dias: e.target.value }))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Moneda</label>
                    <select
                      className="form-input form-select"
                      value={formData.moneda_id}
                      onChange={(e) => {
                        const selMoneda = monedas.find(m => m.id === parseInt(e.target.value));
                        setFormData(prev => ({
                          ...prev,
                          moneda_id: e.target.value,
                          tipo_cambio: selMoneda?.codigo === 'PEN' ? '1' : prev.tipo_cambio || ''
                        }));
                      }}
                    >
                      <option value="">Moneda</option>
                      {monedas.map(m => (
                        <option key={m.id} value={m.id}>{m.codigo}</option>
                      ))}
                    </select>
                  </div>

                  {monedas.find(m => m.id === parseInt(formData.moneda_id))?.codigo === 'USD' && (
                    <div className="form-group">
                      <label className="form-label required">T.C.</label>
                      <input
                        type="number"
                        step="0.001"
                        className="form-input"
                        placeholder="Ej: 3.72"
                        value={formData.tipo_cambio}
                        onChange={(e) => setFormData(prev => ({ ...prev, tipo_cambio: e.target.value }))}
                        data-testid="tipo-cambio-input"
                        required
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label className="form-label required">Fecha de factura</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha_factura}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_factura: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha contable</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha_contable}
                      onChange={(e) => { setFechaContableManual(true); setFormData(prev => ({ ...prev, fecha_contable: e.target.value })); }}
                      data-testid="factura-fecha-contable"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Fecha de vencimiento</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha_vencimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Tipo y Número documento */}
                <div className="form-row">
                  <div className="form-group" style={{ maxWidth: '200px' }}>
                    <label className="form-label required">Tipo de documento</label>
                    <select
                      className="form-input form-select"
                      value={formData.tipo_documento}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_documento: e.target.value }))}
                    >
                      <option value="factura">Factura</option>
                      <option value="boleta">Boleta</option>
                      <option value="recibo">Recibo por Honorarios</option>
                      <option value="nota_credito">Nota de Crédito</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ maxWidth: '200px' }}>
                    <label className="form-label required">N.º de documento</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="NV001-00001"
                      value={formData.numero}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                    />
                  </div>
                </div>

                {/* SUNAT Doc Type and Tax Breakdown (auto-calculated) */}
                <div className="form-row" style={{ marginTop: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ maxWidth: '140px' }}>
                    <label className="form-label">Doc SUNAT</label>
                    <select
                      className="form-input form-select"
                      value={formData.tipo_comprobante_sunat}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_comprobante_sunat: e.target.value }))}
                      data-testid="factura-tipo-sunat"
                    >
                      <option value="">--</option>
                      <option value="01">01 - Factura</option>
                      <option value="03">03 - Boleta</option>
                      <option value="07">07 - Nota Crédito</option>
                      <option value="08">08 - Nota Débito</option>
                      <option value="14">14 - Serv. Público</option>
                      <option value="02">02 - Recibo Hon.</option>
                      <option value="12">12 - Ticket</option>
                      <option value="00">00 - Otros</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ maxWidth: '140px' }}>
                    <label className="form-label">Base Gravada</label>
                    <input
                      type="text"
                      className="form-input"
                      value={totales.base_gravada.toFixed(2)}
                      readOnly
                      style={{ background: '#f1f5f9' }}
                      data-testid="factura-base-gravada"
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: '130px' }}>
                    <label className="form-label">IGV</label>
                    <input
                      type="text"
                      className="form-input"
                      value={totales.igv_sunat.toFixed(2)}
                      readOnly
                      style={{ background: '#f1f5f9' }}
                      data-testid="factura-igv-sunat"
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: '140px' }}>
                    <label className="form-label">No Gravada</label>
                    <input
                      type="text"
                      className="form-input"
                      value={totales.base_no_gravada.toFixed(2)}
                      readOnly
                      style={{ background: '#f1f5f9' }}
                      data-testid="factura-base-no-gravada"
                    />
                  </div>
                  <div className="form-group" style={{ maxWidth: '120px' }}>
                    <label className="form-label">ISC</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={formData.isc}
                      onChange={(e) => setFormData(prev => ({ ...prev, isc: parseFloat(e.target.value) || 0 }))}
                      data-testid="factura-isc"
                    />
                  </div>
                </div>

                {/* Sección Detalles de la categoría */}
                <div className="factura-section">
                  <div className="factura-section-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ChevronUp size={18} />
                      <span style={{ fontWeight: 600 }}>Detalles de la categoría</span>
                      <span style={{ color: '#64748b', fontSize: '0.875rem' }}>({formData.lineas.length} línea{formData.lineas.length !== 1 ? 's' : ''})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Los importes son</span>
                      <select
                        className="form-input form-select"
                        style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem', fontSize: '0.875rem' }}
                        value={formData.impuestos_incluidos ? 'incluidos' : 'sin_igv'}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          impuestos_incluidos: e.target.value === 'incluidos' 
                        }))}
                      >
                        <option value="sin_igv">Sin IGV</option>
                        <option value="incluidos">Impuestos incluidos</option>
                      </select>
                    </div>
                  </div>

                  <div className="table-scroll-wrapper">
                    <table className="factura-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th style={{ minWidth: '160px' }}>CATEGORÍA</th>
                          <th style={{ minWidth: '180px' }}>DESCRIPCIÓN</th>
                          <th style={{ minWidth: '140px' }}>LÍNEA NEGOCIO</th>
                          <th style={{ width: '100px' }}>IMPORTE</th>
                          <th style={{ width: '80px' }}>IGV 18%</th>
                          <th style={{ width: '100px' }}>ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.lineas.map((linea, index) => (
                          <tr key={index}>
                            <td className="row-number">{index + 1}</td>
                            <td>
                              <TableSearchSelect
                                options={categorias}
                                value={linea.categoria_id}
                                onChange={(value) => handleLineaChange(index, 'categoria_id', value)}
                              placeholder="Categoría"
                              displayKey="nombre_completo"
                              valueKey="id"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Descripción"
                              value={linea.descripcion}
                              onChange={(e) => handleLineaChange(index, 'descripcion', e.target.value)}
                            />
                          </td>
                          <td>
                            <TableSearchSelect
                              options={lineasNegocio}
                              value={linea.linea_negocio_id}
                              onChange={(value) => handleLineaChange(index, 'linea_negocio_id', value)}
                              placeholder="Línea"
                              displayKey="nombre"
                              valueKey="id"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={linea.importe}
                              onChange={(e) => handleLineaChange(index, 'importe', e.target.value)}
                              style={{ textAlign: 'right' }}
                              data-testid={`linea-importe-${index}`}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={linea.igv_aplica}
                              onChange={(e) => handleLineaChange(index, 'igv_aplica', e.target.checked)}
                              style={{ width: '18px', height: '18px', accentColor: '#1B4D3E' }}
                            />
                          </td>
                          <td className="actions-cell">
                            <button
                              type="button"
                              className="btn-icon-small"
                              onClick={() => handleDuplicateLinea(index)}
                              title="Duplicar"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-small"
                              onClick={() => handleRemoveLinea(index)}
                              title="Eliminar"
                              disabled={formData.lineas.length === 1}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleAddLinea}
                    >
                      <Plus size={16} />
                      Agregar línea
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setFormData(prev => ({ ...prev, lineas: [{ categoria_id: '', descripcion: '', linea_negocio_id: '', centro_costo_id: '', importe: 0, igv_aplica: true }] }))}
                    >
                      Borrar todas las líneas
                    </button>
                  </div>
                </div>

                {/* Sección Detalles del artículo */}
                <div className="factura-section">
                  <button
                    type="button"
                    className="factura-section-header"
                    onClick={() => setShowDetallesArticulo(!showDetallesArticulo)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {showDetallesArticulo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      <span style={{ fontWeight: 600 }}>Detalles del artículo</span>
                      <span style={{ color: '#64748b', fontSize: '0.875rem' }}>({formData.articulos.length} artículo{formData.articulos.length !== 1 ? 's' : ''})</span>
                    </div>
                  </button>
                  
                  {showDetallesArticulo && (
                    <>
                      {formData.articulos.length > 0 ? (
                        <div className="table-scroll-wrapper">
                          <table className="factura-table">
                            <thead>
                              <tr>
                                <th style={{ width: '40px' }}>#</th>
                                <th style={{ minWidth: '180px' }}>ARTÍCULO</th>
                                <th style={{ minWidth: '180px' }}>MODELO / CORTE</th>
                                <th style={{ width: '70px' }}>UND</th>
                                <th style={{ width: '70px' }}>CANT.</th>
                                <th style={{ width: '90px' }}>PRECIO</th>
                                <th style={{ minWidth: '140px' }}>LÍNEA NEGOCIO</th>
                                <th style={{ width: '100px' }}>IMPORTE</th>
                                <th style={{ width: '60px' }}>IGV</th>
                                <th style={{ width: '80px' }}>ACCIONES</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.articulos.map((articulo, index) => (
                                <tr key={index}>
                                  <td className="row-number">{index + 1}</td>
                                  <td>
                                    <TableSearchSelect
                                      options={inventario}
                                      value={articulo.articulo_id}
                                      onChange={(value) => handleArticuloChange(index, 'articulo_id', value)}
                                      placeholder="Artículo"
                                      displayKey="nombre_completo"
                                      valueKey="id"
                                      renderOption={(inv) => `${inv.codigo ? inv.codigo + ' - ' : ''}${inv.nombre}`}
                                    />
                                  </td>
                                  <td>
                                    <TableSearchSelect
                                      options={modelosCortes}
                                      value={articulo.modelo_corte_id}
                                      onChange={(value) => handleArticuloChange(index, 'modelo_corte_id', value)}
                                      placeholder="Modelo / Corte"
                                      displayKey="display_name"
                                      valueKey="id"
                                      renderOption={(mc) => mc.display_name || `${mc.modelo_nombre || 'Sin modelo'} - Corte ${mc.n_corte}`}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      value={articulo.unidad || ''}
                                      readOnly
                                      disabled
                                      style={{ width: '100%', textAlign: 'center', background: '#f8fafc', color: '#64748b' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="1"
                                      min="1"
                                      placeholder="1"
                                      value={articulo.cantidad}
                                      onChange={(e) => handleArticuloChange(index, 'cantidad', e.target.value)}
                                      style={{ textAlign: 'center' }}
                                      data-testid={`articulo-cantidad-${index}`}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={articulo.precio}
                                      onChange={(e) => handleArticuloChange(index, 'precio', e.target.value)}
                                      style={{ textAlign: 'right' }}
                                      data-testid={`articulo-precio-${index}`}
                                    />
                                  </td>
                                  <td>
                                    <TableSearchSelect
                                      options={lineasNegocio}
                                      value={articulo.linea_negocio_id}
                                      onChange={(value) => handleArticuloChange(index, 'linea_negocio_id', value)}
                                      placeholder="Línea"
                                      displayKey="nombre"
                                      valueKey="id"
                                    />
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", padding: '0.625rem 0.75rem' }}>
                                    {calcularImporteArticulo(articulo).toFixed(2)}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={articulo.igv_aplica}
                                      onChange={(e) => handleArticuloChange(index, 'igv_aplica', e.target.checked)}
                                      style={{ width: '18px', height: '18px', accentColor: '#1B4D3E' }}
                                    />
                                  </td>
                                  <td className="actions-cell">
                                    <button
                                      type="button"
                                      className="btn-icon-small"
                                      onClick={() => handleDuplicateArticulo(index)}
                                      title="Duplicar"
                                    >
                                      <Copy size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-icon-small"
                                      onClick={() => handleRemoveArticulo(index)}
                                      title="Eliminar"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={handleAddArticulo}
                          data-testid="agregar-articulo-btn"
                        >
                          <Plus size={16} />
                          Agregar artículo
                        </button>
                        {formData.articulos.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setFormData(prev => ({ ...prev, articulos: [] }))}
                          >
                            Borrar todos
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Nota y Totales */}
                <div className="form-row" style={{ alignItems: 'flex-start', marginTop: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Nota</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="Añadir una nota..."
                      value={formData.notas}
                      onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  
                  <div className="factura-totales">
                    <div className="totales-row">
                      <span>Subtotal</span>
                      <span>{formatCurrency(totales.subtotal, monedaActual?.simbolo || 'S/.')}</span>
                    </div>
                    <div className="totales-row">
                      <span>IGV (18%)</span>
                      <span>{formatCurrency(totales.igv, monedaActual?.simbolo || 'S/.')}</span>
                    </div>
                    <div className="totales-row total">
                      <span>Total</span>
                      <span>{formatCurrency(totales.total, monedaActual?.simbolo || 'S/.')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="factura-modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn btn-secondary" data-testid="guardar-factura-btn" disabled={submitting}>
                    <FileText size={16} />
                    {submitting ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={(e) => handleSubmit(e, true)}
                    data-testid="guardar-crear-btn"
                    disabled={submitting}
                  >
                    {submitting ? 'Guardando...' : 'Guardar y crear nueva'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Proveedor */}
      {showProveedorModal && (
        <div className="modal-overlay" onClick={() => setShowProveedorModal(false)} style={{ zIndex: 1100 }}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', padding: '1.5rem' }}
          >
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 600 }}>Crear nuevo proveedor</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Nombre del proveedor</label>
              <input
                type="text"
                className="form-input"
                placeholder="Razón social o nombre"
                value={nuevoProveedorNombre}
                onChange={(e) => setNuevoProveedorNombre(e.target.value)}
                autoFocus
                data-testid="nuevo-proveedor-nombre"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowProveedorModal(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSaveNuevoProveedor}
                data-testid="guardar-proveedor-btn"
              >
                Crear proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pago Rápido */}
      {showPagoModal && facturaParaPago && (
        <div className="modal-overlay" onClick={() => setShowPagoModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Agregar Pago</h2>
              <button className="modal-close" onClick={() => setShowPagoModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Info del documento */}
              <div style={{ 
                background: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Documento:</span>
                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                    {facturaParaPago.numero}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Proveedor:</span>
                  <span style={{ fontWeight: 500 }}>
                    {facturaParaPago.proveedor_nombre || facturaParaPago.beneficiario_nombre}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Saldo Pendiente:</span>
                  <span style={{ fontWeight: 600, color: '#EF4444', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(facturaParaPago.saldo_pendiente)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Cuenta</label>
                <select
                  className="form-input form-select"
                  value={pagoData.cuenta_id}
                  onChange={(e) => setPagoData(prev => ({ ...prev, cuenta_id: e.target.value }))}
                  data-testid="pago-cuenta-select"
                >
                  <option value="">Seleccionar cuenta...</option>
                  {cuentasFinancieras.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Medio de Pago</label>
                <select
                  className="form-input form-select"
                  value={pagoData.medio_pago}
                  onChange={(e) => setPagoData(prev => ({ ...prev, medio_pago: e.target.value }))}
                  data-testid="pago-medio-select"
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={pagoData.monto}
                  onChange={(e) => setPagoData(prev => ({ ...prev, monto: e.target.value }))}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  data-testid="pago-monto-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Referencia / Nº Operación</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: OP-12345678"
                  value={pagoData.referencia}
                  onChange={(e) => setPagoData(prev => ({ ...prev, referencia: e.target.value }))}
                  data-testid="pago-referencia-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowPagoModal(false)}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-success"
                onClick={handleRegistrarPago}
                disabled={registrandoPago}
                data-testid="registrar-pago-btn"
              >
                <DollarSign size={16} />
                {registrandoPago ? 'Registrando...' : 'Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Canjear por Letras */}
      {showLetrasModal && facturaParaLetras && (
        <div className="modal-overlay" onClick={() => setShowLetrasModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Canjear por Letras</h2>
              <button className="modal-close" onClick={() => setShowLetrasModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Info del documento */}
              <div style={{ 
                background: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Documento:</span>
                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                    {facturaParaLetras.numero}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Proveedor:</span>
                  <span style={{ fontWeight: 500 }}>
                    {facturaParaLetras.proveedor_nombre || facturaParaLetras.beneficiario_nombre}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Saldo a canjear:</span>
                  <span style={{ fontWeight: 600, color: '#1B4D3E', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(facturaParaLetras.saldo_pendiente)}
                  </span>
                </div>
              </div>

              {/* Generación rápida */}
              <div style={{ 
                background: '#f0fdf4', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid #bbf7d0'
              }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>
                  Generación Rápida
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Prefijo</label>
                    <input
                      type="text"
                      className="form-input"
                      value={letrasConfig.prefijo}
                      onChange={(e) => handleLetrasConfigChange('prefijo', e.target.value)}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Cantidad Letras</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      className="form-input"
                      value={letrasConfig.cantidad}
                      onChange={(e) => handleLetrasConfigChange('cantidad', e.target.value)}
                      data-testid="letras-cantidad-input"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Intervalo (días)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={letrasConfig.intervalo_dias}
                      onChange={(e) => handleLetrasConfigChange('intervalo_dias', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Fecha de Giro</label>
                  <input
                    type="date"
                    className="form-input"
                    value={letrasConfig.fecha_giro}
                    onChange={(e) => handleLetrasConfigChange('fecha_giro', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Banco para pago</label>
                  <select
                    className="form-input form-select"
                    value={letrasConfig.banco_id}
                    onChange={(e) => setLetrasConfig(prev => ({ ...prev, banco_id: e.target.value }))}
                    data-testid="letras-banco-select"
                  >
                    <option value="">Seleccionar banco...</option>
                    {cuentasFinancieras.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview de letras - Editable */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Letras a crear ({letrasPreview.length})
                  <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#64748b' }}>
                    — Puedes editar montos y fechas antes de crear
                  </span>
                </h4>
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>N° Letra</th>
                      <th>Fecha Venc.</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {letrasPreview.map((letra, index) => (
                      <tr key={index}>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {letrasConfig.prefijo}-{facturaParaLetras.numero}-{String(letra.numero).padStart(2, '0')}
                        </td>
                        <td style={{ padding: 0 }}>
                          <input
                            type="date"
                            value={letra.fecha_vencimiento}
                            onChange={(e) => handleLetraPreviewChange(index, 'fecha_vencimiento', e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '0.5rem', 
                              border: 'none', 
                              background: 'transparent',
                              fontFamily: 'inherit',
                              fontSize: 'inherit'
                            }}
                            data-testid={`letra-fecha-${index}`}
                          />
                        </td>
                        <td style={{ padding: 0 }}>
                          <input
                            type="number"
                            step="0.01"
                            value={letra.monto}
                            onChange={(e) => handleLetraPreviewChange(index, 'monto', e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '0.5rem', 
                              border: 'none', 
                              background: 'transparent',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 'inherit',
                              textAlign: 'right'
                            }}
                            data-testid={`letra-monto-${index}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                      <td colSpan={2}>Total Letras</td>
                      <td className="text-right" style={{ 
                        fontFamily: "'JetBrains Mono', monospace", 
                        color: Math.abs(letrasPreview.reduce((sum, l) => sum + l.monto, 0) - parseFloat(facturaParaLetras.total || 0)) > 0.01 
                          ? '#EF4444' 
                          : '#1B4D3E' 
                      }}>
                        {formatCurrency(letrasPreview.reduce((sum, l) => sum + l.monto, 0))}
                        {Math.abs(letrasPreview.reduce((sum, l) => sum + l.monto, 0) - parseFloat(facturaParaLetras.total || 0)) > 0.01 && (
                          <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 400 }}>
                            Debe ser: {formatCurrency(facturaParaLetras.total)}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowLetrasModal(false)}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleCrearLetras}
                data-testid="crear-letras-btn"
              >
                <FileSpreadsheet size={16} />
                Crear {letrasPreview.length} Letras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Pagos */}
      {showPagosModal && facturaParaVerPagos && (
        <div className="modal-overlay" onClick={() => setShowPagosModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Historial de Pagos</h2>
              <button className="modal-close" onClick={() => setShowPagosModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Info del documento */}
              <div style={{ 
                background: '#f8fafc', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Documento:</span>
                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                    {facturaParaVerPagos.numero}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Proveedor:</span>
                  <span style={{ fontWeight: 500 }}>
                    {facturaParaVerPagos.proveedor_nombre || facturaParaVerPagos.beneficiario_nombre}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Total Factura:</span>
                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(facturaParaVerPagos.total)}
                  </span>
                </div>
              </div>

              {loadingPagos ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : pagosDeFactura.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div className="empty-state-title">No hay pagos registrados</div>
                </div>
              ) : (
                <table className="data-table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Nº Pago</th>
                      <th>Cuenta</th>
                      <th>Medio</th>
                      <th className="text-right">Monto</th>
                      <th>Referencia</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosDeFactura.map((pago) => (
                      <tr key={pago.id}>
                        <td>{formatDate(pago.fecha)}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                          {pago.numero}
                        </td>
                        <td>{pago.cuenta_nombre}</td>
                        <td style={{ textTransform: 'capitalize' }}>{pago.medio_pago || '-'}</td>
                        <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#22C55E', fontWeight: 500 }}>
                          {formatCurrency(pago.monto_aplicado, pago.moneda_simbolo)}
                        </td>
                        <td>{pago.referencia || '-'}</td>
                        <td className="text-center">
                          <button 
                            className="btn btn-outline btn-sm btn-icon btn-danger"
                            onClick={() => handleAnularPago(pago.id)}
                            title="Anular pago"
                            data-testid={`anular-pago-${pago.id}`}
                          >
                            <Undo2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                      <td colSpan={4}>Total Pagado</td>
                      <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#22C55E' }}>
                        {formatCurrency(pagosDeFactura.reduce((sum, p) => sum + parseFloat(p.monto_aplicado || 0), 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowPagosModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Letras Vinculadas */}
      {showVerLetrasModal && facturaParaVerLetras && (
        <div className="modal-overlay" onClick={() => setShowVerLetrasModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Letras Vinculadas</h2>
              <button className="modal-close" onClick={() => setShowVerLetrasModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Info del documento */}
              <div style={{ 
                background: '#fef3c7', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid #fcd34d'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#92400e' }}>Documento Canjeado:</span>
                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#92400e' }}>
                    {facturaParaVerLetras.numero}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#92400e' }}>Proveedor:</span>
                  <span style={{ fontWeight: 500 }}>
                    {facturaParaVerLetras.proveedor_nombre || facturaParaVerLetras.beneficiario_nombre}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#92400e' }}>Monto Canjeado:</span>
                  <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#92400e' }}>
                    {formatCurrency(facturaParaVerLetras.total)}
                  </span>
                </div>
              </div>

              {loadingLetras ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : letrasDeFactura.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div className="empty-state-title">No hay letras vinculadas</div>
                </div>
              ) : (
                <table className="data-table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>Nº Letra</th>
                      <th>Fecha Emisión</th>
                      <th>Fecha Venc.</th>
                      <th className="text-right">Monto</th>
                      <th className="text-right">Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {letrasDeFactura.map((letra) => (
                      <tr key={letra.id}>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                          {letra.numero}
                        </td>
                        <td>{formatDate(letra.fecha_emision)}</td>
                        <td>{formatDate(letra.fecha_vencimiento)}</td>
                        <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatCurrency(letra.monto, letra.moneda_simbolo)}
                        </td>
                        <td className="text-right" style={{ 
                          fontFamily: "'JetBrains Mono', monospace",
                          color: parseFloat(letra.saldo_pendiente) > 0 ? '#EF4444' : '#22C55E',
                          fontWeight: 500
                        }}>
                          {formatCurrency(parseFloat(letra.saldo_pendiente ?? letra.monto), letra.moneda_simbolo)}
                        </td>
                        <td>
                          <span className={estadoBadge(letra.estado)}>
                            {letra.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                      <td colSpan={3}>Total Letras</td>
                      <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatCurrency(letrasDeFactura.reduce((sum, l) => sum + parseFloat(l.monto || 0), 0))}
                      </td>
                      <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#EF4444' }}>
                        {formatCurrency(letrasDeFactura.reduce((sum, l) => sum + parseFloat(l.saldo_pendiente ?? l.monto ?? 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-outline btn-danger"
                onClick={handleDeshacerCanje}
                disabled={letrasDeFactura.some(l => parseFloat(l.saldo_pendiente) < parseFloat(l.monto))}
                title={letrasDeFactura.some(l => parseFloat(l.saldo_pendiente) < parseFloat(l.monto)) ? 'No se puede deshacer - hay letras con pagos' : 'Deshacer canje'}
              >
                <Undo2 size={16} />
                Deshacer Canje
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setShowVerLetrasModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export CompraAPP Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Exportar CompraAPP</h2>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Exporta facturas de proveedor y gastos en formato Excel para contabilidad SUNAT.
              </p>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Desde</label>
                  <input
                    type="date"
                    className="form-input"
                    value={exportDesde}
                    onChange={(e) => setExportDesde(e.target.value)}
                    data-testid="export-desde"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hasta</label>
                  <input
                    type="date"
                    className="form-input"
                    value={exportHasta}
                    onChange={(e) => setExportHasta(e.target.value)}
                    data-testid="export-hasta"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowExportModal(false)}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleExportCompraAPP}
                disabled={exporting}
                data-testid="export-confirm-btn"
              >
                <FileSpreadsheet size={16} />
                {exporting ? 'Exportando...' : 'Exportar Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturasProveedor;
