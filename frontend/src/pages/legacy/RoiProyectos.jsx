import React, { useState, useEffect, useCallback } from 'react';
import { getRoiProyectos } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { toast } from 'sonner';
import { RefreshCw, TrendingUp, DollarSign, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, Cell, ReferenceLine
} from 'recharts';

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '0.78rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{d?.proyecto}</div>
      <div>Inversion: <strong style={{ color: '#EF4444' }}>{fmt(d?.inversion)}</strong></div>
      <div>Retorno: <strong style={{ color: '#22C55E' }}>{fmt(d?.retorno)}</strong></div>
      <div>Utilidad: <strong style={{ color: d?.utilidad >= 0 ? '#1B4D3E' : '#EF4444' }}>{fmt(d?.utilidad)}</strong></div>
      <div>ROI: <strong style={{ color: d?.roi_pct >= 0 ? '#22C55E' : '#EF4444' }}>{d?.roi_pct}%</strong></div>
    </div>
  );
};

export default function RoiProyectos() {
  const { empresaActual } = useEmpresa();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const hoy = new Date();
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
  const [fechaDesde, setFechaDesde] = useState(inicioAnio.toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split('T')[0]);

  const loadData = useCallback(async () => {
    if (!empresaActual) return;
    setLoading(true);
    try {
      const res = await getRoiProyectos({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar ROI');
    } finally {
      setLoading(false);
    }
  }, [empresaActual, fechaDesde, fechaHasta]);

  useEffect(() => { loadData(); }, [loadData]);

  const items = data?.data || [];
  const totales = data?.totales || {};

  return (
    <div data-testid="roi-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">ROI por Proyecto</h1>
          <p className="page-subtitle">Retorno sobre la inversion por proyecto</p>
        </div>
        <button className="btn btn-primary" onClick={loadData} disabled={loading} data-testid="refresh-roi-btn">
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="page-content">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)} data-testid="roi-fecha-desde" />
          </div>
          <div>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)} data-testid="roi-fecha-hasta" />
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-inversion-total">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Inversion Total</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#EF4444', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.inversion)}</div>
              </div>
              <DollarSign size={24} color="#EF4444" />
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-retorno-total">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Retorno Total</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#22C55E', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.retorno)}</div>
              </div>
              <TrendingUp size={24} color="#22C55E" />
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-utilidad-total">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Utilidad Neta</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: totales.utilidad >= 0 ? '#1B4D3E' : '#EF4444', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.utilidad)}</div>
              </div>
              <DollarSign size={24} color={totales.utilidad >= 0 ? '#1B4D3E' : '#EF4444'} />
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-roi-total">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>ROI Global</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: totales.roi_pct >= 0 ? '#22C55E' : '#EF4444', fontFamily: "'Manrope', sans-serif" }}>{totales.roi_pct || 0}%</div>
              </div>
              <Target size={24} color="#3B82F6" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="card" style={{ marginBottom: '1.5rem' }} data-testid="roi-chart">
          <div className="card-header"><h3 className="card-title">ROI por Proyecto</h3></div>
          <div className="card-content" style={{ height: 320 }}>
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : items.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                No hay proyectos con datos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={items} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="proyecto" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine x={0} stroke="#94A3B8" />
                  <Bar dataKey="roi_pct" name="ROI %" radius={[0, 4, 4, 0]}>
                    {items.map((entry, i) => (
                      <Cell key={i} fill={entry.roi_pct >= 0 ? '#22C55E' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card" data-testid="roi-table-card">
          <div className="card-header"><h3 className="card-title">Detalle de ROI</h3></div>
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : items.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Target size={40} style={{ color: '#d1d5db' }} />
                <div className="empty-state-title">No hay proyectos</div>
              </div>
            ) : (
              <table className="data-table" data-testid="roi-table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th className="text-right">Inversion</th>
                    <th className="text-right">Retorno</th>
                    <th className="text-right">Utilidad</th>
                    <th className="text-right">ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{r.proyecto}</td>
                      <td className="text-right" style={{ color: '#EF4444' }}>{fmt(r.inversion)}</td>
                      <td className="text-right" style={{ color: '#22C55E' }}>{fmt(r.retorno)}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: r.utilidad >= 0 ? '#1B4D3E' : '#EF4444' }}>{fmt(r.utilidad)}</td>
                      <td className="text-right">
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 700,
                          background: r.roi_pct > 0 ? '#D1FAE5' : r.roi_pct === 0 ? '#FEF3C7' : '#FEE2E2',
                          color: r.roi_pct > 0 ? '#065F46' : r.roi_pct === 0 ? '#92400E' : '#991B1B',
                        }}>
                          {r.roi_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                    <td>TOTAL</td>
                    <td className="text-right" style={{ color: '#EF4444' }}>{fmt(totales.inversion)}</td>
                    <td className="text-right" style={{ color: '#22C55E' }}>{fmt(totales.retorno)}</td>
                    <td className="text-right" style={{ color: totales.utilidad >= 0 ? '#1B4D3E' : '#EF4444' }}>{fmt(totales.utilidad)}</td>
                    <td className="text-right">
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 700,
                        background: totales.roi_pct > 0 ? '#D1FAE5' : '#FEF3C7',
                        color: totales.roi_pct > 0 ? '#065F46' : '#92400E',
                      }}>
                        {totales.roi_pct || 0}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
