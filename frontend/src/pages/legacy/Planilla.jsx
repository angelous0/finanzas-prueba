import React, { useState, useEffect } from 'react';
import { 
  getPlanillas, createPlanilla, pagarPlanilla, deletePlanilla,
  getEmpleados, getAdelantos, getCuentasFinancieras, getPago
} from '../services/api';
import { Plus, FileText, Trash2, Eye, X, DollarSign, Download, Check, Calendar, Users, Edit2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useEmpresa } from '../context/EmpresaContext';

const formatCurrency = (value, symbol = 'S/') => {
  return `${symbol} ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-PE');
};

const getEstadoBadge = (estado) => {
  const badges = {
    borrador: 'badge badge-warning',
    pagada: 'badge badge-success',
    anulada: 'badge badge-danger'
  };
  return badges[estado] || 'badge';
};

export const Planilla = () => {
  const { empresaActual } = useEmpresa();
  const [planillas, setPlanillas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [adelantosPendientes, setAdelantosPendientes] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showPagosListModal, setShowPagosListModal] = useState(false);
  const [selectedPlanilla, setSelectedPlanilla] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    periodo: '',
    fecha_inicio: '',
    fecha_fin: '',
    notas: ''
  });
  
  const [detalles, setDetalles] = useState([]);
  const [cuentaPagoId, setCuentaPagoId] = useState('');

  useEffect(() => {
    loadData();
  }, [empresaActual]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (empresaActual?.id) params.empresa_id = empresaActual.id;
      const [planillasRes, empleadosRes, cuentasRes, adelantosRes] = await Promise.all([
        getPlanillas(params),
        getEmpleados(),
        getCuentasFinancieras(),
        getAdelantos({ descontado: false })
      ]);
      setPlanillas(planillasRes.data);
      setEmpleados(empleadosRes.data);
      setCuentas(cuentasRes.data);
      setAdelantosPendientes(adelantosRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total pending advances per employee
  const getAdelantosPorEmpleado = (empleadoId) => {
    return adelantosPendientes
      .filter(a => a.empleado_id === empleadoId && !a.descontado)
      .reduce((sum, a) => sum + (a.monto || 0), 0);
  };

  const handleNuevaPlanilla = () => {
    // Get current month as default period
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodo = `${year}-${month}`;
    
    // Calculate start and end of month
    const firstDay = new Date(year, now.getMonth(), 1);
    const lastDay = new Date(year, now.getMonth() + 1, 0);
    
    setFormData({
      periodo: periodo,
      fecha_inicio: firstDay.toISOString().split('T')[0],
      fecha_fin: lastDay.toISOString().split('T')[0],
      notas: ''
    });
    
    // Initialize detalles with all empleados and their pending advances
    setDetalles(empleados.map(emp => ({
      empleado_id: emp.id,
      empleado_nombre: emp.nombre,
      salario_base: emp.salario_base || 0,
      bonificaciones: 0,
      adelantos: getAdelantosPorEmpleado(emp.id),
      otros_descuentos: 0
    })));
    
    setShowModal(true);
  };

  const handleDetalleChange = (index, field, value) => {
    setDetalles(prev => prev.map((d, i) => 
      i === index ? { ...d, [field]: parseFloat(value) || 0 } : d
    ));
  };

  const calcularNeto = (detalle) => {
    return (detalle.salario_base || 0) + (detalle.bonificaciones || 0) 
           - (detalle.adelantos || 0) - (detalle.otros_descuentos || 0);
  };

  const calcularTotales = () => {
    return detalles.reduce((acc, d) => ({
      bruto: acc.bruto + (d.salario_base || 0) + (d.bonificaciones || 0),
      adelantos: acc.adelantos + (d.adelantos || 0),
      descuentos: acc.descuentos + (d.otros_descuentos || 0),
      neto: acc.neto + calcularNeto(d)
    }), { bruto: 0, adelantos: 0, descuentos: 0, neto: 0 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    
    // Filter out employees with no salary
    const detallesConSalario = detalles.filter(d => 
      d.salario_base > 0 || d.bonificaciones > 0
    );
    
    if (detallesConSalario.length === 0) {
      toast.error('Debe ingresar al menos un empleado con salario');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        detalles: detallesConSalario.map(d => ({
          empleado_id: d.empleado_id,
          salario_base: d.salario_base,
          bonificaciones: d.bonificaciones,
          adelantos: d.adelantos,
          otros_descuentos: d.otros_descuentos
        }))
      };
      
      await createPlanilla(payload);
      toast.success('Planilla creada exitosamente');
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating planilla:', error);
      toast.error(error.response?.data?.detail || 'Error al crear planilla');
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (planilla) => {
    setSelectedPlanilla(planilla);
    setShowViewModal(true);
  };

  const handleDelete = async (planilla) => {
    if (planilla.estado === 'pagada') {
      toast.error('No se puede eliminar una planilla pagada');
      return;
    }
    
    if (!window.confirm(`¿Eliminar la planilla del período ${planilla.periodo}?`)) {
      return;
    }
    
    try {
      await deletePlanilla(planilla.id);
      toast.success('Planilla eliminada');
      loadData();
    } catch (error) {
      console.error('Error deleting planilla:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleOpenPago = (planilla) => {
    setSelectedPlanilla(planilla);
    setCuentaPagoId(cuentas.length > 0 ? cuentas[0].id : '');
    setShowPagoModal(true);
  };

  const handlePagar = async () => {
    if (!cuentaPagoId) {
      toast.error('Seleccione una cuenta financiera');
      return;
    }
    
    try {
      await pagarPlanilla(selectedPlanilla.id, cuentaPagoId);
      toast.success('Planilla pagada exitosamente');
      setShowPagoModal(false);
      loadData();
    } catch (error) {
      console.error('Error paying planilla:', error);
      toast.error(error.response?.data?.detail || 'Error al pagar planilla');
    }
  };

  const handleDownloadPDF = (planilla) => {
    const pdfContent = `
      <html>
      <head>
        <title>Planilla-${planilla.periodo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1B4D3E; }
          .doc-title { font-size: 1.5rem; font-weight: 700; color: #1B4D3E; }
          .doc-periodo { font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; margin-top: 4px; }
          .info-row { display: flex; gap: 2rem; margin-bottom: 1.5rem; font-size: 0.875rem; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
          .text-right { text-align: right; }
          .currency { font-family: 'JetBrains Mono', monospace; }
          .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
          .totals-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 24px; min-width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .totals-row.total { border-top: 2px solid #1B4D3E; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 1.125rem; }
          .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 0.75rem; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="doc-title">PLANILLA DE REMUNERACIONES</div>
            <div class="doc-periodo">Período: ${planilla.periodo}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.875rem; color: #64748b;">Fecha de Pago</div>
            <div style="font-size: 1rem; font-weight: 500;">${planilla.fecha_pago ? formatDate(planilla.fecha_pago) : 'Pendiente'}</div>
          </div>
        </div>
        
        <div class="info-row">
          <span>Desde: ${formatDate(planilla.fecha_inicio)}</span>
          <span>Hasta: ${formatDate(planilla.fecha_fin)}</span>
          <span>Estado: ${planilla.estado?.toUpperCase()}</span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Empleado</th>
              <th class="text-right">Salario Base</th>
              <th class="text-right">Bonificaciones</th>
              <th class="text-right">Adelantos</th>
              <th class="text-right">Otros Desc.</th>
              <th class="text-right">Neto a Pagar</th>
            </tr>
          </thead>
          <tbody>
            ${(planilla.detalles || []).map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.empleado_nombre || '-'}</td>
              <td class="text-right currency">${formatCurrency(d.salario_base)}</td>
              <td class="text-right currency">${formatCurrency(d.bonificaciones)}</td>
              <td class="text-right currency" style="color: #dc2626;">${formatCurrency(d.adelantos)}</td>
              <td class="text-right currency" style="color: #dc2626;">${formatCurrency(d.otros_descuentos)}</td>
              <td class="text-right currency" style="font-weight: 600;">${formatCurrency(d.neto_pagar)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="totals-box">
            <div class="totals-row">
              <span>Total Bruto:</span>
              <span class="currency">${formatCurrency(planilla.total_bruto)}</span>
            </div>
            <div class="totals-row">
              <span>Total Adelantos:</span>
              <span class="currency" style="color: #dc2626;">- ${formatCurrency(planilla.total_adelantos)}</span>
            </div>
            <div class="totals-row">
              <span>Otros Descuentos:</span>
              <span class="currency" style="color: #dc2626;">- ${formatCurrency(planilla.total_descuentos)}</span>
            </div>
            <div class="totals-row total">
              <span>NETO A PAGAR:</span>
              <span class="currency">${formatCurrency(planilla.total_neto)}</span>
            </div>
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

  const totales = calcularTotales();
  const totalPlanillas = planillas.reduce((acc, p) => acc + (p.total_neto || 0), 0);

  return (
    <div data-testid="planilla-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Planilla de Remuneraciones</h1>
          <p className="page-subtitle">{planillas.length} planillas registradas</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleNuevaPlanilla}
          data-testid="nueva-planilla-btn"
          disabled={empleados.length === 0}
        >
          <Plus size={18} />
          Nueva Planilla
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards" style={{ marginBottom: '1.5rem' }}>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: '#dcfce7' }}>
            <Calendar size={20} color="#15803d" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Planillas</div>
            <div className="summary-card-value">{planillas.length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: '#dbeafe' }}>
            <Users size={20} color="#1d4ed8" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Empleados</div>
            <div className="summary-card-value">{empleados.length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: '#fef3c7' }}>
            <DollarSign size={20} color="#d97706" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Total Pagado</div>
            <div className="summary-card-value currency-display">
              {formatCurrency(totalPlanillas)}
            </div>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
              </div>
            ) : planillas.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-state-icon" />
                <div className="empty-state-title">No hay planillas registradas</div>
                <div className="empty-state-description">
                  {empleados.length === 0 
                    ? 'Primero debe registrar empleados' 
                    : 'Crea tu primera planilla de remuneraciones'}
                </div>
              </div>
            ) : (
              <table className="data-table" data-testid="planillas-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                    <th>Empleados</th>
                    <th className="text-right">Total Bruto</th>
                    <th className="text-right">Descuentos</th>
                    <th className="text-right">Neto a Pagar</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {planillas.map((planilla) => (
                    <tr key={planilla.id}>
                      <td style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                        {planilla.periodo}
                      </td>
                      <td>{formatDate(planilla.fecha_inicio)}</td>
                      <td>{formatDate(planilla.fecha_fin)}</td>
                      <td className="text-center">
                        {planilla.detalles?.length || 0}
                      </td>
                      <td className="text-right currency-display">
                        {formatCurrency(planilla.total_bruto)}
                      </td>
                      <td className="text-right currency-display" style={{ color: '#dc2626' }}>
                        {formatCurrency((planilla.total_adelantos || 0) + (planilla.total_descuentos || 0))}
                      </td>
                      <td className="text-right currency-display" style={{ fontWeight: 600 }}>
                        {formatCurrency(planilla.total_neto)}
                      </td>
                      <td className="text-center">
                        <span className={getEstadoBadge(planilla.estado)}>
                          {planilla.estado?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="actions-row">
                          {planilla.estado === 'borrador' && (
                            <>
                              <button 
                                className="action-btn action-success"
                                onClick={() => handleOpenPago(planilla)}
                                title="Pagar Planilla"
                              >
                                <DollarSign size={15} />
                              </button>
                              <button 
                                className="action-btn action-danger"
                                onClick={() => handleDelete(planilla)}
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                          {planilla.pago_id && (
                            <button 
                              className="action-btn action-info"
                              onClick={() => {
                                setSelectedPlanilla(planilla);
                                setShowPagosListModal(true);
                              }}
                              title="Ver Pagos"
                            >
                              <CreditCard size={15} />
                            </button>
                          )}
                          <button 
                            className="action-btn"
                            onClick={() => handleView(planilla)}
                            title="Ver detalle"
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            className="action-btn"
                            onClick={() => handleDownloadPDF(planilla)}
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

      {/* Modal Nueva Planilla */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva Planilla de Remuneraciones</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Header Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label required">Período</label>
                    <input
                      type="month"
                      className="form-input"
                      value={formData.periodo}
                      onChange={(e) => setFormData(prev => ({ ...prev, periodo: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Fecha Inicio</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Fecha Fin</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_fin: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Employees Table */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Detalle por Empleado</h3>
                  </div>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                      <thead>
                        <tr>
                          <th>Empleado</th>
                          <th style={{ width: '120px' }}>Salario Base</th>
                          <th style={{ width: '120px' }}>Bonificaciones</th>
                          <th style={{ width: '120px' }}>Adelantos</th>
                          <th style={{ width: '120px' }}>Otros Desc.</th>
                          <th style={{ width: '130px' }}>Neto a Pagar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalles.map((detalle, index) => (
                          <tr key={detalle.empleado_id}>
                            <td style={{ fontWeight: 500 }}>{detalle.empleado_nombre}</td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input text-right currency-input"
                                value={detalle.salario_base || ''}
                                onChange={(e) => handleDetalleChange(index, 'salario_base', e.target.value)}
                                placeholder="0.00"
                                style={{ fontSize: '0.8125rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input text-right currency-input"
                                value={detalle.bonificaciones || ''}
                                onChange={(e) => handleDetalleChange(index, 'bonificaciones', e.target.value)}
                                placeholder="0.00"
                                style={{ fontSize: '0.8125rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input text-right currency-input"
                                value={detalle.adelantos || ''}
                                onChange={(e) => handleDetalleChange(index, 'adelantos', e.target.value)}
                                placeholder="0.00"
                                style={{ fontSize: '0.8125rem', color: '#dc2626' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input text-right currency-input"
                                value={detalle.otros_descuentos || ''}
                                onChange={(e) => handleDetalleChange(index, 'otros_descuentos', e.target.value)}
                                placeholder="0.00"
                                style={{ fontSize: '0.8125rem', color: '#dc2626' }}
                              />
                            </td>
                            <td className="text-right currency-display" style={{ fontWeight: 600, color: calcularNeto(detalle) >= 0 ? '#15803d' : '#dc2626' }}>
                              {formatCurrency(calcularNeto(detalle))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot style={{ background: '#f8fafc', fontWeight: 600 }}>
                        <tr>
                          <td>TOTALES</td>
                          <td className="text-right currency-display">{formatCurrency(totales.bruto - totales.adelantos - totales.descuentos + totales.adelantos + totales.descuentos - (detalles.reduce((acc, d) => acc + (d.bonificaciones || 0), 0)))}</td>
                          <td className="text-right currency-display">{formatCurrency(detalles.reduce((acc, d) => acc + (d.bonificaciones || 0), 0))}</td>
                          <td className="text-right currency-display" style={{ color: '#dc2626' }}>{formatCurrency(totales.adelantos)}</td>
                          <td className="text-right currency-display" style={{ color: '#dc2626' }}>{formatCurrency(totales.descuentos)}</td>
                          <td className="text-right currency-display" style={{ color: '#15803d' }}>{formatCurrency(totales.neto)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={formData.notas}
                    onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Check size={16} />
                  {submitting ? 'Creando...' : 'Crear Planilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Planilla */}
      {showViewModal && selectedPlanilla && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Planilla {selectedPlanilla.periodo}</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => handleDownloadPDF(selectedPlanilla)}>
                  <Download size={16} />
                  PDF
                </button>
                <button className="modal-close" onClick={() => setShowViewModal(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="modal-body">
              {/* Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Período</div>
                  <div style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{selectedPlanilla.periodo}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Desde</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(selectedPlanilla.fecha_inicio)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Hasta</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(selectedPlanilla.fecha_fin)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Estado</div>
                  <span className={getEstadoBadge(selectedPlanilla.estado)}>{selectedPlanilla.estado}</span>
                </div>
              </div>

              {/* Detalles */}
              <table className="data-table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Empleado</th>
                    <th className="text-right">Salario Base</th>
                    <th className="text-right">Bonificaciones</th>
                    <th className="text-right">Adelantos</th>
                    <th className="text-right">Otros Desc.</th>
                    <th className="text-right">Neto a Pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPlanilla.detalles || []).map((d, i) => (
                    <tr key={d.id || i}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{d.empleado_nombre}</td>
                      <td className="text-right currency-display">{formatCurrency(d.salario_base)}</td>
                      <td className="text-right currency-display">{formatCurrency(d.bonificaciones)}</td>
                      <td className="text-right currency-display" style={{ color: '#dc2626' }}>{formatCurrency(d.adelantos)}</td>
                      <td className="text-right currency-display" style={{ color: '#dc2626' }}>{formatCurrency(d.otros_descuentos)}</td>
                      <td className="text-right currency-display" style={{ fontWeight: 600 }}>{formatCurrency(d.neto_pagar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.5rem', minWidth: '280px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <span>Total Bruto:</span>
                    <span className="currency-display">{formatCurrency(selectedPlanilla.total_bruto)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#dc2626' }}>
                    <span>(-) Adelantos:</span>
                    <span className="currency-display">{formatCurrency(selectedPlanilla.total_adelantos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#dc2626' }}>
                    <span>(-) Otros Descuentos:</span>
                    <span className="currency-display">{formatCurrency(selectedPlanilla.total_descuentos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.5rem', borderTop: '2px solid #1B4D3E', fontWeight: 700, fontSize: '1.125rem' }}>
                    <span>NETO A PAGAR:</span>
                    <span className="currency-display" style={{ color: '#1B4D3E' }}>{formatCurrency(selectedPlanilla.total_neto)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowViewModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagar Planilla */}
      {showPagoModal && selectedPlanilla && (
        <div className="modal-overlay" onClick={() => setShowPagoModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Pagar Planilla {selectedPlanilla.periodo}</h2>
              <button className="modal-close" onClick={() => setShowPagoModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Monto Total a Pagar</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1B4D3E', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(selectedPlanilla.total_neto)}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Cuenta Financiera</label>
                <select
                  className="form-input form-select"
                  value={cuentaPagoId}
                  onChange={(e) => setCuentaPagoId(e.target.value)}
                  required
                >
                  {cuentas.map(cuenta => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre} - {cuenta.banco || 'Caja'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPagoModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handlePagar}>
                <DollarSign size={16} />
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Pagos de Planilla */}
      {showPagosListModal && selectedPlanilla && (
        <PlanillaPagosModal 
          planilla={selectedPlanilla}
          onClose={() => setShowPagosListModal(false)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

// Componente separado para el modal de pagos de planilla
const PlanillaPagosModal = ({ planilla, onClose, formatCurrency, formatDate }) => {
  const [pago, setPago] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPago = async () => {
      if (!planilla.pago_id) return;
      try {
        setLoading(true);
        const response = await getPago(planilla.pago_id);
        setPago(response.data);
      } catch (error) {
        console.error('Error loading pago:', error);
        toast.error('Error al cargar datos del pago');
      } finally {
        setLoading(false);
      }
    };
    loadPago();
  }, [planilla.pago_id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Pagos de Planilla {planilla.periodo}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          {/* Resumen de la Planilla */}
          <div style={{ 
            background: '#f8fafc', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Período</div>
              <div style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{planilla.periodo}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Empleados</div>
              <div style={{ fontWeight: 600 }}>{planilla.detalles?.length || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Neto</div>
              <div style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCurrency(planilla.total_neto)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Estado</div>
              <div><span className="badge badge-success">{planilla.estado?.toUpperCase()}</span></div>
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
                      {pago.detalles?.[0]?.medio_pago || 'transferencia'}
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

export default Planilla;
