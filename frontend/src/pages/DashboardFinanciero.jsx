import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardFinanciero, getMarcas, getLineasNegocio, getCentrosCosto, getProyectos } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import {
  Landmark, Wallet, TrendingUp, TrendingDown, DollarSign,
  CreditCard, AlertTriangle, Calendar, Filter, RefreshCw,
  ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, BarChart3
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const fmt = (v, sym = 'S/') =>
  `${sym} ${Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-PE') : '-';

const COLORS = ['#1B4D3E', '#4ADE80', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const KPICard = ({ icon: Icon, label, value, subtitle, color, trend }) => (
  <div className="card" style={{ padding: '1.25rem' }} data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif", color: color || '#1e293b', lineHeight: 1.2 }}>{value}</div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{subtitle}</div>}
      </div>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: `${color || '#1B4D3E'}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color || '#1B4D3E'} />
      </div>
    </div>
    {trend !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: trend >= 0 ? '#22C55E' : '#EF4444' }}>
        {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span>{trend >= 0 ? '+' : ''}{fmt(trend)}</span>
      </div>
    )}
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{d.name || d.payload?.name}</div>
      <div style={{ color: 'var(--muted)' }}>{fmt(d.value)}</div>
    </div>
  );
};

export default function DashboardFinanciero() {
  const { empresaActual } = useEmpresa();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [filters, setFilters] = useState({
    fecha_desde: firstDay.toISOString().split('T')[0],
    fecha_hasta: today.toISOString().split('T')[0],
    marca_id: '', linea_negocio_id: '', centro_costo_id: '', proyecto_id: ''
  });

  const [marcas, setMarcas] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [centros, setCentros] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  useEffect(() => {
    if (empresaActual) {
      Promise.all([
        getMarcas().then(r => setMarcas(r.data || [])).catch(() => {}),
        getLineasNegocio().then(r => setLineas(r.data || [])).catch(() => {}),
        getCentrosCosto().then(r => setCentros(r.data || [])).catch(() => {}),
        getProyectos().then(r => setProyectos(r.data || [])).catch(() => {}),
      ]);
    }
  }, [empresaActual]);

  const fetchData = useCallback(async () => {
    if (!empresaActual) return;
    setLoading(true);
    try {
      const params = {};
      if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
      if (filters.marca_id) params.marca_id = filters.marca_id;
      if (filters.linea_negocio_id) params.linea_negocio_id = filters.linea_negocio_id;
      if (filters.centro_costo_id) params.centro_costo_id = filters.centro_costo_id;
      if (filters.proyecto_id) params.proyecto_id = filters.proyecto_id;
      const res = await getDashboardFinanciero(params);
      setData(res.data);
    } catch (err) {
      console.error('Error loading dashboard financiero:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaActual, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return <div className="loading"><div className="loading-spinner"></div></div>;
  }

  if (!data) {
    return (
      <div data-testid="dashboard-financiero-page" style={{ padding: '2rem' }}>
        <h1 className="page-title">Dashboard Financiero</h1>
        <p style={{ color: 'var(--muted)' }}>No se pudo cargar la informacion.</p>
      </div>
    );
  }

  const agingData = [
    { name: '0-30d', value: data.cxc_aging?.['0_30'] || 0 },
    { name: '31-60d', value: data.cxc_aging?.['31_60'] || 0 },
    { name: '61-90d', value: data.cxc_aging?.['61_90'] || 0 },
    { name: '90+d', value: data.cxc_aging?.['90_plus'] || 0 },
  ];

  const marcaData = (data.ingresos_por_marca || []).map((m, i) => ({
    name: m.marca || 'Sin Marca',
    value: m.ingreso || 0,
    unidades: m.unidades || 0,
    fill: COLORS[i % COLORS.length],
  }));

  const ventasResumen = data.ventas || {};

  return (
    <div data-testid="dashboard-financiero-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Dashboard Financiero</h1>
          <p className="page-subtitle">Vision gerencial: {fmtDate(data.fecha_desde)} - {fmtDate(data.fecha_hasta)}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setShowFilters(!showFilters)} data-testid="toggle-filters-btn">
            <Filter size={16} /> Filtros
          </button>
          <button className="btn btn-primary" onClick={fetchData} disabled={loading} data-testid="refresh-dashboard-btn">
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card" style={{ margin: '0 1.5rem 1rem', padding: '1rem 1.25rem' }} data-testid="filters-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <label className="form-label">Desde</label>
              <input type="date" className="form-input" value={filters.fecha_desde}
                onChange={e => setFilters(p => ({ ...p, fecha_desde: e.target.value }))} data-testid="filter-fecha-desde" />
            </div>
            <div>
              <label className="form-label">Hasta</label>
              <input type="date" className="form-input" value={filters.fecha_hasta}
                onChange={e => setFilters(p => ({ ...p, fecha_hasta: e.target.value }))} data-testid="filter-fecha-hasta" />
            </div>
            <div>
              <label className="form-label">Marca</label>
              <select className="form-input" value={filters.marca_id}
                onChange={e => setFilters(p => ({ ...p, marca_id: e.target.value }))} data-testid="filter-marca">
                <option value="">Todas</option>
                {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Linea Negocio</label>
              <select className="form-input" value={filters.linea_negocio_id}
                onChange={e => setFilters(p => ({ ...p, linea_negocio_id: e.target.value }))} data-testid="filter-linea">
                <option value="">Todas</option>
                {lineas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Centro Costo</label>
              <select className="form-input" value={filters.centro_costo_id}
                onChange={e => setFilters(p => ({ ...p, centro_costo_id: e.target.value }))} data-testid="filter-cc">
                <option value="">Todos</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Proyecto</label>
              <select className="form-input" value={filters.proyecto_id}
                onChange={e => setFilters(p => ({ ...p, proyecto_id: e.target.value }))} data-testid="filter-proyecto">
                <option value="">Todos</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="page-content">
        {/* CAPA 3: CAJA REAL / TESORERIA */}
        <div style={{ marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.25rem', borderLeft: '3px solid #059669', paddingLeft: '0.75rem' }}>
            Capa 3: Caja Real / Tesoreria
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            <KPICard icon={Wallet} label="Caja" value={fmt(data.saldo_caja)} color="#22C55E" />
            <KPICard icon={Landmark} label="Bancos" value={fmt(data.saldo_banco)} color="#3B82F6" />
            <KPICard icon={DollarSign} label="Total Disponible" value={fmt(data.saldo_total)} color="#1B4D3E" />
            <KPICard icon={TrendingUp} label="Flujo Neto Periodo" value={fmt(data.flujo_neto)} color={data.flujo_neto >= 0 ? '#22C55E' : '#EF4444'}
              subtitle="Desde movimientos de tesoreria" />
          </div>
        </div>

        {/* CAPA 1: COMERCIAL */}
        <div style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.25rem', borderLeft: '3px solid #2563EB', paddingLeft: '0.75rem' }}>
            Capa 1: Comercial (Devengado)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            <KPICard icon={TrendingUp} label="Ingresos Confirmados" value={fmt(data.ingresos_confirmados)} color="#22C55E"
              subtitle={`${ventasResumen.confirmada || 0} ventas confirmadas`} />
            <KPICard icon={TrendingDown} label="Gastos Periodo" value={fmt(data.gastos_periodo)} color="#EF4444" />
            <KPICard icon={DollarSign} label="Utilidad Estimada" value={fmt(data.utilidad_estimada)}
              color={data.utilidad_estimada >= 0 ? '#22C55E' : '#EF4444'} />
            <KPICard icon={AlertTriangle} label="Ventas Pendientes" value={`${ventasResumen.pendiente || 0}`}
              subtitle={fmt(ventasResumen.monto_pendiente)} color="#F59E0B" />
          </div>
        </div>

        {/* CAPA 2: OBLIGACIONES */}
        <div style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.25rem', borderLeft: '3px solid #D97706', paddingLeft: '0.75rem' }}>
            Capa 2: Obligaciones (CxC / CxP)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            <KPICard icon={CreditCard} label="CxC Pendientes" value={fmt(data.cxc_total)}
              subtitle={`${data.cxc_count || 0} documentos`} color="#3B82F6" />
            <KPICard icon={CreditCard} label="CxP Pendientes" value={fmt(data.cxp_total)}
              subtitle={`${data.cxp_count || 0} documentos`} color="#EF4444" />
            <KPICard icon={TrendingUp} label="Cobranzas Reales" value={fmt(data.cobranzas_reales)} color="#22C55E"
              subtitle="Desde tesoreria" />
            <KPICard icon={TrendingDown} label="Egresos Reales" value={fmt(data.egresos_reales)} color="#EF4444"
              subtitle="Desde tesoreria" />
          </div>
        </div>

        {/* ROW 4: GRAFICOS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          {/* Ingresos por Marca */}
          <div className="card" data-testid="chart-ingresos-marca">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChartIcon size={18} color="var(--primary)" />
              <h3 className="card-title">Ingresos por Marca</h3>
            </div>
            <div className="card-content" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {marcaData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={marcaData} cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                      paddingAngle={2} dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      style={{ fontSize: '0.7rem' }}>
                      {marcaData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No hay ingresos confirmados en el periodo</div>
              )}
            </div>
          </div>

          {/* CxC Aging */}
          <div className="card" data-testid="chart-cxc-aging">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="var(--primary)" />
              <h3 className="card-title">Aging CxC</h3>
            </div>
            <div className="card-content" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {agingData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `S/ ${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Monto" radius={[6, 6, 0, 0]}>
                      {agingData.map((_, i) => (
                        <Cell key={i} fill={['#22C55E', '#F59E0B', '#F97316', '#EF4444'][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No hay CxC pendientes</div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 5: VENTAS POS RESUMEN */}
        <div className="card" style={{ marginTop: '1.5rem' }} data-testid="ventas-resumen">
          <div className="card-header">
            <h3 className="card-title">Ventas POS - Resumen por Estado</h3>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Pendientes', count: ventasResumen.pendiente, monto: ventasResumen.monto_pendiente, color: '#F59E0B' },
                { label: 'Confirmadas', count: ventasResumen.confirmada, monto: ventasResumen.monto_confirmada, color: '#22C55E' },
                { label: 'Credito', count: ventasResumen.credito, monto: ventasResumen.monto_credito, color: '#3B82F6' },
                { label: 'Descartadas', count: ventasResumen.descartada, monto: 0, color: '#94A3B8' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '1rem', borderRadius: 8, background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, fontFamily: "'Manrope', sans-serif" }}>{s.count || 0}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{s.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{fmt(s.monto)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 6: TOP CxC / CxP */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          {/* Top CxC Vencidas */}
          <div className="card" data-testid="top-cxc-vencidas">
            <div className="card-header">
              <h3 className="card-title" style={{ color: '#EF4444' }}>Top CxC Vencidas</h3>
            </div>
            <div className="card-content" style={{ padding: 0 }}>
              {data.top_cxc_vencidas?.length > 0 ? (
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th style={{ textAlign: 'right' }}>Saldo</th>
                      <th style={{ textAlign: 'right' }}>Dias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_cxc_vencidas.map((r, i) => (
                      <tr key={i}>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.tercero_nombre}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.saldo_pendiente)}</td>
                        <td style={{ textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>{r.dias_atraso}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '1.5rem', color: 'var(--muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                  Sin CxC vencidas
                </div>
              )}
            </div>
          </div>

          {/* Top CxP por Vencer */}
          <div className="card" data-testid="top-cxp-por-vencer">
            <div className="card-header">
              <h3 className="card-title" style={{ color: '#F59E0B' }}>Top CxP por Vencer</h3>
            </div>
            <div className="card-content" style={{ padding: 0 }}>
              {data.top_cxp_por_vencer?.length > 0 ? (
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th style={{ textAlign: 'right' }}>Saldo</th>
                      <th style={{ textAlign: 'right' }}>Vence en</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_cxp_por_vencer.map((r, i) => (
                      <tr key={i}>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.tercero_nombre}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.saldo_pendiente)}</td>
                        <td style={{ textAlign: 'right', color: r.dias_por_vencer <= 7 ? '#EF4444' : '#F59E0B', fontWeight: 600 }}>
                          {r.dias_por_vencer}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '1.5rem', color: 'var(--muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                  Sin CxP pendientes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
