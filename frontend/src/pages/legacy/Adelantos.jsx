import React, { useState, useEffect } from 'react';
import { 
  getAdelantos, createAdelanto, updateAdelanto, deleteAdelanto, pagarAdelanto, 
  getEmpleados, getCuentasFinancieras, getPago
} from '../services/api';
import { Plus, FileText, Eye, X, DollarSign, Download, Calendar, Users, Wallet, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SearchableSelect from '../components/SearchableSelect';
import { useEmpresa } from '../context/EmpresaContext';

const formatCurrency = (value, symbol = 'S/') => {
  return `${symbol} ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-PE');
};

const getEstadoAdelanto = (adelanto) => {
  if (adelanto.descontado) return 'descontado';
  if (adelanto.pagado) return 'pagado';
  return 'pendiente';
};

const getEstadoBadge = (estado) => {
  const badges = {
    pendiente: 'badge badge-warning',
    pagado: 'badge badge-info',
    descontado: 'badge badge-success',
    anulado: 'badge badge-danger'
  };
  return badges[estado] || 'badge badge-warning';
};

export const Adelantos = () => {
  const { empresaActual } = useEmpresa();
  const [adelantos, setAdelantos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [showPagosListModal, setShowPagosListModal] = useState(false);
  const [selectedAdelanto, setSelectedAdelanto] = useState(null);
  const [pagoData, setPagoData] = useState({ cuenta_financiera_id: '', medio_pago: 'efectivo' });
  const [pagoDetails, setPagoDetails] = useState(null);
  const [loadingPago, setLoadingPago] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    empleado_id: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    motivo: '',
    pagar: true,
    cuenta_financiera_id: '',
    medio_pago: 'efectivo'
  });

  useEffect(() => {
    loadData();
  }, [empresaActual]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (empresaActual?.id) params.empresa_id = empresaActual.id;
      const [adelantosRes, empleadosRes, cuentasRes] = await Promise.all([
        getAdelantos(params),
        getEmpleados(),
        getCuentasFinancieras()
      ]);
      setAdelantos(adelantosRes.data);
      setEmpleados(empleadosRes.data);
      setCuentas(cuentasRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    
    if (!formData.empleado_id) {
      toast.error('Seleccione un empleado');
      return;
    }
    
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    
    if (!editingId && formData.pagar && !formData.cuenta_financiera_id) {
      toast.error('Seleccione una cuenta financiera para el pago');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        empleado_id: parseInt(formData.empleado_id),
        monto: parseFloat(formData.monto),
        fecha: formData.fecha,
        motivo: formData.motivo,
        pagar: editingId ? false : formData.pagar,
        cuenta_financiera_id: !editingId && formData.pagar && formData.cuenta_financiera_id ? parseInt(formData.cuenta_financiera_id) : null,
        medio_pago: formData.medio_pago
      };
      
      if (editingId) {
        await updateAdelanto(editingId, payload);
        toast.success('Adelanto actualizado exitosamente');
      } else {
        await createAdelanto(payload);
        toast.success('Adelanto registrado exitosamente');
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving adelanto:', error);
      toast.error(error.response?.data?.detail || 'Error al guardar adelanto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (adelanto) => {
    setEditingId(adelanto.id);
    setFormData({
      empleado_id: String(adelanto.empleado_id),
      monto: String(adelanto.monto),
      fecha: adelanto.fecha?.split('T')[0] || new Date().toISOString().split('T')[0],
      motivo: adelanto.motivo || '',
      pagar: false,
      cuenta_financiera_id: '',
      medio_pago: 'efectivo'
    });
    setShowModal(true);
  };

  const handleDelete = async (adelanto) => {
    if (adelanto.pagado) {
      toast.error('No se puede eliminar un adelanto pagado');
      return;
    }
    if (adelanto.descontado) {
      toast.error('No se puede eliminar un adelanto ya descontado');
      return;
    }
    
    if (!window.confirm(`¿Eliminar el adelanto de ${formatCurrency(adelanto.monto)} a ${adelanto.empleado_nombre}?`)) {
      return;
    }
    
    try {
      await deleteAdelanto(adelanto.id);
      toast.success('Adelanto eliminado');
      loadData();
    } catch (error) {
      console.error('Error deleting adelanto:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const resetForm = () => {
    setFormData({
      empleado_id: '',
      monto: '',
      fecha: new Date().toISOString().split('T')[0],
      motivo: '',
      pagar: true,
      cuenta_financiera_id: cuentas.length > 0 ? cuentas[0].id : '',
      medio_pago: 'efectivo'
    });
  };

  const handleView = (adelanto) => {
    setSelectedAdelanto(adelanto);
    setShowViewModal(true);
  };

  const handleOpenPago = (adelanto) => {
    setSelectedAdelanto(adelanto);
    setPagoData({
      cuenta_financiera_id: cuentas.length > 0 ? String(cuentas[0].id) : '',
      medio_pago: 'efectivo'
    });
    setShowPagoModal(true);
  };

  const handlePagar = async () => {
    if (registrandoPago) return;
    if (!pagoData.cuenta_financiera_id) {
      toast.error('Seleccione una cuenta financiera');
      return;
    }
    
    setRegistrandoPago(true);
    try {
      await pagarAdelanto(
        selectedAdelanto.id, 
        parseInt(pagoData.cuenta_financiera_id),
        pagoData.medio_pago
      );
      toast.success('Pago registrado exitosamente');
      setShowPagoModal(false);
      loadData();
    } catch (error) {
      console.error('Error paying adelanto:', error);
      toast.error(error.response?.data?.detail || 'Error al registrar pago');
    } finally {
      setRegistrandoPago(false);
    }
  };

  const handleDownloadPDF = (adelanto) => {
    const empleado = empleados.find(e => e.id === adelanto.empleado_id);
    
    const pdfContent = `
      <html>
      <head>
        <title>Adelanto-${adelanto.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1B4D3E; }
          .doc-title { font-size: 1.5rem; font-weight: 700; color: #1B4D3E; }
          .doc-date { font-size: 0.875rem; color: #64748b; margin-top: 8px; }
          .content { margin: 2rem 0; }
          .field { margin-bottom: 1.5rem; }
          .field-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .field-value { font-size: 1rem; font-weight: 500; }
          .amount { font-family: 'JetBrains Mono', monospace; font-size: 2rem; font-weight: 700; color: #1B4D3E; text-align: center; padding: 2rem; background: #f8fafc; border-radius: 8px; margin: 2rem 0; }
          .signature { margin-top: 4rem; display: flex; justify-content: space-between; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #1e293b; padding-top: 8px; font-size: 0.75rem; color: #64748b; }
          .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 0.75rem; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="doc-title">COMPROBANTE DE ADELANTO</div>
          <div class="doc-date">Fecha: ${formatDate(adelanto.fecha)}</div>
        </div>
        
        <div class="content">
          <div class="field">
            <div class="field-label">Empleado</div>
            <div class="field-value">${adelanto.empleado_nombre || empleado?.nombre || '-'}</div>
          </div>
          
          <div class="amount">
            ${formatCurrency(adelanto.monto)}
          </div>
          
          <div class="field">
            <div class="field-label">Motivo</div>
            <div class="field-value">${adelanto.motivo || 'No especificado'}</div>
          </div>
          
          <div class="field">
            <div class="field-label">Estado</div>
            <div class="field-value">${adelanto.descontado ? 'DESCONTADO' : 'PENDIENTE'}</div>
          </div>
        </div>
        
        <div class="signature">
          <div class="signature-box">
            <div class="signature-line">Firma del Empleado</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Firma del Responsable</div>
          </div>
        </div>
        
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

  // Filter adelantos
  const adelantosFiltrados = adelantos.filter(a => {
    if (filtroEmpleado && a.empleado_id !== parseInt(filtroEmpleado)) return false;
    if (filtroEstado && getEstadoAdelanto(a) !== filtroEstado) return false;
    return true;
  });

  const totalAdelantos = adelantos.reduce((acc, a) => acc + (a.monto || 0), 0);
  const totalPendientes = adelantos.filter(a => !a.descontado).reduce((acc, a) => acc + (a.monto || 0), 0);

  return (
    <div data-testid="adelantos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Adelantos a Empleados</h1>
          <p className="page-subtitle">{adelantos.length} adelantos registrados</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setFormData({
              empleado_id: '',
              monto: '',
              fecha: new Date().toISOString().split('T')[0],
              motivo: '',
              pagar: true,
              cuenta_financiera_id: cuentas.length > 0 ? String(cuentas[0].id) : '',
              medio_pago: 'efectivo'
            });
            setShowModal(true);
          }}
          data-testid="nuevo-adelanto-btn"
          disabled={empleados.length === 0}
        >
          <Plus size={18} />
          Nuevo Adelanto
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards" style={{ marginBottom: '1.5rem' }}>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: '#dbeafe' }}>
            <Wallet size={20} color="#1d4ed8" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Total Adelantos</div>
            <div className="summary-card-value currency-display">{formatCurrency(totalAdelantos)}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: '#fef3c7' }}>
            <Calendar size={20} color="#d97706" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Pendientes de Descontar</div>
            <div className="summary-card-value currency-display">{formatCurrency(totalPendientes)}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: '#dcfce7' }}>
            <Users size={20} color="#15803d" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Empleados</div>
            <div className="summary-card-value">{empleados.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: '1rem' }}>
        <select
          className="form-input form-select"
          value={filtroEmpleado}
          onChange={(e) => setFiltroEmpleado(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="">Todos los empleados</option>
          {empleados.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.nombre}</option>
          ))}
        </select>
        <select
          className="form-input form-select"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ width: '150px' }}
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="descontado">Descontado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
              </div>
            ) : adelantosFiltrados.length === 0 ? (
              <div className="empty-state">
                <Wallet className="empty-state-icon" />
                <div className="empty-state-title">No hay adelantos registrados</div>
                <div className="empty-state-description">
                  {empleados.length === 0 
                    ? 'Primero debe registrar empleados' 
                    : 'Registra adelantos para tus empleados'}
                </div>
              </div>
            ) : (
              <table className="data-table" data-testid="adelantos-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Empleado</th>
                    <th className="text-right">Monto</th>
                    <th>Motivo</th>
                    <th className="text-center">Planilla</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {adelantosFiltrados.map((adelanto) => (
                    <tr key={adelanto.id}>
                      <td>{formatDate(adelanto.fecha)}</td>
                      <td style={{ fontWeight: 500 }}>{adelanto.empleado_nombre}</td>
                      <td className="text-right currency-display" style={{ fontWeight: 600 }}>
                        {formatCurrency(adelanto.monto)}
                      </td>
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {adelanto.motivo || '-'}
                      </td>
                      <td className="text-center">
                        {adelanto.planilla_id ? (
                          <span className="badge badge-success" title={`Planilla ID: ${adelanto.planilla_id}`}>
                            #{adelanto.planilla_id}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={getEstadoBadge(getEstadoAdelanto(adelanto))}>
                          {getEstadoAdelanto(adelanto).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="actions-row">
                          {!adelanto.pagado && !adelanto.descontado && (
                            <>
                              <button 
                                className="action-btn action-success"
                                onClick={() => handleOpenPago(adelanto)}
                                title="Registrar Pago"
                              >
                                <DollarSign size={15} />
                              </button>
                              <button 
                                className="action-btn action-edit"
                                onClick={() => handleEdit(adelanto)}
                                title="Editar"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                className="action-btn action-danger"
                                onClick={() => handleDelete(adelanto)}
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                          {adelanto.pago_id && (
                            <button 
                              className="action-btn action-info"
                              onClick={() => {
                                setSelectedAdelanto(adelanto);
                                setShowPagosListModal(true);
                              }}
                              title="Ver Pagos"
                            >
                              <CreditCard size={15} />
                            </button>
                          )}
                          <button 
                            className="action-btn"
                            onClick={() => handleView(adelanto)}
                            title="Ver detalle"
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            className="action-btn"
                            onClick={() => handleDownloadPDF(adelanto)}
                            title="Descargar PDF"
                          >
                            <Download size={15} />
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

      {/* Modal Nuevo/Editar Adelanto */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Editar Adelanto' : 'Nuevo Adelanto'}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingId(null); }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Empleado</label>
                  <SearchableSelect
                    options={empleados}
                    value={formData.empleado_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, empleado_id: value }))}
                    placeholder="Seleccionar empleado..."
                    searchPlaceholder="Buscar empleado..."
                    displayKey="nombre"
                    valueKey="id"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label required">Monto</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input text-right currency-input"
                      value={formData.monto}
                      onChange={(e) => setFormData(prev => ({ ...prev, monto: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Fecha</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Motivo</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={formData.motivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Motivo del adelanto..."
                  />
                </div>

                {/* Payment Section - Only for new adelantos */}
                {!editingId && (
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  marginTop: '0.5rem'
                }}>
                  <div className="form-group" style={{ marginBottom: formData.pagar ? '1rem' : 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.pagar}
                        onChange={(e) => setFormData(prev => ({ ...prev, pagar: e.target.checked }))}
                        style={{ width: '18px', height: '18px', accentColor: '#1B4D3E' }}
                      />
                      <span style={{ fontWeight: 500 }}>Registrar salida de dinero</span>
                    </label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginLeft: '1.625rem' }}>
                      Descontar el monto de una cuenta financiera
                    </p>
                  </div>

                  {formData.pagar && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label required">Cuenta de Salida</label>
                        <select
                          className="form-input form-select"
                          value={formData.cuenta_financiera_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, cuenta_financiera_id: e.target.value }))}
                          required={formData.pagar}
                        >
                          <option value="">Seleccionar cuenta...</option>
                          {cuentas.map(cuenta => (
                            <option key={cuenta.id} value={cuenta.id}>
                              {cuenta.nombre} - {cuenta.banco || 'Caja'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Medio de Pago</label>
                        <select
                          className="form-input form-select"
                          value={formData.medio_pago}
                          onChange={(e) => setFormData(prev => ({ ...prev, medio_pago: e.target.value }))}
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditingId(null); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <DollarSign size={16} />
                  {submitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Registrar Adelanto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Adelanto */}
      {showViewModal && selectedAdelanto && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Detalle del Adelanto</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => handleDownloadPDF(selectedAdelanto)}>
                  <Download size={16} />
                  PDF
                </button>
                <button className="modal-close" onClick={() => setShowViewModal(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Monto del Adelanto</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#1B4D3E', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(selectedAdelanto.monto)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Empleado</div>
                  <div style={{ fontWeight: 500 }}>{selectedAdelanto.empleado_nombre}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Fecha</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(selectedAdelanto.fecha)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Estado</div>
                  <span className={getEstadoBadge(getEstadoAdelanto(selectedAdelanto))}>{getEstadoAdelanto(selectedAdelanto)}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Descontado en</div>
                  <div style={{ fontWeight: 500 }}>{selectedAdelanto.planilla_id ? `Planilla #${selectedAdelanto.planilla_id}` : '-'}</div>
                </div>
              </div>

              {selectedAdelanto.motivo && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Motivo</div>
                  <div style={{ fontWeight: 500 }}>{selectedAdelanto.motivo}</div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowViewModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      {showPagoModal && selectedAdelanto && (
        <div className="modal-overlay" onClick={() => setShowPagoModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar Pago de Adelanto</h2>
              <button className="modal-close" onClick={() => setShowPagoModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Monto a Pagar</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1B4D3E', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(selectedAdelanto.monto)}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.5rem' }}>
                  {selectedAdelanto.empleado_nombre}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Cuenta de Salida</label>
                <select
                  className="form-input form-select"
                  value={pagoData.cuenta_financiera_id}
                  onChange={(e) => setPagoData(prev => ({ ...prev, cuenta_financiera_id: e.target.value }))}
                >
                  <option value="">Seleccionar cuenta...</option>
                  {cuentas.map(cuenta => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre} - {cuenta.banco || 'Caja'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Medio de Pago</label>
                <select
                  className="form-input form-select"
                  value={pagoData.medio_pago}
                  onChange={(e) => setPagoData(prev => ({ ...prev, medio_pago: e.target.value }))}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPagoModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handlePagar} disabled={registrandoPago}>
                <DollarSign size={16} />
                {registrandoPago ? 'Registrando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Pagos */}
      {showPagosListModal && selectedAdelanto && (
        <PagosListModal 
          adelanto={selectedAdelanto}
          onClose={() => {
            setShowPagosListModal(false);
            setPagoDetails(null);
          }}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

// Componente separado para el modal de pagos
const PagosListModal = ({ adelanto, onClose, formatCurrency, formatDate }) => {
  const [pago, setPago] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPago = async () => {
      if (!adelanto.pago_id) return;
      try {
        setLoading(true);
        const response = await getPago(adelanto.pago_id);
        setPago(response.data);
      } catch (error) {
        console.error('Error loading pago:', error);
        toast.error('Error al cargar datos del pago');
      } finally {
        setLoading(false);
      }
    };
    loadPago();
  }, [adelanto.pago_id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Pagos del Adelanto</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          {/* Resumen del Adelanto */}
          <div style={{ 
            background: '#f8fafc', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Empleado</div>
              <div style={{ fontWeight: 600 }}>{adelanto.empleado_nombre}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Monto Adelanto</div>
              <div style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCurrency(adelanto.monto)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Fecha</div>
              <div style={{ fontWeight: 600 }}>{formatDate(adelanto.fecha)}</div>
            </div>
          </div>

          {/* Tabla de Pagos */}
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Movimientos Registrados
          </h3>
          
          {loading ? (
            <div className="loading" style={{ padding: '2rem' }}>
              <div className="loading-spinner"></div>
            </div>
          ) : pago ? (
            <div className="data-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="data-table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Cuenta</th>
                    <th>Medio</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                      {pago.numero}
                    </td>
                    <td>{formatDate(pago.fecha)}</td>
                    <td>{pago.cuenta_financiera_nombre || '-'}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {pago.detalles?.[0]?.medio_pago || 'efectivo'}
                    </td>
                    <td className="text-right currency-display" style={{ fontWeight: 600, color: '#dc2626' }}>
                      -{formatCurrency(pago.monto_total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              No hay pagos registrados
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Adelantos;
