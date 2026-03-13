import React, { useState, useEffect } from 'react';
import { 
  getEmpleados, createTercero, updateTercero, deleteTercero,
  getAdelantos, createAdelanto, getCuentasFinancieras,
  getCentrosCosto, getLineasNegocio, saveEmpleadoDetalle
} from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Plus, Edit2, Trash2, Users, X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value, symbol = 'S/') => {
  return `${symbol} ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-PE');
};

export const Empleados = () => {
  const { empresaActual } = useEmpresa();

  const [empleados, setEmpleados] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [lineasNegocio, setLineasNegocio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo_documento: 'DNI',
    numero_documento: '',
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    es_personal: true,
    // Detalle fields
    cargo: '',
    salario_base: '',
    cuenta_bancaria: '',
    banco: '',
    centro_costo_id: '',
    linea_negocio_id: '',
    fecha_ingreso: ''
  });

  useEffect(() => {
    loadData();
    loadMasterData();
  }, [empresaActual]);

  const loadMasterData = async () => {
    try {
      const [ccRes, lnRes] = await Promise.all([getCentrosCosto(), getLineasNegocio()]);
      setCentrosCosto(ccRes.data);
      setLineasNegocio(lnRes.data);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getEmpleados();
      setEmpleados(response.data);
    } catch (error) {
      console.error('Error loading empleados:', error);
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const terceroData = {
        tipo_documento: formData.tipo_documento,
        numero_documento: formData.numero_documento,
        nombre: formData.nombre,
        direccion: formData.direccion,
        telefono: formData.telefono,
        email: formData.email,
        es_personal: true
      };
      
      let terceroId = editingId;
      if (editingId) {
        await updateTercero(editingId, terceroData);
      } else {
        const res = await createTercero(terceroData);
        terceroId = res.data.id;
      }
      
      // Save detalle (centro_costo, linea_negocio, cargo, etc.)
      await saveEmpleadoDetalle(terceroId, {
        tercero_id: terceroId,
        cargo: formData.cargo || null,
        salario_base: formData.salario_base ? parseFloat(formData.salario_base) : null,
        cuenta_bancaria: formData.cuenta_bancaria || null,
        banco: formData.banco || null,
        centro_costo_id: formData.centro_costo_id ? parseInt(formData.centro_costo_id) : null,
        linea_negocio_id: formData.linea_negocio_id ? parseInt(formData.linea_negocio_id) : null,
        fecha_ingreso: formData.fecha_ingreso || null
      });
      
      toast.success(editingId ? 'Empleado actualizado' : 'Empleado creado');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar empleado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (empleado) => {
    setFormData({
      tipo_documento: empleado.tipo_documento || 'DNI',
      numero_documento: empleado.numero_documento || '',
      nombre: empleado.nombre,
      direccion: empleado.direccion || '',
      telefono: empleado.telefono || '',
      email: empleado.email || '',
      es_personal: true,
      cargo: empleado.cargo || '',
      salario_base: empleado.salario_base || '',
      cuenta_bancaria: empleado.cuenta_bancaria || '',
      banco: empleado.banco || '',
      centro_costo_id: empleado.centro_costo_id || '',
      linea_negocio_id: empleado.linea_negocio_id || '',
      fecha_ingreso: empleado.fecha_ingreso ? empleado.fecha_ingreso.split('T')[0] : ''
    });
    setEditingId(empleado.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este empleado?')) return;
    try {
      await deleteTercero(id);
      toast.success('Empleado eliminado');
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar empleado');
    }
  };

  const resetForm = () => {
    setFormData({
      tipo_documento: 'DNI',
      numero_documento: '',
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      es_personal: true,
      cargo: '',
      salario_base: '',
      cuenta_bancaria: '',
      banco: '',
      centro_costo_id: '',
      linea_negocio_id: '',
      fecha_ingreso: ''
    });
    setEditingId(null);
  };

  return (
    <div data-testid="empleados-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Empleados</h1>
          <p className="page-subtitle">{empleados.length} empleados registrados</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowModal(true); }}
          data-testid="nuevo-empleado-btn"
        >
          <Plus size={18} />
          Nuevo Empleado
        </button>
      </div>

      <div className="page-content">
        <div className="card">
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
              </div>
            ) : empleados.length === 0 ? (
              <div className="empty-state">
                <Users className="empty-state-icon" />
                <div className="empty-state-title">No hay empleados</div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  <Plus size={18} />
                  Agregar empleado
                </button>
              </div>
            ) : (
              <table className="data-table" data-testid="empleados-table">
                <thead>
                  <tr>
                    <th>DNI</th>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th>Centro Costo</th>
                    <th>Línea Negocio</th>
                    <th>Teléfono</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {empleados.map((empleado) => (
                    <tr key={empleado.id}>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {empleado.numero_documento || '-'}
                      </td>
                      <td style={{ fontWeight: 500 }}>{empleado.nombre}</td>
                      <td>{empleado.cargo || '-'}</td>
                      <td>{empleado.centro_costo_nombre || '-'}</td>
                      <td>{empleado.linea_negocio_nombre || '-'}</td>
                      <td>{empleado.telefono || '-'}</td>
                      <td className="text-center">
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-outline btn-sm btn-icon"
                            onClick={() => handleEdit(empleado)}
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-outline btn-sm btn-icon"
                            onClick={() => handleDelete(empleado.id)}
                            title="Eliminar"
                          >
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
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo Doc.</label>
                    <select
                      className="form-input form-select"
                      value={formData.tipo_documento}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_documento: e.target.value }))}
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">CE</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label required">Número</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.numero_documento}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero_documento: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Nombre Completo</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.telefono}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Detalle Laboral */}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalle Laboral</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Cargo</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.cargo}
                        onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                        data-testid="empleado-cargo"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha Ingreso</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.fecha_ingreso}
                        onChange={(e) => setFormData(prev => ({ ...prev, fecha_ingreso: e.target.value }))}
                        data-testid="empleado-fecha-ingreso"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Centro de Costo</label>
                      <select
                        className="form-input form-select"
                        value={formData.centro_costo_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, centro_costo_id: e.target.value }))}
                        data-testid="empleado-centro-costo"
                      >
                        <option value="">-- Sin asignar --</option>
                        {centrosCosto.map(cc => (
                          <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Línea de Negocio</label>
                      <select
                        className="form-input form-select"
                        value={formData.linea_negocio_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, linea_negocio_id: e.target.value }))}
                        data-testid="empleado-linea-negocio"
                      >
                        <option value="">-- Sin asignar --</option>
                        {lineasNegocio.map(ln => (
                          <option key={ln.id} value={ln.id}>{ln.codigo} - {ln.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Salario Base</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={formData.salario_base}
                        onChange={(e) => setFormData(prev => ({ ...prev, salario_base: e.target.value }))}
                        data-testid="empleado-salario"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Banco</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.banco}
                        onChange={(e) => setFormData(prev => ({ ...prev, banco: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cuenta Bancaria</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.cuenta_bancaria}
                        onChange={(e) => setFormData(prev => ({ ...prev, cuenta_bancaria: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Empleados;
