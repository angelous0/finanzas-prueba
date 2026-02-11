import React, { useState, useEffect, useCallback } from 'react';
import { getAsientos, getAsiento, postearAsiento, anularAsiento, getCuentasContables, getTerceros } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { BookOpen, Check, X, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const ESTADO_COLORS = {
  borrador: { bg: '#FEF3C7', text: '#92400E', label: 'Borrador' },
  posteado: { bg: '#D1FAE5', text: '#065F46', label: 'Posteado' },
  anulado:  { bg: '#FEE2E2', text: '#991B1B', label: 'Anulado' },
};
const ORIGEN_LABELS = { FPROV: 'Factura', GASTO: 'Gasto', PAGO: 'Pago', AJUSTE: 'Ajuste' };

const Asientos = () => {
  const { empresaId } = useEmpresa();
  const [asientos, setAsientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ desde: '', hasta: '', estado: '', origen_tipo: '' });

  const loadData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const params = {};
      if (filters.desde) params.desde = filters.desde;
      if (filters.hasta) params.hasta = filters.hasta;
      if (filters.estado) params.estado = filters.estado;
      if (filters.origen_tipo) params.origen_tipo = filters.origen_tipo;
      const res = await getAsientos(params);
      setAsientos(res.data);
    } catch (e) { toast.error('Error cargando asientos'); }
    setLoading(false);
  }, [empresaId, filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    try {
      const res = await getAsiento(id);
      setDetail(res.data);
      setExpandedId(id);
    } catch (e) { toast.error('Error cargando detalle'); }
  };

  const handlePostear = async (id) => {
    if (!window.confirm('¿Postear este asiento? No podrá editarse después.')) return;
    try { await postearAsiento(id); toast.success('Asiento posteado'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const handleAnular = async (id) => {
    if (!window.confirm('¿Anular este asiento?')) return;
    try { await anularAsiento(id); toast.success('Asiento anulado'); loadData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const fmt = (v) => v != null ? parseFloat(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  return (
    <div className="page-container" data-testid="asientos-page">
      <div className="page-header">
        <h1 className="page-title"><BookOpen size={24} /> Asientos Contables</h1>
      </div>

      <div className="form-row" style={{ marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input type="date" className="form-input" style={{ maxWidth: 160 }} placeholder="Desde"
          value={filters.desde} onChange={e => setFilters(p => ({ ...p, desde: e.target.value }))} data-testid="filter-desde" />
        <input type="date" className="form-input" style={{ maxWidth: 160 }} placeholder="Hasta"
          value={filters.hasta} onChange={e => setFilters(p => ({ ...p, hasta: e.target.value }))} data-testid="filter-hasta" />
        <select className="form-input form-select" style={{ maxWidth: 140 }}
          value={filters.estado} onChange={e => setFilters(p => ({ ...p, estado: e.target.value }))} data-testid="filter-estado">
          <option value="">Todo estado</option>
          <option value="borrador">Borrador</option>
          <option value="posteado">Posteado</option>
          <option value="anulado">Anulado</option>
        </select>
        <select className="form-input form-select" style={{ maxWidth: 140 }}
          value={filters.origen_tipo} onChange={e => setFilters(p => ({ ...p, origen_tipo: e.target.value }))} data-testid="filter-origen">
          <option value="">Todo origen</option>
          <option value="FPROV">Factura</option>
          <option value="GASTO">Gasto</option>
          <option value="PAGO">Pago</option>
        </select>
      </div>

      {loading ? <p>Cargando...</p> : asientos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No hay asientos contables. Genere asientos desde facturas, gastos o pagos.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Fecha</th>
                <th>Origen</th>
                <th>Nº Doc</th>
                <th>Glosa</th>
                <th>Moneda</th>
                <th style={{ textAlign: 'right' }}>Debe</th>
                <th style={{ textAlign: 'right' }}>Haber</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asientos.map(a => {
                const est = ESTADO_COLORS[a.estado] || ESTADO_COLORS.borrador;
                const isExpanded = expandedId === a.id;
                return (
                  <React.Fragment key={a.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(a.id)} data-testid={`asiento-row-${a.id}`}>
                      <td>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                      <td>{a.fecha_contable}</td>
                      <td><span className="badge" style={{ background: '#E0E7FF', color: '#3730A3', fontSize: '0.7rem' }}>{ORIGEN_LABELS[a.origen_tipo] || a.origen_tipo}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{a.origen_numero}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.glosa}</td>
                      <td>{a.moneda === 'USD' ? 'USD' : 'PEN'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.total_debe)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.total_haber)}</td>
                      <td><span className="badge" style={{ background: est.bg, color: est.text, fontSize: '0.7rem' }}>{est.label}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {a.estado === 'borrador' && (
                            <button className="btn btn-sm btn-primary" onClick={() => handlePostear(a.id)} title="Postear" data-testid={`postear-${a.id}`}>
                              <Check size={14} />
                            </button>
                          )}
                          {a.estado !== 'anulado' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleAnular(a.id)} title="Anular" data-testid={`anular-${a.id}`}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && detail && detail.id === a.id && (
                      <tr>
                        <td colSpan={10} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)' }}>
                          <table style={{ width: '100%', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Cuenta</th>
                                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Nombre</th>
                                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Tercero</th>
                                <th style={{ textAlign: 'right', padding: '0.25rem' }}>Debe</th>
                                <th style={{ textAlign: 'right', padding: '0.25rem' }}>Haber</th>
                                <th style={{ textAlign: 'left', padding: '0.25rem' }}>Glosa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.lineas.map((l, i) => (
                                <tr key={i}>
                                  <td style={{ fontFamily: 'monospace', padding: '0.25rem' }}>{l.cuenta_codigo}</td>
                                  <td style={{ padding: '0.25rem' }}>{l.cuenta_nombre}</td>
                                  <td style={{ padding: '0.25rem', color: 'var(--text-secondary)' }}>{l.tercero_nombre || ''}</td>
                                  <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.25rem', color: parseFloat(l.debe) > 0 ? '#059669' : 'var(--text-secondary)' }}>{fmt(l.debe)}</td>
                                  <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.25rem', color: parseFloat(l.haber) > 0 ? '#DC2626' : 'var(--text-secondary)' }}>{fmt(l.haber)}</td>
                                  <td style={{ padding: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l.glosa}</td>
                                </tr>
                              ))}
                              <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 'bold' }}>
                                <td colSpan={3} style={{ padding: '0.25rem' }}>TOTAL</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.25rem' }}>{fmt(detail.total_debe)}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '0.25rem' }}>{fmt(detail.total_haber)}</td>
                                <td></td>
                              </tr>
                            </tbody>
                          </table>
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
    </div>
  );
};

export default Asientos;
