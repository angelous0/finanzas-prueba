import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { getTerceros, createTercero, updateTercero, deleteTercero } from '../services/api';
import { toast } from 'sonner';

const EMPTY = { nombre: '', tipo_documento: 'RUC', numero_documento: '', telefono: '', email: '', direccion: '', notas: '' };

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTerceros({ es_proveedor: true, search: search || undefined });
      setProveedores(res.data);
    } catch { toast.error('Error cargando proveedores'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ nombre: p.nombre || '', tipo_documento: p.tipo_documento || 'RUC', numero_documento: p.numero_documento || '', telefono: p.telefono || '', email: p.email || '', direccion: p.direccion || '', notas: p.notas || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error('Nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = { ...form, es_proveedor: true, es_cliente: false, es_personal: false, activo: true };
      if (editing) {
        await updateTercero(editing.id, payload);
        toast.success('Proveedor actualizado');
      } else {
        await createTercero(payload);
        toast.success('Proveedor creado');
      }
      setShowModal(false);
      load();
    } catch { toast.error('Error guardando'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Desactivar "${p.nombre}"?`)) return;
    try { await deleteTercero(p.id); toast.success('Proveedor desactivado'); load(); }
    catch { toast.error('Error'); }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px' }} data-testid="proveedores-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Proveedores</h1>
        <button className="btn btn-primary btn-sm" onClick={openNew} data-testid="nuevo-proveedor-btn">
          <Plus size={16} /> Nuevo Proveedor
        </button>
      </div>

      <div style={{ marginBottom: '1rem', position: 'relative', maxWidth: '320px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input type="text" className="form-input" placeholder="Buscar por nombre o RUC..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }} data-testid="proveedor-search" />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Cargando...</div>
      ) : proveedores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <p>No hay proveedores registrados</p>
          <button className="btn btn-primary btn-sm" onClick={openNew} style={{ marginTop: '0.5rem' }}>
            <Plus size={14} /> Registrar proveedor
          </button>
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table className="data-table" style={{ fontSize: '0.8125rem' }} data-testid="proveedores-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUC / Doc.</th>
                <th>Telefono</th>
                <th>Email</th>
                <th style={{ width: '80px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                  <td>{p.numero_documento ? `${p.tipo_documento || ''} ${p.numero_documento}` : '-'}</td>
                  <td>{p.telefono || '-'}</td>
                  <td>{p.email || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="action-btn" onClick={() => openEdit(p)} title="Editar" style={{ width: '28px', height: '28px' }}>
                        <Pencil size={13} />
                      </button>
                      <button className="action-btn action-danger" onClick={() => handleDelete(p)} title="Desactivar" style={{ width: '28px', height: '28px' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre / Razon Social *</label>
                  <input type="text" className="form-input" value={form.nombre} autoFocus
                    onChange={e => setForm({ ...form, nombre: e.target.value })} required data-testid="prov-nombre" />
                </div>
                <div className="form-grid form-grid-2" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo Doc.</label>
                    <select className="form-input form-select" value={form.tipo_documento}
                      onChange={e => setForm({ ...form, tipo_documento: e.target.value })}>
                      <option value="RUC">RUC</option>
                      <option value="DNI">DNI</option>
                      <option value="CE">CE</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">N Documento (RUC)</label>
                    <input type="text" className="form-input" value={form.numero_documento}
                      onChange={e => setForm({ ...form, numero_documento: e.target.value })}
                      placeholder="20123456789" data-testid="prov-ruc" />
                  </div>
                </div>
                <div className="form-grid form-grid-2" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Telefono</label>
                    <input type="text" className="form-input" value={form.telefono}
                      onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="987654321" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contacto@empresa.com" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Direccion</label>
                  <input type="text" className="form-input" value={form.direccion}
                    onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Opcional" />
                </div>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Notas</label>
                  <textarea className="form-input" rows={2} value={form.notas}
                    onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Opcional" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (editing ? 'Guardar' : 'Crear Proveedor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
