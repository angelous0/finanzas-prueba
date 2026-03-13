import React, { useState, useEffect } from 'react';
import { getDashboardResumen } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Wallet, CreditCard, TrendingUp,
  AlertTriangle, Layers, ArrowRight, RefreshCw
} from 'lucide-react';

const fmt = (v) => `S/ ${Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { empresaActual } = useEmpresa();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDashboardResumen();
      setData(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (empresaActual) load(); }, [empresaActual]);

  if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;
  if (!data) return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Sin datos disponibles</div>;

  const hasAlerts = data.ventas_pendientes_cantidad > 0 || data.gastos_prorrateo_cantidad > 0 || data.cobranza_pendiente_total > 0;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px' }} data-testid="dashboard-ejecutivo">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Panel de Control
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Resumen ejecutivo del mes actual
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load} data-testid="refresh-dashboard">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Alertas */}
      {hasAlerts && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }} data-testid="alerts-section">
          {data.ventas_pendientes_cantidad > 0 && (
            <AlertCard
              icon={ShoppingCart}
              color="#f59e0b"
              bg="#fef9c3"
              text={`${data.ventas_pendientes_cantidad} ventas pendientes por revisar`}
              sub={fmt(data.ventas_pendientes_monto)}
              onClick={() => navigate('/ventas-pos')}
              testId="alert-ventas-pendientes"
            />
          )}
          {data.gastos_prorrateo_cantidad > 0 && (
            <AlertCard
              icon={Layers}
              color="#8b5cf6"
              bg="#ede9fe"
              text={`${data.gastos_prorrateo_cantidad} gastos sin prorratear`}
              sub={fmt(data.gastos_prorrateo_monto)}
              onClick={() => navigate('/prorrateo')}
              testId="alert-gastos-prorrateo"
            />
          )}
          {data.cobranza_pendiente_total > 0 && (
            <AlertCard
              icon={CreditCard}
              color="#ef4444"
              bg="#fee2e2"
              text="Cobranza pendiente"
              sub={fmt(data.cobranza_pendiente_total)}
              onClick={() => navigate('/cxc')}
              testId="alert-cobranza"
            />
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }} data-testid="kpi-cards">
        <KpiCard label="Ingresos del Mes" value={fmt(data.ingresos_mes)} icon={TrendingUp} color="#22c55e" testId="kpi-ingresos" />
        <KpiCard label="Costos Proveedores" value={fmt(data.egresos_proveedores_mes || 0)} icon={Wallet} color="#f97316" testId="kpi-costos-prov" />
        <KpiCard label="Gastos del Mes" value={fmt(data.gastos_mes)} icon={Wallet} color="#ef4444" testId="kpi-gastos" />
        <KpiCard label="Resultado Neto" value={fmt(data.resultado_neto)} icon={TrendingUp}
          color={data.resultado_neto >= 0 ? '#22c55e' : '#ef4444'} testId="kpi-resultado" />
        <KpiCard label="Cobranza Pendiente" value={fmt(data.cobranza_pendiente_total)} icon={CreditCard} color="#3b82f6" testId="kpi-cobranza" />
      </div>

      {/* Utilidad por Línea */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Utilidad por Línea de Negocio</h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mes actual</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '0.8125rem' }} data-testid="utilidad-linea-table">
            <thead>
              <tr>
                <th>Linea de Negocio</th>
                <th className="text-right">Ingresos</th>
                <th className="text-right">Costos Prov.</th>
                <th className="text-right">Gastos Directos</th>
                <th className="text-right">Utilidad (antes)</th>
                <th className="text-right">Prorrateo</th>
                <th className="text-right">Utilidad (despues)</th>
              </tr>
            </thead>
            <tbody>
              {data.utilidad_linea?.length > 0 ? data.utilidad_linea.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{l.linea_nombre}</td>
                  <td className="text-right" style={{ color: '#22c55e' }}>{fmt(l.ingresos)}</td>
                  <td className="text-right" style={{ color: '#f97316' }}>{fmt(l.egresos_proveedores || 0)}</td>
                  <td className="text-right" style={{ color: '#ef4444' }}>{fmt(l.gastos_directos)}</td>
                  <td className="text-right" style={{ fontWeight: 600, color: l.utilidad_antes_prorrateo >= 0 ? '#166534' : '#991b1b' }}>
                    {fmt(l.utilidad_antes_prorrateo)}
                  </td>
                  <td className="text-right" style={{ color: '#8b5cf6' }}>{fmt(l.gastos_prorrateados)}</td>
                  <td className="text-right" style={{ fontWeight: 700, color: l.utilidad_despues_prorrateo >= 0 ? '#166534' : '#991b1b' }}>
                    {fmt(l.utilidad_despues_prorrateo)}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>Sin movimientos este mes</td></tr>
              )}
            </tbody>
            {data.utilidad_linea?.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                  <td>Total</td>
                  <td className="text-right" style={{ color: '#22c55e' }}>
                    {fmt(data.utilidad_linea.reduce((s, l) => s + l.ingresos, 0))}
                  </td>
                  <td className="text-right" style={{ color: '#f97316' }}>
                    {fmt(data.utilidad_linea.reduce((s, l) => s + (l.egresos_proveedores || 0), 0))}
                  </td>
                  <td className="text-right" style={{ color: '#ef4444' }}>
                    {fmt(data.utilidad_linea.reduce((s, l) => s + l.gastos_directos, 0))}
                  </td>
                  <td className="text-right">
                    {fmt(data.utilidad_linea.reduce((s, l) => s + l.utilidad_antes_prorrateo, 0))}
                  </td>
                  <td className="text-right" style={{ color: '#8b5cf6' }}>
                    {fmt(data.utilidad_linea.reduce((s, l) => s + l.gastos_prorrateados, 0))}
                  </td>
                  <td className="text-right">
                    {fmt(data.utilidad_linea.reduce((s, l) => s + l.utilidad_despues_prorrateo, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Bottom row: Cobranza por linea */}
      {data.cobranza_pendiente_linea?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Cobranza Pendiente por Línea</h2>
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.cobranza_pendiente_linea.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < data.cobranza_pendiente_linea.length - 1 ? '1px solid #f1f5f9' : 'none' }} data-testid={`cobranza-linea-${i}`}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{c.linea_nombre || 'Sin clasificar'}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ef4444' }}>{fmt(c.saldo_pendiente)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, testId }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
      padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
    }} data-testid={testId}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
    </div>
  );
}

function AlertCard({ icon: Icon, color, bg, text, sub, onClick, testId }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', background: bg, border: `1px solid ${color}30`,
        borderRadius: '8px', cursor: 'pointer', textAlign: 'left', minWidth: '240px'
      }}
      data-testid={testId}
    >
      <AlertTriangle size={18} color={color} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color }}>{text}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{sub}</div>
      </div>
      <ArrowRight size={16} color={color} />
    </button>
  );
}
