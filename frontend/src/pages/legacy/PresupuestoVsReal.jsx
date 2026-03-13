import React, { useState, useEffect, useCallback } from 'react';
import { getPresupuestoVsReal } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { toast } from 'sonner';
import { RefreshCw, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '0.78rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{fmt(p.value)}</strong></div>
      ))}
    </div>
  );
};

export default function PresupuestoVsReal() {
  const { empresaActual } = useEmpresa();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const loadData = useCallback(async () => {
    if (!empresaActual) return;
    setLoading(true);
    try {
      const res = await getPresupuestoVsReal({ anio });
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [empresaActual, anio]);

  useEffect(() => { loadData(); }, [loadData]);

  const totales = data?.totales || {};
  const porMes = data?.por_mes || [];
  const porCat = data?.data || [];

  return (
    <div data-testid="pres-vs-real-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Presupuesto vs Real</h1>
          <p className="page-subtitle">{data?.presupuesto ? data.presupuesto.nombre : 'Sin presupuesto definido'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">Ano</label>
            <select className="form-input" value={anio} onChange={e => setAnio(parseInt(e.target.value))} data-testid="pres-anio">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={loadData} disabled={loading} data-testid="refresh-pres-btn">
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-presupuestado">
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Presupuestado</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#3B82F6', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.presupuestado)}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-real">
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Gasto Real</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#EF4444', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.real)}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-desviacion">
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Desviacion</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: totales.desviacion >= 0 ? '#22C55E' : '#EF4444', fontFamily: "'Manrope', sans-serif" }}>{fmt(totales.desviacion)}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem' }} data-testid="kpi-ejecucion">
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Ejecucion</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif" }}>
              <span style={{ color: (totales.ejecucion_pct || 0) <= 100 ? '#22C55E' : '#EF4444' }}>{totales.ejecucion_pct || 0}%</span>
            </div>
          </div>
        </div>

        {/* Chart: by month */}
        <div className="card" style={{ marginBottom: '1.5rem' }} data-testid="pres-chart-mes">
          <div className="card-header"><h3 className="card-title">Presupuesto vs Real por Mes</h3></div>
          <div className="card-content" style={{ height: 300 }}>
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : porMes.length === 0 || !data?.presupuesto ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                No hay presupuesto para {anio}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes_nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `S/${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="presupuestado" name="Presupuestado" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="real" name="Real" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Table: by category */}
        <div className="card" data-testid="pres-table-cat">
          <div className="card-header"><h3 className="card-title">Detalle por Categoria</h3></div>
          <div className="data-table-wrapper">
            {loading ? (
              <div className="loading"><div className="loading-spinner"></div></div>
            ) : porCat.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Target size={40} style={{ color: '#d1d5db' }} />
                <div className="empty-state-title">Sin datos</div>
              </div>
            ) : (
              <table className="data-table" data-testid="pres-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th className="text-right">Presupuestado</th>
                    <th className="text-right">Real</th>
                    <th className="text-right">Desviacion</th>
                    <th className="text-right">Ejecucion</th>
                    <th style={{ width: 50 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {porCat.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{r.categoria}</td>
                      <td className="text-right" style={{ color: '#3B82F6' }}>{fmt(r.presupuestado)}</td>
                      <td className="text-right" style={{ color: '#EF4444' }}>{fmt(r.real)}</td>
                      <td className="text-right" style={{ fontWeight: 600, color: r.desviacion >= 0 ? '#22C55E' : '#EF4444' }}>{fmt(r.desviacion)}</td>
                      <td className="text-right">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <div style={{ width: 60, height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(r.ejecucion_pct, 100)}%`, background: r.ejecucion_pct > 100 ? '#EF4444' : r.ejecucion_pct > 80 ? '#F59E0B' : '#22C55E' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.ejecucion_pct}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.ejecucion_pct > 100 ? <AlertTriangle size={16} color="#EF4444" /> : <CheckCircle size={16} color="#22C55E" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                    <td>TOTAL</td>
                    <td className="text-right" style={{ color: '#3B82F6' }}>{fmt(totales.presupuestado)}</td>
                    <td className="text-right" style={{ color: '#EF4444' }}>{fmt(totales.real)}</td>
                    <td className="text-right" style={{ color: totales.desviacion >= 0 ? '#22C55E' : '#EF4444' }}>{fmt(totales.desviacion)}</td>
                    <td className="text-right">{totales.ejecucion_pct || 0}%</td>
                    <td></td>
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
