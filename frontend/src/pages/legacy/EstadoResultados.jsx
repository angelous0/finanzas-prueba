import React, { useState, useEffect } from 'react';
import { getReporteEstadoResultados } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EstadoResultados() {
  const { empresaActual } = useEmpresa();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const [fechaDesde, setFechaDesde] = useState(inicioMes.toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split('T')[0]);

  const loadData = async () => {
    if (!fechaDesde || !fechaHasta) return;
    setLoading(true);
    try {
      const res = await getReporteEstadoResultados(fechaDesde, fechaHasta);
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar estado de resultados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fechaDesde, fechaHasta, empresaActual]);

  return (
    <div data-testid="estado-resultados-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Estado de Resultados</h1>
          <p className="page-subtitle">Ingresos vs Egresos por periodo</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)} data-testid="er-fecha-desde" />
          </div>
          <div>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)} data-testid="er-fecha-hasta" />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Cargando...</div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Total Ingresos</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }} data-testid="er-total-ingresos">{fmt(data.total_ingresos)}</div>
                </div>
                <TrendingUp size={28} style={{ color: '#10b981' }} />
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Total Egresos</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }} data-testid="er-total-egresos">{fmt(data.total_egresos)}</div>
                </div>
                <TrendingDown size={28} style={{ color: '#ef4444' }} />
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Resultado Neto</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: data.resultado_neto >= 0 ? '#10b981' : '#ef4444' }} data-testid="er-resultado-neto">{fmt(data.resultado_neto)}</div>
                </div>
                <DollarSign size={28} style={{ color: data.resultado_neto >= 0 ? '#10b981' : '#ef4444' }} />
              </div>
            </div>
          </div>

          {/* Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Ingresos */}
            <div className="card">
              <div className="card-header" style={{ background: '#dcfce7' }}>
                <h3 className="card-title" style={{ color: '#166534' }}>Ingresos</h3>
              </div>
              <div className="card-content">
                {data.ingresos?.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>Sin ingresos en el periodo</div>
                ) : (
                  <>
                    {data.ingresos?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < data.ingresos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span>{item.categoria}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#10b981' }}>{fmt(item.monto)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '2px solid var(--border)', marginTop: '0.5rem', fontWeight: 600 }}>
                      <span>Total</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#10b981' }}>{fmt(data.total_ingresos)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Egresos */}
            <div className="card">
              <div className="card-header" style={{ background: '#fee2e2' }}>
                <h3 className="card-title" style={{ color: '#991b1b' }}>Egresos</h3>
              </div>
              <div className="card-content">
                {data.egresos?.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>Sin egresos en el periodo</div>
                ) : (
                  <>
                    {data.egresos?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < data.egresos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span>{item.categoria}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#ef4444' }}>{fmt(item.monto)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '2px solid var(--border)', marginTop: '0.5rem', fontWeight: 600 }}>
                      <span>Total</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#ef4444' }}>{fmt(data.total_egresos)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Resultado Neto */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', fontSize: '1.25rem', fontWeight: 600 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>INGRESOS</div>
                  <div style={{ color: '#10b981' }}>{fmt(data.total_ingresos)}</div>
                </div>
                <span>-</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>EGRESOS</div>
                  <div style={{ color: '#ef4444' }}>{fmt(data.total_egresos)}</div>
                </div>
                <span>=</span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>RESULTADO NETO</div>
                  <div style={{ color: data.resultado_neto >= 0 ? '#10b981' : '#ef4444' }}>{fmt(data.resultado_neto)}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
