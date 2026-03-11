import React, { useState, useEffect, useCallback } from 'react';
import { getRentabilidad } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, Percent, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, Cell
} from 'recharts';

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (v) => `S/ ${(v / 1000).toFixed(1)}k`;

const DIMENSION_LABELS = {
  marca: 'Marca', linea_negocio: 'Linea de Negocio',
  centro_costo: 'Centro de Costo', proyecto: 'Proyecto'
};

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '0.78rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{d?.dimension}</div>
      <div>Ingreso: <strong style={{ color: '#22C55E' }}>{fmt(d?.ingreso)}</strong></div>
      <div>Gasto: <strong style={{ color: '#EF4444' }}>{fmt(d?.gasto)}</strong></div>
      <div>Utilidad: <strong style={{ color: d?.utilidad >= 0 ? '#1B4D3E' : '#EF4444' }}>{fmt(d?.utilidad)}</strong></div>
      <div>Margen: <strong>{d?.margen_pct}%</strong></div>
    </div>
  );
};

export default function Rentabilidad() {
  const { empresaActual } = useEmpresa();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const [fechaDesde, setFechaDesde] = useState(inicioMes.toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split('T')[0]);
  const [dimension, setDimension] = useState('marca');

  const loadData = useCallback(async () => {
    if (!empresaActual || !fechaDesde || !fechaHasta) return;
    setLoading(true);
    try {
      const res = await getRentabilidad({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, dimension });
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar rentabilidad');
    } finally {
      setLoading(false);
    }
  }, [empresaActual, fechaDesde, fechaHasta, dimension]);

  useEffect(() => { loadData(); }, [loadData]);

  const items = data?.data || [];
  const totales = data?.totales || {};

  return (
    <div data-testid="rentabilidad-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Rentabilidad</h1>
          <p className="page-subtitle">Ingreso vs Gasto por {DIMENSION_LABELS[dimension]}</p>
        </div>
        <button className="btn btn-primary" onClick={loadData} disabled={loading} data-testid="refresh-rentabilidad-btn">
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="page-content">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)} data-testid="rent-fecha-desde" />
          </div>
          <div>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)} data-testid="rent-fecha-hasta" />
          </div>
          <div>
            <label className="form-label">Dimension</label>
            <select className="form-input" value={dimension}
              onChange={e => setDimension(e.target.value)} data-testid="rent-dimension">
              {Object.entries(DIMENSION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-ingreso-total">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Ingreso Total</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#22C55E', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.ingreso)}</div>
              </div>
              <TrendingUp size={24} color="#22C55E" />
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-gasto-total">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Gasto Total</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#EF4444', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.gasto)}</div>
              </div>
              <DollarSign size={24} color="#EF4444" />
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-utilidad-total">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Utilidad</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: totales.utilidad >= 0 ? '#1B4D3E' : '#EF4444', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.utilidad)}</div>
              </div>
              <DollarSign size={24} color={totales.utilidad >= 0 ? '#1B4D3E' : '#EF4444'} />
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-margen">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Margen</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: totales.margen_pct >= 0 ? '#1B4D3E' : '#EF4444', fontFamily: "'Manrope', sans-serif" }}>{totales.margen_pct || 0}%</div>
              </div>
              <Percent size={24} color="#3B82F6" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="card" style={{ marginBottom: '1.5rem' }} data-testid="rentabilidad-chart">
          <div className="card-header">
            <h3 className="card-title">Ingreso vs Gasto por {DIMENSION_LABELS[dimension]}</h3>
          </div>
          <div className="card-content" style={{ height: 320 }}>
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : items.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                Sin datos en el periodo
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={items} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="dimension" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="ingreso" name="Ingreso" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gasto" name="Gasto" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="utilidad" name="Utilidad" radius={[4, 4, 0, 0]}>
                    {items.map((entry, i) => (
                      <Cell key={i} fill={entry.utilidad >= 0 ? '#1B4D3E' : '#F97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card" data-testid="rentabilidad-table-card">
          <div className="card-header">
            <h3 className="card-title">Detalle de Rentabilidad</h3>
          </div>
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : items.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <TrendingUp size={40} style={{ color: '#d1d5db', marginBottom: '0.5rem' }} />
                <div className="empty-state-title">Sin datos</div>
              </div>
            ) : (
              <table className="data-table" data-testid="rentabilidad-table">
                <thead>
                  <tr>
                    <th>{DIMENSION_LABELS[dimension]}</th>
                    <th className="text-right">Ingreso</th>
                    <th className="text-right">Gasto</th>
                    <th className="text-right">Utilidad</th>
                    <th className="text-right">Margen %</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{r.dimension}</td>
                      <td className="text-right" style={{ color: '#22C55E' }}>{fmt(r.ingreso)}</td>
                      <td className="text-right" style={{ color: '#EF4444' }}>{fmt(r.gasto)}</td>
                      <td className="text-right" style={{ fontWeight: 700, color: r.utilidad >= 0 ? '#1B4D3E' : '#EF4444' }}>{fmt(r.utilidad)}</td>
                      <td className="text-right">
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600,
                          background: r.margen_pct >= 30 ? '#D1FAE5' : r.margen_pct >= 0 ? '#FEF3C7' : '#FEE2E2',
                          color: r.margen_pct >= 30 ? '#065F46' : r.margen_pct >= 0 ? '#92400E' : '#991B1B',
                        }}>
                          {r.margen_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                    <td>TOTAL</td>
                    <td className="text-right" style={{ color: '#22C55E' }}>{fmt(totales.ingreso)}</td>
                    <td className="text-right" style={{ color: '#EF4444' }}>{fmt(totales.gasto)}</td>
                    <td className="text-right" style={{ color: totales.utilidad >= 0 ? '#1B4D3E' : '#EF4444' }}>{fmt(totales.utilidad)}</td>
                    <td className="text-right">
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600,
                        background: totales.margen_pct >= 30 ? '#D1FAE5' : totales.margen_pct >= 0 ? '#FEF3C7' : '#FEE2E2',
                        color: totales.margen_pct >= 30 ? '#065F46' : totales.margen_pct >= 0 ? '#92400E' : '#991B1B',
                      }}>
                        {totales.margen_pct}%
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
