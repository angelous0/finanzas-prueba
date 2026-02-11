import React, { useState, useEffect } from 'react';
import { getCuentasContables, createCuentaContable, updateCuentaContable, deleteCuentaContable, seedCuentasPeru } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Plus, Trash2, BookOpen, X, Edit, Search, Download } from 'lucide-react';
import { toast } from 'sonner';

const TIPOS_CUENTA = ['ACTIVO', 'PASIVO', 'GASTO', 'INGRESO', 'IMPUESTO', 'OTRO'];

export const CuentasContables = () => {
  const { empresaActual } = useEmpresa();
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [formData, setFormData] = useState({ codigo: '', nombre: '', tipo: 'GASTO', es_activa: true });

  useEffect(() => { loadData(); }, [empresaActual]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getCuentasContables();
      setCuentas(response.data);
    } catch (error) {
      toast.error('Error al cargar cuentas contables');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await updateCuentaContable(editingId, formData);
        toast.success('Cuenta actualizada');
      } else {
        await createCuentaContable(formData);
        toast.success('Cuenta creada');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al guardar';
      toast.error(typeof msg === 'string' ? msg : 'Error al guardar cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cuenta) => {
    setFormData({ codigo: cuenta.codigo, nombre: cuenta.nombre, tipo: cuenta.tipo, es_activa: cuenta.es_activa });
    setEditingId(cuenta.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta cuenta contable?')) return;
    try {
      await deleteCuentaContable(id);
      toast.success('Cuenta eliminada');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar. Puede estar en uso.');
    }
  };

  const resetForm = () => {
    setFormData({ codigo: '', nombre: '', tipo: 'GASTO', es_activa: true });
    setEditingId(null);
  };

  const handleSeedPeru = async () => {
    if (!window.confirm('¿Poblar plan de cuentas mínimo Perú?\nSe insertarán cuentas que no existan y se configurarán los defaults contables.')) return;
    setSeeding(true);
    try {
      const res = await seedCuentasPeru();
      toast.success(res.data.message);
      loadData();
    } catch (error) {
      toast.error('Error al ejecutar seed');
    } finally {
      setSeeding(false);
    }
  };

  const cuentasFiltradas = cuentas.filter(c => {
    const matchTexto = !filtro || c.codigo.toLowerCase().includes(filtro.toLowerCase()) || c.nombre.toLowerCase().includes(filtro.toLowerCase());
    const matchTipo = !filtroTipo || c.tipo === filtroTipo;
    return matchTexto && matchTipo;
  });

  const tipoBadge = (tipo) => {
    const colors = { ACTIVO: '#3B82F6', PASIVO: '#EF4444', GASTO: '#F59E0B', INGRESO: '#22C55E', IMPUESTO: '#8B5CF6', OTRO: '#64748b' };
    return { background: `${colors[tipo] || '#64748b'}18`, color: colors[tipo] || '#64748b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 };
  };

  return (
    <div data-testid="cuentas-contables-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Plan de Cuentas</h1>
          <p className="page-subtitle">{cuentas.length} cuentas</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }} data-testid="nueva-cuenta-btn">
          <Plus size={18} /> Nueva Cuenta
        </button>
      </div>

      <div className="page-content">
        <div className="card">
          <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" className="form-input" placeholder="Buscar código o nombre..." value={filtro}
                onChange={(e) => setFiltro(e.target.value)} style={{ paddingLeft: '32px' }} data-testid="filtro-cuenta" />
            </div>
            <select className="form-input form-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ maxWidth: '180px' }} data-testid="filtro-tipo-cuenta">
              <option value="">Todos los tipos</option>
              {TIPOS_CUENTA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : cuentasFiltradas.length === 0 ? (
              <div className="empty-state">
                <BookOpen className="empty-state-icon" />
                <div className="empty-state-title">No hay cuentas contables</div>
                <div className="empty-state-description">Crea tu primera cuenta para el plan contable</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th className="text-center">Activa</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasFiltradas.map((cuenta) => (
                    <tr key={cuenta.id} style={{ opacity: cuenta.es_activa ? 1 : 0.5 }}>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{cuenta.codigo}</td>
                      <td>{cuenta.nombre}</td>
                      <td><span style={tipoBadge(cuenta.tipo)}>{cuenta.tipo}</span></td>
                      <td className="text-center">{cuenta.es_activa ? 'Sí' : 'No'}</td>
                      <td className="text-center" style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleEdit(cuenta)} title="Editar"
                          data-testid={`edit-cuenta-${cuenta.id}`}><Edit size={14} /></button>
                        <button className="btn btn-outline btn-sm btn-icon" onClick={() => handleDelete(cuenta.id)} title="Eliminar"
                          data-testid={`delete-cuenta-${cuenta.id}`}><Trash2 size={14} /></button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Editar' : 'Nueva'} Cuenta Contable</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Código</label>
                    <input type="text" className="form-input" value={formData.codigo}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                      placeholder="6011" required data-testid="cuenta-codigo-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Tipo</label>
                    <select className="form-input form-select" value={formData.tipo}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))} data-testid="cuenta-tipo-select">
                      {TIPOS_CUENTA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Nombre</label>
                  <input type="text" className="form-input" value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    required data-testid="cuenta-nombre-input" />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.es_activa}
                      onChange={(e) => setFormData(prev => ({ ...prev, es_activa: e.target.checked }))} />
                    Cuenta activa
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} data-testid="guardar-cuenta-btn">
                  {submitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuentasContables;
