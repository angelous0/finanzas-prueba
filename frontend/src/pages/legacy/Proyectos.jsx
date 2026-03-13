import React, { useState, useEffect } from 'react';
import { getProyectos, createProyecto, updateProyecto, deleteProyecto, getMarcas, getLineasNegocio, getCentrosCosto } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Plus, Edit, Trash2, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';

const Proyectos = () => {
  const { empresaActual } = useEmpresa();
  const [proyectos, setProyectos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [centros, setCentros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: '', codigo: '', marca_id: '', linea_negocio_id: '', centro_costo_id: '', fecha_inicio: '', fecha_fin: '', presupuesto: '', estado: 'activo', notas: '' });

  const load = async () => {
    try {
      setLoading(true);
      const [pRes, mRes, lRes, cRes] = await Promise.all([getProyectos(), getMarcas(), getLineasNegocio(), getCentrosCosto()]);
      setProyectos(pRes.data); setMarcas(mRes.data); setLineas(lRes.data); setCentros(cRes.data);
    } catch { toast.error('Error al cargar datos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [empresaActual]);

  const openNew = () => { setEditing(null); setForm({ nombre: '', codigo: '', marca_id: '', linea_negocio_id: '', centro_costo_id: '', fecha_inicio: '', fecha_fin: '', presupuesto: '', estado: 'activo', notas: '' }); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ nombre: p.nombre, codigo: p.codigo || '', marca_id: p.marca_id || '', linea_negocio_id: p.linea_negocio_id || '', centro_costo_id: p.centro_costo_id || '', fecha_inicio: p.fecha_inicio || '', fecha_fin: p.fecha_fin || '', presupuesto: p.presupuesto || '', estado: p.estado || 'activo', notas: p.notas || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('Nombre es requerido'); return; }
    const payload = { ...form, marca_id: form.marca_id || null, linea_negocio_id: form.linea_negocio_id || null, centro_costo_id: form.centro_costo_id || null, presupuesto: parseFloat(form.presupuesto) || 0, fecha_inicio: form.fecha_inicio || null, fecha_fin: form.fecha_fin || null };
    try {
      if (editing) { await updateProyecto(editing.id, payload); toast.success('Proyecto actualizado'); }
      else { await createProyecto(payload); toast.success('Proyecto creado'); }
      setShowModal(false); load();
    } catch { toast.error('Error al guardar proyecto'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este proyecto?')) return;
    try { await deleteProyecto(id); toast.success('Proyecto eliminado'); load(); }
    catch { toast.error('Error al eliminar proyecto'); }
  };

  const estadoColor = { activo: { bg: '#d1fae5', color: '#065f46' }, cerrado: { bg: '#dbeafe', color: '#1e40af' }, cancelado: { bg: '#fee2e2', color: '#991b1b' } };

  return (
    <div data-testid="proyectos-page">
      <div className="page-header">
        <div><h1 className="page-title">Proyectos / Campanas</h1><p className="page-subtitle">Gestion de proyectos, campanas y colecciones</p></div>
        <button className="btn btn-primary" onClick={openNew} data-testid="nuevo-proyecto-btn"><Plus size={18} /> Nuevo Proyecto</button>
      </div>
      <div className="page-content">
        <div className="card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : proyectos.length === 0 ? (
              <div className="empty-state"><FolderKanban className="empty-state-icon" /><div className="empty-state-title">No hay proyectos</div><div className="empty-state-description">Registre campanas, colecciones o proyectos</div></div>
            ) : (
              <table className="data-table" data-testid="proyectos-table">
                <thead><tr><th>Nombre</th><th>Codigo</th><th>Marca</th><th>Linea</th><th>Centro Costo</th><th>Presupuesto</th><th>Estado</th><th className="text-center">Acciones</th></tr></thead>
                <tbody>
                  {proyectos.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                      <td>{p.codigo || '-'}</td>
                      <td>{p.marca_nombre || '-'}</td>
                      <td>{p.linea_nombre || '-'}</td>
                      <td>{p.cc_nombre || '-'}</td>
                      <td className="text-right">S/ {parseFloat(p.presupuesto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td><span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, backgroundColor: (estadoColor[p.estado] || estadoColor.activo).bg, color: (estadoColor[p.estado] || estadoColor.activo).color }}>{p.estado}</span></td>
                      <td className="text-center">
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(p)} title="Editar"><Edit size={14} /></button>
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDelete(p.id)} title="Eliminar" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
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
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header"><h2 className="modal-title">{editing ? 'Editar' : 'Nuevo'} Proyecto</h2><button className="modal-close" onClick={() => setShowModal(false)}>x</button></div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Nombre *</label><input type="text" className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} data-testid="proyecto-nombre-input" /></div>
                <div><label className="form-label">Codigo</label><input type="text" className="form-input" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} /></div>
                <div><label className="form-label">Estado</label><select className="form-select" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}><option value="activo">Activo</option><option value="cerrado">Cerrado</option><option value="cancelado">Cancelado</option></select></div>
                <div><label className="form-label">Marca</label><select className="form-select" value={form.marca_id} onChange={e => setForm({...form, marca_id: e.target.value ? parseInt(e.target.value) : ''})}><option value="">Sin marca</option>{marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
                <div><label className="form-label">Linea de Negocio</label><select className="form-select" value={form.linea_negocio_id} onChange={e => setForm({...form, linea_negocio_id: e.target.value ? parseInt(e.target.value) : ''})}><option value="">Sin linea</option>{lineas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}</select></div>
                <div><label className="form-label">Centro de Costo</label><select className="form-select" value={form.centro_costo_id} onChange={e => setForm({...form, centro_costo_id: e.target.value ? parseInt(e.target.value) : ''})}><option value="">Sin CC</option>{centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <div><label className="form-label">Presupuesto</label><input type="number" className="form-input" step="0.01" value={form.presupuesto} onChange={e => setForm({...form, presupuesto: e.target.value})} /></div>
                <div><label className="form-label">Fecha Inicio</label><input type="date" className="form-input" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} /></div>
                <div><label className="form-label">Fecha Fin</label><input type="date" className="form-input" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Notas</label><textarea className="form-input" rows="2" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proyectos;
