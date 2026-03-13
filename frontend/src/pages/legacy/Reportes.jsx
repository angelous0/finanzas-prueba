import React, { useState, useEffect, useCallback } from 'react';
import { getResumenEjecutivo, exportarCxC, exportarCxP, exportarFlujoCaja, exportarRentabilidad, exportarGastos, exportarTesoreria } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { toast } from 'sonner';
import {
  Download, FileSpreadsheet, RefreshCw, Wallet, Landmark,
  CreditCard, TrendingUp, TrendingDown, AlertTriangle, Clock,
  DollarSign, ShieldCheck
} from 'lucide-react';

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SummaryCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div className="card" style={{ padding: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.03em' }}>{title}</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color, fontFamily: "'Manrope', sans-serif" }}>{value}</div>
        {subtitle && <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{subtitle}</div>}
      </div>
    </div>
  </div>
);

const ReportRow = ({ icon: Icon, title, description, onExport, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{description}</div>
      </div>
    </div>
    <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={onExport} data-testid={`export-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <Download size={14} /> CSV
    </button>
  </div>
);

export default function Reportes() {
  const { empresaActual } = useEmpresa();
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const [fechaDesde, setFechaDesde] = useState(inicioMes.toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split('T')[0]);

  const loadData = useCallback(async () => {
    if (!empresaActual) return;
    setLoading(true);
    try {
      const res = await getResumenEjecutivo();
      setResumen(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [empresaActual]);

  useEffect(() => { loadData(); }, [loadData]);

  const download = (url) => {
    window.open(url, '_blank');
    toast.success('Descargando reporte...');
  };

  const r = resumen || {};

  return (
    <div data-testid="reportes-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Reportes Gerenciales</h1>
          <p className="page-subtitle">Resumen ejecutivo y exportacion de datos</p>
        </div>
        <button className="btn btn-primary" onClick={loadData} disabled={loading} data-testid="refresh-reportes-btn">
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="page-content">
        {/* CFO Executive Summary */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Resumen Ejecutivo CFO
          </h3>
          {loading ? (
            <div className="loading"><div className="loading-spinner"></div></div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <SummaryCard icon={Wallet} title="Caja" value={fmt(r.tesoreria?.caja)} color="#22C55E" />
                <SummaryCard icon={Landmark} title="Bancos" value={fmt(r.tesoreria?.banco)} color="#3B82F6" />
                <SummaryCard icon={DollarSign} title="Disponible Total" value={fmt(r.tesoreria?.total)} color="#1B4D3E" />
                <SummaryCard icon={ShieldCheck} title="Liquidez Neta" value={fmt(r.liquidez_neta)}
                  subtitle="Disponible + CxC - CxP" color={r.liquidez_neta >= 0 ? '#22C55E' : '#EF4444'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                <SummaryCard icon={TrendingUp} title="Ventas MTD" value={fmt(r.ventas_mtd?.total)}
                  subtitle={`${r.ventas_mtd?.cantidad || 0} ventas confirmadas`} color="#22C55E" />
                <SummaryCard icon={TrendingDown} title="Gastos MTD" value={fmt(r.gastos_mtd)} color="#EF4444" />
                <SummaryCard icon={DollarSign} title="Utilidad MTD" value={fmt(r.utilidad_mtd)}
                  color={r.utilidad_mtd >= 0 ? '#1B4D3E' : '#EF4444'} />
                <SummaryCard icon={AlertTriangle} title="Pendientes" value={`${r.pendientes_confirmar || 0}`}
                  subtitle="Ventas POS sin validar" color="#F59E0B" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                <SummaryCard icon={Wallet} title="Ingresos Reales MTD" value={fmt(r.flujo_caja_mtd?.ingresos_reales)}
                  subtitle="Desde tesoreria" color="#059669" />
                <SummaryCard icon={Wallet} title="Egresos Reales MTD" value={fmt(r.flujo_caja_mtd?.egresos_reales)}
                  subtitle="Desde tesoreria" color="#DC2626" />
                <SummaryCard icon={CreditCard} title="CxC Pendientes" value={fmt(r.cxc?.total)}
                  subtitle={`${r.cxc?.documentos || 0} docs | Vencido: ${fmt(r.cxc?.vencido)}`} color="#3B82F6" />
                <SummaryCard icon={CreditCard} title="CxP Pendientes" value={fmt(r.cxp?.total)}
                  subtitle={`${r.cxp?.documentos || 0} docs | Vencido: ${fmt(r.cxp?.vencido)}`} color="#EF4444" />
              </div>
            </>
          )}
        </div>

        {/* Export Section */}
        <div className="card" data-testid="export-section">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={18} /> Exportar Reportes
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Desde</label>
                <input type="date" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                  value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} data-testid="export-fecha-desde" />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Hasta</label>
                <input type="date" className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                  value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} data-testid="export-fecha-hasta" />
              </div>
            </div>
          </div>
          <div className="card-content" style={{ padding: '0 1rem' }}>
            <ReportRow icon={CreditCard} title="Cuentas por Cobrar" description="Listado completo de CxC con aging y saldos"
              color="#3B82F6" onExport={() => download(exportarCxC({}))} />
            <ReportRow icon={CreditCard} title="Cuentas por Pagar" description="Listado completo de CxP con vencimientos"
              color="#EF4444" onExport={() => download(exportarCxP({}))} />
            <ReportRow icon={TrendingUp} title="Flujo de Caja" description="Ingresos vs egresos por dia"
              color="#22C55E" onExport={() => download(exportarFlujoCaja({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }))} />
            <ReportRow icon={DollarSign} title="Rentabilidad por Marca" description="Ingreso, gasto y margen por marca"
              color="#1B4D3E" onExport={() => download(exportarRentabilidad({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, dimension: 'marca' }))} />
            <ReportRow icon={Clock} title="Gastos del Periodo" description="Detalle de gastos con categorias"
              color="#F59E0B" onExport={() => download(exportarGastos({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }))} />
            <ReportRow icon={Wallet} title="Tesoreria" description="Movimientos reales de caja y banco"
              color="#059669" onExport={() => download(exportarTesoreria({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }))} />
          </div>
        </div>
      </div>
    </div>
  );
}
