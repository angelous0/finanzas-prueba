import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Eye, X, FileSpreadsheet, Users, DollarSign, ChevronDown, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPlanillas, createPlanilla, updatePlanilla, deletePlanilla,
  getTrabajadoresPlanilla, getLineasNegocio, getResumenPlanillas,
  getUnidadesInternas,
} from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';

const fmt = (v) => {
  const n = parseFloat(v) || 0;
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const TIPOS_PLANILLA = [
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'gratificacion', label: 'Gratificación' },
  { value: 'liquidacion', label: 'Liquidación' },
];

const ESTADO_COLORS = {
  borrador: 'var(--muted)',
  aprobado: '#2563eb',
  pagado: '#16a34a',
  anulado: '#dc2626',
};

export default function Planilla() {
  const { empresaActual } = useEmpresa();

  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showView, setShowView] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Master data
  const [trabajadores, setTrabajadores] = useState([]);
  const [lineasNegocio, setLineasNegocio] = useState([]);
  const [unidadesInternas, setUnidadesInternas] = useState([]);
  const [resumen, setResumen] = useState(null);

  // Filters
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Form state
  const emptyForm = {
    periodo: '', tipo: 'quincenal', fecha_inicio: '', fecha_fin: '', fecha_pago: '', notas: '',
    lineas: [],
  };
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    if (!empresaActual) return;
    setLoading(true);
    try {
      const params = {};
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroEstado) params.estado = filtroEstado;
      const [plRes, trRes, lnRes, resRes, uiRes] = await Promise.all([
        getPlanillas(params),
        getTrabajadoresPlanilla(),
        getLineasNegocio(),
        getResumenPlanillas({}),
        getUnidadesInternas(),
      ]);
      setPlanillas(plRes.data);
      setTrabajadores(trRes.data);
      setLineasNegocio(lnRes.data);
      setResumen(resRes.data);
      setUnidadesInternas(uiRes.data);
    } catch (e) {
      toast.error('Error cargando planillas');
    } finally {
      setLoading(false);
    }
  }, [empresaActual, filtroTipo, filtroEstado]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      periodo: p.periodo || '',
      tipo: p.tipo || 'quincenal',
      fecha_inicio: p.fecha_inicio || '',
      fecha_fin: p.fecha_fin || '',
      fecha_pago: p.fecha_pago || '',
      notas: p.notas || '',
      lineas: (p.lineas || []).map(l => ({
        trabajador_id: l.trabajador_id || '',
        trabajador_nombre: l.trabajador_nombre || '',
        tipo_trabajador: l.tipo_trabajador || '',
        unidad_interna_id: l.unidad_interna_id || '',
        linea_negocio_id: l.linea_negocio_id || '',
        salario_base: parseFloat(l.salario_base) || 0,
        bonificaciones: parseFloat(l.bonificaciones) || 0,
        adelantos: parseFloat(l.adelantos) || 0,
        otros_descuentos: parseFloat(l.otros_descuentos) || 0,
        neto_pagar: parseFloat(l.neto_pagar) || 0,
        notas: l.notas || '',
      })),
    });
    setShowModal(true);
  };

  const addLinea = () => {
    setForm(f => ({ ...f, lineas: [...f.lineas, {
      trabajador_id: '', trabajador_nombre: '', tipo_trabajador: '', unidad_interna_id: '',
      linea_negocio_id: '', salario_base: 0, bonificaciones: 0, adelantos: 0,
      otros_descuentos: 0, neto_pagar: 0, notas: '',
    }]}));
  };

  const updateLinea = (idx, field, val) => {
    setForm(f => {
      const lineas = [...f.lineas];
      lineas[idx] = { ...lineas[idx], [field]: val };
      // Auto-calc neto_pagar
      const l = lineas[idx];
      if (['salario_base', 'bonificaciones', 'adelantos', 'otros_descuentos'].includes(field)) {
        const sb = parseFloat(l.salario_base) || 0;
        const bn = parseFloat(l.bonificaciones) || 0;
        const ad = parseFloat(l.adelantos) || 0;
        const od = parseFloat(l.otros_descuentos) || 0;
        lineas[idx].neto_pagar = sb + bn - ad - od;
      }
      return { ...f, lineas };
    });
  };

  const removeLinea = (idx) => {
    setForm(f => ({ ...f, lineas: f.lineas.filter((_, i) => i !== idx) }));
  };

  const selectTrabajador = (idx, tId) => {
    const t = trabajadores.find(w => w.id === tId);
    if (!t) return;
    setForm(f => {
      const lineas = [...f.lineas];
      lineas[idx] = {
        ...lineas[idx],
        trabajador_id: t.id,
        trabajador_nombre: t.nombre,
        tipo_trabajador: t.tipo_persona || '',
        unidad_interna_id: t.unidad_interna_id || '',
      };
      return { ...f, lineas };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.periodo || !form.fecha_inicio || !form.fecha_fin) {
      toast.error('Periodo, fecha inicio y fecha fin son requeridos');
      return;
    }
    if (form.lineas.length === 0) {
      toast.error('Agrega al menos un trabajador');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        lineas: form.lineas.map(l => ({
          ...l,
          trabajador_id: l.trabajador_id || null,
          unidad_interna_id: l.unidad_interna_id ? parseInt(l.unidad_interna_id) : null,
          linea_negocio_id: l.linea_negocio_id ? parseInt(l.linea_negocio_id) : null,
          salario_base: parseFloat(l.salario_base) || 0,
          bonificaciones: parseFloat(l.bonificaciones) || 0,
          adelantos: parseFloat(l.adelantos) || 0,
          otros_descuentos: parseFloat(l.otros_descuentos) || 0,
          neto_pagar: parseFloat(l.neto_pagar) || 0,
        })),
        fecha_pago: form.fecha_pago || null,
      };
      if (editingId) {
        await updatePlanilla(editingId, payload);
        toast.success('Planilla actualizada');
      } else {
        await createPlanilla(payload);
        toast.success('Planilla creada');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error guardando planilla');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePlanilla(id);
      toast.success('Planilla eliminada');
      setConfirmDelete(null);
      loadData();
    } catch (e) {
      toast.error('Error eliminando planilla');
    }
  };

  // Totals from current form lines
  const formTotals = form.lineas.reduce((acc, l) => ({
    bruto: acc.bruto + (parseFloat(l.salario_base) || 0) + (parseFloat(l.bonificaciones) || 0),
    adelantos: acc.adelantos + (parseFloat(l.adelantos) || 0),
    descuentos: acc.descuentos + (parseFloat(l.otros_descuentos) || 0),
    neto: acc.neto + (parseFloat(l.neto_pagar) || 0),
  }), { bruto: 0, adelantos: 0, descuentos: 0, neto: 0 });

  if (!empresaActual) return null;

  return (
    <div style={{ padding: '1.5rem' }} data-testid="planilla-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Planilla</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Gestiona el pago de trabajadores por periodo</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} data-testid="create-planilla-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Nueva Planilla
        </button>
      </div>

      {/* Summary Cards */}
      {resumen?.totales && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Planillas', value: resumen.totales.num_planillas, icon: <FileSpreadsheet size={18} />, color: '#6366f1' },
            { label: 'Total Bruto', value: fmt(resumen.totales.total_bruto), icon: <DollarSign size={18} />, color: '#f59e0b' },
            { label: 'Total Neto', value: fmt(resumen.totales.total_neto), icon: <DollarSign size={18} />, color: '#16a34a' },
            { label: 'Trabajadores', value: resumen.por_unidad_interna?.reduce((a, u) => a + (parseInt(u.num_trabajadores) || 0), 0) || 0, icon: <Users size={18} />, color: '#2563eb' },
          ].map((c, i) => (
            <div key={i} data-testid={`summary-card-${i}`} style={{
              background: 'var(--card)', borderRadius: '0.75rem', padding: '1rem 1.25rem',
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: `${c.color}18`, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{c.label}</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="form-input" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ width: 180 }} data-testid="filter-tipo">
          <option value="">Todos los tipos</option>
          {TIPOS_PLANILLA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="form-input" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ width: 180 }} data-testid="filter-estado">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="aprobado">Aprobado</option>
          <option value="pagado">Pagado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Cargando...</div>
      ) : planillas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
          <FileSpreadsheet size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>No hay planillas registradas</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" data-testid="planillas-table">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Tipo</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Trabajadores</th>
                <th style={{ textAlign: 'right' }}>Total Bruto</th>
                <th style={{ textAlign: 'right' }}>Total Neto</th>
                <th>Estado</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planillas.map(p => (
                <tr key={p.id} data-testid={`planilla-row-${p.id}`}>
                  <td style={{ fontWeight: 600 }}>{p.periodo}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                      background: '#6366f118', color: '#6366f1',
                    }}>
                      {TIPOS_PLANILLA.find(t => t.value === p.tipo)?.label || p.tipo || '-'}
                    </span>
                  </td>
                  <td>{fmtDate(p.fecha_inicio)}</td>
                  <td>{fmtDate(p.fecha_fin)}</td>
                  <td style={{ textAlign: 'center' }}>{p.lineas?.length || 0}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(p.total_bruto)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.total_neto)}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                      background: `${ESTADO_COLORS[p.estado] || 'var(--muted)'}18`,
                      color: ESTADO_COLORS[p.estado] || 'var(--muted)',
                    }}>
                      {p.estado || '-'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" title="Ver" onClick={() => setShowView(p)} data-testid={`view-planilla-${p.id}`}>
                        <Eye size={15} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => openEdit(p)} data-testid={`edit-planilla-${p.id}`}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Eliminar" onClick={() => setConfirmDelete(p.id)}
                        style={{ color: '#dc2626' }} data-testid={`delete-planilla-${p.id}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Confirmar eliminación</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: '#dc2626' }} onClick={() => handleDelete(confirmDelete)} data-testid="confirm-delete-btn">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && (
        <div className="modal-backdrop" onClick={() => setShowView(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Planilla: {showView.periodo}</h2>
              <button className="btn btn-ghost" onClick={() => setShowView(null)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <div><span style={{ color: 'var(--muted)' }}>Tipo:</span> {TIPOS_PLANILLA.find(t => t.value === showView.tipo)?.label || showView.tipo}</div>
              <div><span style={{ color: 'var(--muted)' }}>Inicio:</span> {fmtDate(showView.fecha_inicio)}</div>
              <div><span style={{ color: 'var(--muted)' }}>Fin:</span> {fmtDate(showView.fecha_fin)}</div>
              <div><span style={{ color: 'var(--muted)' }}>Pago:</span> {fmtDate(showView.fecha_pago)}</div>
              <div><span style={{ color: 'var(--muted)' }}>Estado:</span> {showView.estado}</div>
              <div><span style={{ color: 'var(--muted)' }}>Notas:</span> {showView.notas || '-'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
              <div><span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Total Bruto</span><div style={{ fontWeight: 700 }}>{fmt(showView.total_bruto)}</div></div>
              <div><span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Adelantos</span><div style={{ fontWeight: 700, color: '#dc2626' }}>{fmt(showView.total_adelantos)}</div></div>
              <div><span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Total Neto</span><div style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(showView.total_neto)}</div></div>
            </div>
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Tipo</th>
                  <th>Unidad Interna</th>
                  <th>Línea Negocio</th>
                  <th style={{ textAlign: 'right' }}>Salario</th>
                  <th style={{ textAlign: 'right' }}>Bonif.</th>
                  <th style={{ textAlign: 'right' }}>Adelantos</th>
                  <th style={{ textAlign: 'right' }}>Otros Desc.</th>
                  <th style={{ textAlign: 'right' }}>Neto</th>
                </tr>
              </thead>
              <tbody>
                {(showView.lineas || []).map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{l.trabajador_nombre || '-'}</td>
                    <td>{l.tipo_trabajador || '-'}</td>
                    <td>{l.unidad_interna_nombre || '-'}</td>
                    <td>{l.linea_negocio_nombre || (l.linea_negocio_id ? `ID:${l.linea_negocio_id}` : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Prorrateado</span>)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(l.salario_base)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(l.bonificaciones)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(l.adelantos)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(l.otros_descuentos)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.neto_pagar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 1000, maxHeight: '92vh', overflow: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{editingId ? 'Editar Planilla' : 'Nueva Planilla'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Header fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label required">Periodo</label>
                  <input className="form-input" value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                    placeholder="2026-01-Q1" required data-testid="input-periodo" />
                </div>
                <div>
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    data-testid="input-tipo">
                    {TIPOS_PLANILLA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Fecha Pago</label>
                  <input className="form-input" type="date" value={form.fecha_pago} onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))}
                    data-testid="input-fecha-pago" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label required">Fecha Inicio</label>
                  <input className="form-input" type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                    required data-testid="input-fecha-inicio" />
                </div>
                <div>
                  <label className="form-label required">Fecha Fin</label>
                  <input className="form-input" type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                    required data-testid="input-fecha-fin" />
                </div>
                <div>
                  <label className="form-label">Notas</label>
                  <input className="form-input" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                    placeholder="Observaciones..." data-testid="input-notas" />
                </div>
              </div>

              {/* Detail Lines */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Detalle de Trabajadores</h3>
                <button type="button" className="btn btn-secondary" onClick={addLinea} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}
                  data-testid="add-linea-btn">
                  <Plus size={14} /> Agregar Línea
                </button>
              </div>

              {form.lineas.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  Agrega trabajadores usando el botón de arriba
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 200 }}>Trabajador</th>
                        <th style={{ minWidth: 140 }}>Unidad Interna</th>
                        <th style={{ minWidth: 140 }}>Línea Negocio</th>
                        <th style={{ minWidth: 100, textAlign: 'right' }}>Salario</th>
                        <th style={{ minWidth: 90, textAlign: 'right' }}>Bonif.</th>
                        <th style={{ minWidth: 90, textAlign: 'right' }}>Adelantos</th>
                        <th style={{ minWidth: 90, textAlign: 'right' }}>Otros Desc.</th>
                        <th style={{ minWidth: 100, textAlign: 'right' }}>Neto</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.lineas.map((l, idx) => (
                        <tr key={idx}>
                          <td>
                            <select className="form-input" value={l.trabajador_id}
                              onChange={e => selectTrabajador(idx, e.target.value)}
                              data-testid={`linea-trabajador-${idx}`}
                              style={{ fontSize: '0.8rem', padding: '4px 6px' }}>
                              <option value="">-- Seleccionar --</option>
                              {trabajadores.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre} ({t.tipo_persona || '?'})</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select className="form-input" value={l.unidad_interna_id || ''}
                              onChange={e => updateLinea(idx, 'unidad_interna_id', e.target.value)}
                              style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                              data-testid={`linea-unidad-${idx}`}>
                              <option value="">-</option>
                              {unidadesInternas.map(ui => (
                                <option key={ui.id} value={ui.id}>{ui.nombre}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select className="form-input" value={l.linea_negocio_id || ''}
                              onChange={e => updateLinea(idx, 'linea_negocio_id', e.target.value)}
                              style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                              data-testid={`linea-ln-${idx}`}>
                              <option value="">(Prorrateado)</option>
                              {lineasNegocio.map(ln => (
                                <option key={ln.id} value={ln.id}>{ln.nombre}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input className="form-input" type="number" step="0.01" min="0" value={l.salario_base}
                              onChange={e => updateLinea(idx, 'salario_base', e.target.value)}
                              style={{ textAlign: 'right', fontSize: '0.8rem', padding: '4px 6px' }}
                              data-testid={`linea-salario-${idx}`} />
                          </td>
                          <td>
                            <input className="form-input" type="number" step="0.01" min="0" value={l.bonificaciones}
                              onChange={e => updateLinea(idx, 'bonificaciones', e.target.value)}
                              style={{ textAlign: 'right', fontSize: '0.8rem', padding: '4px 6px' }} />
                          </td>
                          <td>
                            <input className="form-input" type="number" step="0.01" min="0" value={l.adelantos}
                              onChange={e => updateLinea(idx, 'adelantos', e.target.value)}
                              style={{ textAlign: 'right', fontSize: '0.8rem', padding: '4px 6px' }} />
                          </td>
                          <td>
                            <input className="form-input" type="number" step="0.01" min="0" value={l.otros_descuentos}
                              onChange={e => updateLinea(idx, 'otros_descuentos', e.target.value)}
                              style={{ textAlign: 'right', fontSize: '0.8rem', padding: '4px 6px' }} />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                            {fmt(l.neto_pagar)}
                          </td>
                          <td>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLinea(idx)}
                              style={{ color: '#dc2626' }} data-testid={`remove-linea-${idx}`}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals bar */}
              {form.lineas.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', padding: '0.75rem 1rem', background: 'var(--bg)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>Bruto: <strong>{fmt(formTotals.bruto)}</strong></div>
                  <div>Adelantos: <strong style={{ color: '#dc2626' }}>{fmt(formTotals.adelantos)}</strong></div>
                  <div>Descuentos: <strong style={{ color: '#dc2626' }}>{fmt(formTotals.descuentos)}</strong></div>
                  <div>Neto: <strong style={{ color: '#16a34a' }}>{fmt(formTotals.neto)}</strong></div>
                </div>
              )}

              {/* Submit */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="submit-planilla-btn">
                  {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Planilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
