import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Tag, X, Check } from 'lucide-react';
import { getCategoriasGasto, createCategoriaGasto, updateCategoriaGasto, deleteCategoriaGasto } from '../services/api';
import { toast } from 'sonner';

export default function CategoriasGasto() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', codigo: '', descripcion: '' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCategoriasGasto();
      setCategorias(res.data);
    } catch (err) {
      toast.error('Error cargando categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setFormData({ nombre: '', codigo: '', descripcion: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) { toast.error('Nombre es requerido'); return; }
    try {
      if (editingId) {
        await updateCategoriaGasto(editingId, formData);
        toast.success('Categoría actualizada');
      } else {
        await createCategoriaGasto(formData);
        toast.success('Categoría creada');
      }
      resetForm();
      loadData();
    } catch (err) {
      toast.error('Error guardando categoría');
    }
  };

  const handleEdit = (cat) => {
    setFormData({ nombre: cat.nombre, codigo: cat.codigo || '', descripcion: cat.descripcion || '' });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar esta categoría?')) return;
    try {
      await deleteCategoriaGasto(id);
      toast.success('Categoría eliminada');
      loadData();
    } catch (err) {
      toast.error('Error eliminando');
    }
  };

  return (
    <div style={{ padding: '1.5rem' }} data-testid="categorias-gasto-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Categorías de Gasto</h1>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Clasificación del gasto: marketing, ventas, logística, planilla, etc.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { resetForm(); setShowForm(true); }}
          data-testid="add-categoria-gasto-btn"
        >
          <Plus size={16} /> Nueva Categoría
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 120px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '4px' }}>Código</label>
              <input
                className="form-input"
                placeholder="MKT"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                data-testid="categoria-gasto-codigo"
              />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '4px' }}>Nombre *</label>
              <input
                className="form-input"
                placeholder="Nombre de la categoría"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                data-testid="categoria-gasto-nombre"
              />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', display: 'block', marginBottom: '4px' }}>Descripción</label>
              <input
                className="form-input"
                placeholder="Descripción"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                data-testid="categoria-gasto-descripcion"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" data-testid="save-categoria-gasto-btn">
              <Check size={14} /> {editingId ? 'Actualizar' : 'Guardar'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={resetForm}>
              <X size={14} /> Cancelar
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Cargando...</p>
      ) : categorias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <Tag size={40} strokeWidth={1} />
          <p style={{ marginTop: '0.5rem' }}>No hay categorías. Crea la primera.</p>
        </div>
      ) : (
        <table className="data-table" data-testid="categorias-gasto-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(c => (
              <tr key={c.id}>
                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem' }}>{c.codigo || '-'}</td>
                <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>{c.descripcion || '-'}</td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
                    fontSize: '0.75rem', fontWeight: 500,
                    background: c.activo ? '#dcfce7' : '#fee2e2',
                    color: c.activo ? '#166534' : '#991b1b'
                  }}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="text-center">
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(c)} data-testid={`edit-cat-${c.id}`}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(c.id)} data-testid={`del-cat-${c.id}`}>
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
  );
}
