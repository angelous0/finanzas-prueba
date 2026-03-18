import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Tag, X, Check } from 'lucide-react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/api';
import { toast } from 'sonner';

export default function CategoriasGasto() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', tipo: 'egreso' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCategorias('egreso');
      setCategorias(res.data);
    } catch {
      toast.error('Error cargando categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setFormData({ nombre: '', tipo: 'egreso' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) { toast.error('Nombre es requerido'); return; }
    try {
      if (editingId) {
        await updateCategoria(editingId, formData);
        toast.success('Categoria actualizada');
      } else {
        await createCategoria(formData);
        toast.success('Categoria creada');
      }
      resetForm();
      loadData();
    } catch {
      toast.error('Error guardando categoria');
    }
  };

  const handleEdit = (cat) => {
    setFormData({ nombre: cat.nombre, tipo: cat.tipo || 'gasto' });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar esta categoria?')) return;
    try {
      await deleteCategoria(id);
      toast.success('Categoria eliminada');
      loadData();
    } catch {
      toast.error('Error eliminando categoria');
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px' }} data-testid="categorias-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Categorias</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0' }}>Categorias para lineas de detalle de gastos</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }} data-testid="add-categoria-btn">
          <Plus size={14} /> Nueva Categoria
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Nombre</label>
            <input className="form-input" value={formData.nombre} onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Telas, Avios, Servicios..." autoFocus data-testid="categoria-nombre-input" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" data-testid="categoria-save-btn"><Check size={14} /> {editingId ? 'Actualizar' : 'Crear'}</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={resetForm}><X size={14} /></button>
        </form>
      )}

      {loading ? (
        <div className="loading"><div className="loading-spinner"></div></div>
      ) : categorias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Tag size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No hay categorias. Crea la primera.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }} data-testid="categorias-table">
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.5rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>#</th>
                <th style={{ padding: '0.5rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Nombre</th>
                <th style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat, i) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.5rem 1rem', color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ padding: '0.5rem 1rem', fontWeight: 600, color: '#1e293b' }}>{cat.nombre}</td>
                  <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(cat)} style={{ marginRight: '0.25rem' }} data-testid={`edit-cat-${cat.id}`}><Pencil size={14} /></button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(cat.id)} style={{ color: '#ef4444' }} data-testid={`delete-cat-${cat.id}`}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
