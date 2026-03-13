import React, { useState, useEffect } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria, getCuentasContables } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Plus, Trash2, Tags, X, Edit2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export const Categorias = () => {
  const { empresaActual } = useEmpresa();

  const [categorias, setCategorias] = useState([]);
  const [cuentasContables, setCuentasContables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'egreso',
    padre_id: null,
    descripcion: '',
    cuenta_gasto_id: null
  });

  useEffect(() => { loadData(); }, [filtroTipo, empresaActual]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getCategorias(filtroTipo || undefined);
      setCategorias(response.data);
      try { const cRes = await getCuentasContables(); setCuentasContables(cRes.data.filter(c => c.es_activa)); } catch {}
    } catch (error) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...formData, padre_id: formData.padre_id || null, cuenta_gasto_id: formData.cuenta_gasto_id || null };
      if (editingId) {
        await updateCategoria(editingId, payload);
        toast.success('Categoría actualizada');
      } else {
        await createCategoria(payload);
        toast.success('Categoría creada');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(editingId ? 'Error al actualizar' : 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({
      nombre: cat.nombre || '',
      tipo: cat.tipo || 'egreso',
      padre_id: cat.padre_id || null,
      descripcion: cat.descripcion || '',
      cuenta_gasto_id: cat.cuenta_gasto_id || null
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const hijos = categorias.filter(c => c.padre_id === id);
    if (hijos.length > 0) {
      toast.error('No se puede eliminar: tiene subcategorías');
      return;
    }
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    try {
      await deleteCategoria(id);
      toast.success('Categoría eliminada');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ nombre: '', tipo: 'egreso', padre_id: null, descripcion: '', cuenta_gasto_id: null });
  };

  const getNombrePadre = (padreId) => {
    const padre = categorias.find(c => c.id === padreId);
    return padre ? padre.nombre : '-';
  };

  // Build tree structure for visual display
  const padres = categorias.filter(c => !c.padre_id);
  const getHijos = (padreId) => categorias.filter(c => c.padre_id === padreId);
  // Categories without a parent that exists in list (orphans with padre_id pointing to deleted/other)
  const huerfanos = categorias.filter(c => c.padre_id && !categorias.find(p => p.id === c.padre_id));

  const renderRow = (cat, level = 0) => (
    <tr key={cat.id} data-testid={`categoria-row-${cat.id}`}>
      <td style={{ fontWeight: 500, paddingLeft: `${1 + level * 1.5}rem` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          {level > 0 && <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          {cat.nombre}
        </span>
      </td>
      <td>
        <span className={`badge ${cat.tipo === 'ingreso' ? 'badge-success' : 'badge-error'}`}>
          {cat.tipo}
        </span>
      </td>
      <td style={{ color: cat.padre_id ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {cat.padre_id ? getNombrePadre(cat.padre_id) : '-'}
      </td>
      <td>{cat.descripcion || '-'}</td>
      <td className="text-center">
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
          <button
            data-testid={`edit-categoria-${cat.id}`}
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => handleEdit(cat)}
            title="Editar"
          >
            <Edit2 size={14} />
          </button>
          <button 
            data-testid={`delete-categoria-${cat.id}`}
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => handleDelete(cat.id)}
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div data-testid="categorias-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">{categorias.length} categorías</p>
        </div>
        <button 
          data-testid="new-categoria-btn"
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowModal(true); }}
        >
          <Plus size={18} />
          Nueva Categoría
        </button>
      </div>

      <div className="page-content">
        <div className="filters-bar">
          <select 
            data-testid="filter-tipo"
            className="form-input form-select filter-input"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
        </div>

        <div className="card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : categorias.length === 0 ? (
              <div className="empty-state">
                <Tags className="empty-state-icon" />
                <div className="empty-state-title">No hay categorías</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Categoría Padre</th>
                    <th>Descripción</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {padres.map((padre) => (
                    <React.Fragment key={padre.id}>
                      {renderRow(padre, 0)}
                      {getHijos(padre.id).map((hijo) => renderRow(hijo, 1))}
                    </React.Fragment>
                  ))}
                  {huerfanos.map((cat) => renderRow(cat, 0))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Nombre</label>
                  <input
                    data-testid="categoria-nombre-input"
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label required">Tipo</label>
                    <select
                      data-testid="categoria-tipo-select"
                      className="form-input form-select"
                      value={formData.tipo}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                    >
                      <option value="egreso">Egreso</option>
                      <option value="ingreso">Ingreso</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Categoría Padre</label>
                    <select
                      data-testid="categoria-padre-select"
                      className="form-input form-select"
                      value={formData.padre_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, padre_id: e.target.value ? parseInt(e.target.value) : null }))}
                    >
                      <option value="">Sin padre (raíz)</option>
                      {categorias
                        .filter(c => !c.padre_id && c.id !== editingId)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    data-testid="categoria-descripcion-input"
                    className="form-input"
                    rows={2}
                    value={formData.descripcion}
                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
                {formData.tipo === 'egreso' && cuentasContables.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Cuenta de Gasto (para export)</label>
                    <select className="form-input form-select"
                      value={formData.cuenta_gasto_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, cuenta_gasto_id: e.target.value ? parseInt(e.target.value) : null }))}
                      data-testid="categoria-cuenta-gasto">
                      <option value="">-- Usar default empresa --</option>
                      {cuentasContables.map(c => (
                        <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button data-testid="submit-categoria-btn" type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : (editingId ? 'Guardar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categorias;
