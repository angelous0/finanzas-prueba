import React, { useState, useEffect, useCallback } from 'react';
import { getPresupuestos, createPresupuesto, updatePresupuesto, deletePresupuesto, getCategorias, getCentrosCosto } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Plus, Trash2, Edit2, X, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const Presupuestos = () => {
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id;
  const [presupuestos, setPresupuestos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [anioFilter, setAnioFilter] = useState(new Date().getFullYear());

  const [form, setForm] = useState({ nombre: '', anio: new Date().getFullYear(), notas: '' });
  const [lineas, setLineas] = useState([]);

  const loadData = useCallback(async () => {
    if (!empresaId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [presRes, catRes, ccRes] = await Promise.all([
        getPresupuestos(anioFilter || undefined),
        getCategorias(),
        getCentrosCosto()
      ]);
      setPresupuestos(presRes.data);
      setCategorias(catRes.data);
      setCentrosCosto(ccRes.data);
    } catch (e) { toast.error('Error cargando presupuestos'); }
    setLoading(false);
  }, [empresaId, anioFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ nombre: '', anio: new Date().getFullYear(), notas: '' });
    setLineas([]);
    setEditingId(null);
  };

  const addLinea = () => {
    setLineas(prev => [...prev, { categoria_id: '', centro_costo_id: '', mes: 1, monto_presupuestado: 0 }]);
  };

  const addAllMonths = () => {
    if (!lineas.length || !lineas[0].categoria_id) {
      toast.error('Agrega al menos una línea con categoría primero');
      return;
    }
    const catId = lineas[0].categoria_id;
    const ccId = lineas[0].centro_costo_id;
    const newLineas = [];
    for (let m = 1; m <= 12; m++) {
      const existing = lineas.find(l => parseInt(l.categoria_id) === parseInt(catId) && l.mes === m);
      if (!existing) {
        newLineas.push({ categoria_id: catId, centro_costo_id: ccId, mes: m, monto_presupuestado: 0 });
      }
    }
    setLineas(prev => [...prev, ...newLineas]);
  };

  const updateLinea = (idx, field, value) => {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLinea = (idx) => {
    setLineas(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.nombre.trim()) { toast.error('Nombre requerido'); return; }
    if (lineas.length === 0) { toast.error('Agrega al menos una línea'); return; }

    setSubmitting(true);
    try {
      const payload = {
        nombre: form.nombre,
        anio: parseInt(form.anio),
        notas: form.notas || null,
        lineas: lineas.map(l => ({
          categoria_id: l.categoria_id ? parseInt(l.categoria_id) : null,
          centro_costo_id: l.centro_costo_id ? parseInt(l.centro_costo_id) : null,
          mes: parseInt(l.mes),
          monto_presupuestado: parseFloat(l.monto_presupuestado) || 0
        }))
      };
      if (editingId) {
        await updatePresupuesto(editingId, payload);
        toast.success('Presupuesto actualizado');
      } else {
        await createPresupuesto(payload);
        toast.success('Presupuesto creado');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    setSubmitting(false);
  };

  const handleEdit = (p) => {
    setForm({ nombre: p.nombre, anio: p.anio, notas: p.notas || '' });
    setLineas((p.lineas || []).map(l => ({
      categoria_id: l.categoria_id || '',
      centro_costo_id: l.centro_costo_id || '',
      mes: l.mes,
      monto_presupuestado: l.monto_presupuestado || 0
    })));
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este presupuesto?')) return;
    try { await deletePresupuesto(id); toast.success('Eliminado'); loadData(); }
    catch (e) { toast.error('Error al eliminar'); }
  };

  const fmt = (v) => parseFloat(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="page-container" data-testid="presupuestos-page">
      <div className="page-header">
        <h1 className="page-title"><BarChart3 size={24} /> Presupuestos</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select className="form-input form-select" style={{ width: 120 }} value={anioFilter}
            onChange={e => setAnioFilter(e.target.value ? parseInt(e.target.value) : '')} data-testid="filter-anio">
            <option value="">Todos</option>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }} data-testid="nuevo-presupuesto-btn">
            <Plus size={18} /> Nuevo Presupuesto
          </button>
        </div>
      </div>

      {loading ? <p>Cargando...</p> : presupuestos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No hay presupuestos para {anioFilter || 'ningún año'}. Cree uno nuevo.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Nombre</th>
                <th>Año</th>
                <th>Versión</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Total Presupuestado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {presupuestos.map(p => {
                const totalPres = (p.lineas || []).reduce((s, l) => s + (l.monto_presupuestado || 0), 0);
                const isExpanded = expandedId === p.id;
                return (
                  <React.Fragment key={p.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : p.id)} data-testid={`pres-row-${p.id}`}>
                      <td>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                      <td>{p.anio}</td>
                      <td>v{p.version}</td>
                      <td><span className="badge" style={{ background: p.estado === 'borrador' ? '#FEF3C7' : '#D1FAE5', color: p.estado === 'borrador' ? '#92400E' : '#065F46', fontSize: '0.7rem' }}>{p.estado}</span></td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalPres)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="action-btn" onClick={() => handleEdit(p)} title="Editar" data-testid={`edit-pres-${p.id}`}><Edit2 size={15} /></button>
                          <button className="action-btn action-danger" onClick={() => handleDelete(p.id)} title="Eliminar" data-testid={`delete-pres-${p.id}`}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)' }}>
                          {(p.lineas || []).length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Sin líneas</p> : (
                            <table style={{ width: '100%', fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Categoría</th>
                                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Mes</th>
                                  <th style={{ textAlign: 'right', padding: '0.25rem' }}>Presupuestado</th>
                                  <th style={{ textAlign: 'right', padding: '0.25rem' }}>Real</th>
                                  <th style={{ textAlign: 'right', padding: '0.25rem' }}>Diferencia</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.lineas.map((l, i) => {
                                  const diff = (l.monto_presupuestado || 0) - (l.monto_real || 0);
                                  return (
                                    <tr key={i}>
                                      <td style={{ padding: '0.25rem' }}>{l.categoria_nombre || '-'}</td>
                                      <td style={{ padding: '0.25rem' }}>{MESES[l.mes - 1] || l.mes}</td>
                                      <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.25rem' }}>{fmt(l.monto_presupuestado)}</td>
                                      <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.25rem' }}>{fmt(l.monto_real)}</td>
                                      <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.25rem', color: diff >= 0 ? '#059669' : '#DC2626' }}>{fmt(diff)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 700, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Editar' : 'Nuevo'} Presupuesto</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label required">Nombre</label>
                  <input className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Presupuesto Operativo 2026" required data-testid="pres-nombre" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label required">Año</label>
                  <select className="form-input form-select" value={form.anio} onChange={e => setForm(p => ({ ...p, anio: e.target.value }))} data-testid="pres-anio">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <input className="form-input" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Opcional" />
              </div>

              <div style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Líneas del Presupuesto</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addAllMonths}>+ 12 Meses</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addLinea} data-testid="add-linea-btn">+ Línea</button>
                </div>
              </div>

              {lineas.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Sin líneas. Agregue al menos una.</p>
              ) : (
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '0.25rem' }}>Categoría</th>
                        <th style={{ textAlign: 'left', padding: '0.25rem' }}>C.Costo</th>
                        <th style={{ textAlign: 'center', padding: '0.25rem' }}>Mes</th>
                        <th style={{ textAlign: 'right', padding: '0.25rem' }}>Monto</th>
                        <th style={{ width: 30 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((l, i) => (
                        <tr key={i}>
                          <td style={{ padding: '0.2rem' }}>
                            <select className="form-input form-select" style={{ fontSize: '0.8rem', padding: '0.2rem' }} value={l.categoria_id}
                              onChange={e => updateLinea(i, 'categoria_id', e.target.value)}>
                              <option value="">-</option>
                              {categorias.filter(c => c.tipo === 'GASTO' || c.tipo === 'COSTO').map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                              {categorias.filter(c => c.tipo !== 'GASTO' && c.tipo !== 'COSTO').map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.2rem' }}>
                            <select className="form-input form-select" style={{ fontSize: '0.8rem', padding: '0.2rem' }} value={l.centro_costo_id}
                              onChange={e => updateLinea(i, 'centro_costo_id', e.target.value)}>
                              <option value="">-</option>
                              {centrosCosto.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo} {cc.nombre}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.2rem', textAlign: 'center' }}>
                            <select className="form-input form-select" style={{ fontSize: '0.8rem', padding: '0.2rem', width: 70 }} value={l.mes}
                              onChange={e => updateLinea(i, 'mes', parseInt(e.target.value))}>
                              {MESES.map((m, mi) => <option key={mi} value={mi + 1}>{m}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.2rem' }}>
                            <input type="number" step="0.01" className="form-input" style={{ fontSize: '0.8rem', padding: '0.2rem', textAlign: 'right', width: 100 }}
                              value={l.monto_presupuestado} onChange={e => updateLinea(i, 'monto_presupuestado', e.target.value)} />
                          </td>
                          <td><button type="button" onClick={() => removeLinea(i)} style={{ color: '#DC2626', border: 'none', background: 'none', cursor: 'pointer' }}><X size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="guardar-pres-btn">
                  {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Presupuestos;
