import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Scale, TrendingUp, Banknote, Package, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, ChevronDown, BarChart3, Clock, Users, Download } from 'lucide-react';
import {
  getReporteBalanceGeneral, getReporteEstadoResultados,
  getReporteFlujoCaja, getReporteInventarioValorizado,
  getReporteRentabilidadLinea, getReporteCxpAging, getReporteCxcAging
} from '../services/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const fmt = (v) => `S/ ${Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
const fmtNum = (v) => Number(v || 0).toFixed(2);

function exportRentabilidad(data) {
  if (!data?.lineas) return;
  const wb = XLSX.utils.book_new();
  const rows = data.lineas.map(l => ({
    'Linea de Negocio': l.linea_nombre,
    'Ventas': +fmtNum(l.ventas),
    'Costo MP': +fmtNum(l.costo_mp),
    'Costo Servicios': +fmtNum(l.costo_servicios),
    'Costo Total': +fmtNum(l.costo_total),
    'Margen Bruto': +fmtNum(l.margen_bruto),
    '% Margen': l.pct_margen,
    'Gastos': +fmtNum(l.gastos),
    'Utilidad': +fmtNum(l.utilidad),
  }));
  rows.push({
    'Linea de Negocio': 'TOTAL',
    'Ventas': +fmtNum(data.totales.ventas),
    'Costo MP': '',
    'Costo Servicios': '',
    'Costo Total': +fmtNum(data.totales.costo_total),
    'Margen Bruto': +fmtNum(data.totales.margen_bruto),
    '% Margen': data.totales.pct_margen,
    'Gastos': +fmtNum(data.totales.gastos),
    'Utilidad': +fmtNum(data.totales.utilidad),
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Rentabilidad x Linea');
  XLSX.writeFile(wb, `rentabilidad_linea_${data.periodo.desde}_${data.periodo.hasta}.xlsx`);
  toast.success('Excel exportado');
}

function exportCxpAging(data) {
  if (!data?.detalle) return;
  const wb = XLSX.utils.book_new();
  // Resumen por proveedor
  if (data.resumen_proveedor?.length) {
    const resProv = data.resumen_proveedor.map(p => ({
      'Proveedor': p.nombre,
      'Vigente': +fmtNum(p.vigente),
      '1-30 dias': +fmtNum(p['1_30']),
      '31-60 dias': +fmtNum(p['31_60']),
      '61-90 dias': +fmtNum(p['61_90']),
      '90+ dias': +fmtNum(p['90_plus']),
      'Total': +fmtNum(p.total),
    }));
    const ws1 = XLSX.utils.json_to_sheet(resProv);
    ws1['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Proveedor');
  }
  // Detalle
  const det = data.detalle.map(d => ({
    'Proveedor': d.proveedor,
    'Documento': d.documento,
    'Monto Original': +fmtNum(d.monto_original),
    'Saldo': +fmtNum(d.saldo),
    'Fecha Vencimiento': d.fecha_vencimiento || '',
    'Dias Vencido': d.dias_vencido,
    'Estado': d.bucket === 'vigente' ? 'Vigente' : d.bucket === '1_30' ? '1-30' : d.bucket === '31_60' ? '31-60' : d.bucket === '61_90' ? '61-90' : '90+',
    'Linea Negocio': d.linea_negocio || '',
  }));
  const ws2 = XLSX.utils.json_to_sheet(det);
  ws2['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Detalle CxP');
  XLSX.writeFile(wb, `cxp_aging_${data.fecha_corte}.xlsx`);
  toast.success('Excel exportado');
}

function exportCxcAging(data) {
  if (!data?.detalle?.length) { toast.info('Sin datos para exportar'); return; }
  const wb = XLSX.utils.book_new();
  const det = data.detalle.map(d => ({
    'Cliente/Documento': d.cliente,
    'Monto Original': +fmtNum(d.monto_original),
    'Saldo': +fmtNum(d.saldo),
    'Fecha Vencimiento': d.fecha_vencimiento || '',
    'Dias Vencido': d.dias_vencido,
    'Estado': d.bucket === 'vigente' ? 'Vigente' : d.bucket === '1_30' ? '1-30' : d.bucket === '31_60' ? '31-60' : d.bucket === '61_90' ? '61-90' : '90+',
    'Linea Negocio': d.linea_negocio || '',
  }));
  const ws = XLSX.utils.json_to_sheet(det);
  ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Detalle CxC');
  XLSX.writeFile(wb, `cxc_aging_${data.fecha_corte}.xlsx`);
  toast.success('Excel exportado');
}
const TABS = [
  { id: 'balance', label: 'Balance General', icon: Scale },
  { id: 'egyp', label: 'Estado de Resultados', icon: TrendingUp },
  { id: 'flujo', label: 'Flujo de Caja', icon: Banknote },
  { id: 'inventario', label: 'Inventario Valorizado', icon: Package },
  { id: 'rentabilidad', label: 'Rentabilidad x Linea', icon: BarChart3 },
  { id: 'cxp_aging', label: 'CxP Aging', icon: Clock },
  { id: 'cxc_aging', label: 'CxC Aging', icon: Users },
];

export default function ReportesFinancieros() {
  const [tab, setTab] = useState('balance');
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});

  const needsDates = tab === 'egyp' || tab === 'flujo' || tab === 'rentabilidad';
  const needsCorte = tab === 'balance' || tab === 'cxp_aging' || tab === 'cxc_aging';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let params = {};
      if (needsDates) params = { fecha_desde: fechaDesde, fecha_hasta: fechaHasta };
      if (needsCorte) params = { fecha_corte: fechaHasta };
      let result;
      switch (tab) {
        case 'balance':
          result = await getReporteBalanceGeneral(params);
          break;
        case 'egyp':
          result = await getReporteEstadoResultados(params);
          break;
        case 'flujo':
          result = await getReporteFlujoCaja(params);
          break;
        case 'inventario':
          result = await getReporteInventarioValorizado();
          break;
        case 'rentabilidad':
          result = await getReporteRentabilidadLinea(params);
          break;
        case 'cxp_aging':
          result = await getReporteCxpAging(params);
          break;
        case 'cxc_aging':
          result = await getReporteCxcAging(params);
          break;
        default: break;
      }
      setData(prev => ({ ...prev, [tab]: result?.data }));
    } catch {
      toast.error('Error cargando reporte');
    } finally {
      setLoading(false);
    }
  }, [tab, fechaDesde, fechaHasta, needsDates, needsCorte]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px' }} data-testid="reportes-financieros-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Reportes Financieros</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0' }}>Estados financieros gerenciales consolidados</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {needsCorte && (
            <>
              <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>Corte al:</span>
              <input type="date" className="form-input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '4px 8px' }} data-testid="rf-fecha-corte" />
            </>
          )}
          {needsDates && (
            <>
              <input type="date" className="form-input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '4px 8px' }} data-testid="rf-fecha-desde" />
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>a</span>
              <input type="date" className="form-input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '4px 8px' }} data-testid="rf-fecha-hasta" />
            </>
          )}
          <button className="btn btn-primary btn-sm" onClick={load} data-testid="rf-refresh">
            <RefreshCw size={14} /> Actualizar
          </button>
          {(tab === 'rentabilidad' || tab === 'cxp_aging' || tab === 'cxc_aging') && data[tab] && (
            <button
              className="btn btn-outline btn-sm"
              data-testid="rf-export-excel"
              onClick={() => {
                if (tab === 'rentabilidad') exportRentabilidad(data.rentabilidad);
                else if (tab === 'cxp_aging') exportCxpAging(data.cxp_aging);
                else if (tab === 'cxc_aging') exportCxcAging(data.cxc_aging);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={14} /> Excel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`rf-tab-${t.id}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? '#0f172a' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #0f172a' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'all 0.15s',
            }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading"><div className="loading-spinner"></div></div>
      ) : (
        <>
          {tab === 'balance' && <BalanceGeneral data={data.balance} />}
          {tab === 'egyp' && <EstadoResultados data={data.egyp} />}
          {tab === 'flujo' && <FlujoCajaTab data={data.flujo} />}
          {tab === 'inventario' && <InventarioValorizado data={data.inventario} />}
          {tab === 'rentabilidad' && <RentabilidadLinea data={data.rentabilidad} />}
          {tab === 'cxp_aging' && <CxpAging data={data.cxp_aging} />}
          {tab === 'cxc_aging' && <CxcAging data={data.cxc_aging} />}
        </>
      )}
    </div>
  );
}


/* ========== BALANCE GENERAL ========== */
function BalanceGeneral({ data }) {
  const [open, setOpen] = useState({});
  if (!data) return <Empty />;
  const { activos, pasivos, patrimonio } = data;

  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div data-testid="balance-general-content">
      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <KPI label="Total Activos" value={fmt(activos.total)} color="#22c55e" icon={ArrowUpRight} />
        <KPI label="Total Pasivos" value={fmt(pasivos.total)} color="#ef4444" icon={ArrowDownRight} />
        <KPI label="Patrimonio" value={fmt(patrimonio)} color={patrimonio >= 0 ? '#166534' : '#991b1b'} icon={Scale} bold />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* ACTIVOS */}
        <div>
          <SectionCard title="ACTIVOS" total={activos.total} color="#22c55e">
            <CollapsibleRow label="Caja y Bancos" total={activos.caja_bancos.total} isOpen={open.caja} onToggle={() => toggle('caja')} testId="bg-caja">
              <SimpleTable
                headers={['Cuenta', 'Tipo', 'Saldo']}
                rows={activos.caja_bancos.cuentas.map(c => [
                  c.nombre, c.tipo, { v: fmt(c.saldo_actual), color: '#22c55e', bold: true }
                ])}
                testId="balance-cuentas-table"
              />
            </CollapsibleRow>

            <CollapsibleRow label="Cuentas por Cobrar" total={activos.cuentas_por_cobrar} isOpen={false} simple />

            <CollapsibleRow label="Inventario Materia Prima" total={activos.inventario_mp.total} isOpen={open.invmp} onToggle={() => toggle('invmp')} hasDetail={activos.inventario_mp.detalle.length > 0} testId="bg-invmp">
              <SimpleTable
                headers={['Categoria', 'Cantidad', 'Valor']}
                rows={activos.inventario_mp.detalle.map(r => [
                  r.categoria, Number(r.cantidad || 0).toFixed(2), { v: fmt(r.valor), color: '#22c55e' }
                ])}
                testId="balance-inv-mp-table"
              />
            </CollapsibleRow>

            <CollapsibleRow label="Inventario Producto Terminado" total={activos.inventario_pt} isOpen={false} simple />

            <CollapsibleRow label="Trabajo en Proceso (WIP)" total={activos.wip.total} isOpen={open.wip} onToggle={() => toggle('wip')} hasDetail testId="bg-wip">
              <div style={{ padding: '0.4rem 0.75rem 0.4rem 1.5rem', fontSize: '0.775rem', color: '#64748b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                  <span>MP Consumida</span><span style={{ fontWeight: 600 }}>{fmt(activos.wip.mp_consumida)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                  <span>Servicios</span><span style={{ fontWeight: 600 }}>{fmt(activos.wip.servicios)}</span>
                </div>
              </div>
            </CollapsibleRow>
          </SectionCard>
        </div>

        {/* PASIVOS + PATRIMONIO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SectionCard title="PASIVOS" total={pasivos.total} color="#ef4444">
            <CollapsibleRow label="Cuentas por Pagar" total={pasivos.cuentas_por_pagar} isOpen={false} simple />
            <CollapsibleRow label="Letras por Pagar" total={pasivos.letras_por_pagar} isOpen={false} simple />
          </SectionCard>

          <SectionCard title="PATRIMONIO" total={patrimonio} color={patrimonio >= 0 ? '#166534' : '#991b1b'}>
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: patrimonio >= 0 ? '#166534' : '#991b1b' }}>{fmt(patrimonio)}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Activos - Pasivos</div>
            </div>
          </SectionCard>

          {/* Ecuacion Contable */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ecuacion Contable</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600 }}>{fmt(activos.total)}</span>
              <span style={{ color: '#94a3b8' }}>=</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>{fmt(pasivos.total)}</span>
              <span style={{ color: '#94a3b8' }}>+</span>
              <span style={{ fontWeight: 600, color: patrimonio >= 0 ? '#166534' : '#991b1b' }}>{fmt(patrimonio)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ========== ESTADO DE RESULTADOS ========== */
function EstadoResultados({ data }) {
  if (!data) return <Empty />;

  const lines = [
    { label: 'Ventas', value: data.ventas.total, color: '#22c55e', bold: true, indent: 0 },
    { label: '(-) Costo MP Consumida', value: -data.costo_venta.mp_consumida, color: '#ef4444', indent: 1 },
    { label: '(-) Costo Servicios', value: -data.costo_venta.servicios, color: '#ef4444', indent: 1 },
    { label: 'Costo de Venta Total', value: -data.costo_venta.total, color: '#ef4444', bold: true, indent: 0, separator: true },
    { label: 'MARGEN BRUTO', value: data.margen_bruto, color: data.margen_bruto >= 0 ? '#166534' : '#991b1b', bold: true, indent: 0, highlight: true },
    { label: '(-) Gastos Operativos', value: -data.gastos_operativos.total, color: '#ef4444', bold: true, indent: 0 },
    { label: 'UTILIDAD OPERATIVA', value: data.utilidad_operativa, color: data.utilidad_operativa >= 0 ? '#166534' : '#991b1b', bold: true, indent: 0, highlight: true },
  ];

  const pctMargen = data.ventas.total > 0 ? ((data.margen_bruto / data.ventas.total) * 100).toFixed(1) : '0.0';
  const pctUtilidad = data.ventas.total > 0 ? ((data.utilidad_operativa / data.ventas.total) * 100).toFixed(1) : '0.0';

  return (
    <div data-testid="estado-resultados-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <KPI label="Ventas" value={fmt(data.ventas.total)} color="#22c55e" icon={ArrowUpRight} />
        <KPI label="Costo de Venta" value={fmt(data.costo_venta.total)} color="#ef4444" icon={ArrowDownRight} />
        <KPI label="Margen Bruto" value={fmt(data.margen_bruto)} subtitle={`${pctMargen}%`} color={data.margen_bruto >= 0 ? '#166534' : '#991b1b'} icon={TrendingUp} bold />
        <KPI label="Utilidad Neta" value={fmt(data.utilidad_neta)} subtitle={`${pctUtilidad}%`} color={data.utilidad_neta >= 0 ? '#166534' : '#991b1b'} icon={Scale} bold />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
        {/* Waterfall */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} color="#64748b" />
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: '#334155' }}>Estado de Ganancias y Perdidas</h3>
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#94a3b8' }}>{data.periodo.desde} - {data.periodo.hasta}</span>
          </div>
          <div style={{ padding: '0.25rem 0' }}>
            {lines.map((l, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: `0.4rem ${1 + l.indent * 0.75}rem 0.4rem 1rem`,
                background: l.highlight ? '#f0fdf4' : 'transparent',
                borderTop: l.separator ? '1px solid #e2e8f0' : 'none',
                borderBottom: l.highlight ? '1px solid #dcfce7' : 'none',
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: l.bold ? 700 : 400, color: l.indent ? '#64748b' : '#1e293b' }}>{l.label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: l.bold ? 700 : 500, color: l.color }}>{fmt(Math.abs(l.value))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Desglose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Ventas por Linea */}
          {data.ventas.por_linea?.length > 0 && (
            <Card title="Ventas por Linea" icon={TrendingUp} testId="egyp-ventas-linea">
              <SimpleTable
                headers={['Linea', 'Monto']}
                rows={data.ventas.por_linea.map(r => [r.linea || 'Sin clasificar', { v: fmt(r.total), color: '#22c55e', bold: true }])}
                testId="egyp-ventas-linea-table"
              />
            </Card>
          )}

          {/* Gastos por Categoria */}
          {data.gastos_operativos.por_categoria?.length > 0 && (
            <Card title="Gastos por Categoria" icon={ArrowDownRight} testId="egyp-gastos-cat">
              <SimpleTable
                headers={['Categoria', 'Monto']}
                rows={data.gastos_operativos.por_categoria.map(r => [r.categoria, { v: fmt(r.monto), color: '#ef4444', bold: true }])}
                testId="egyp-gastos-cat-table"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


/* ========== FLUJO DE CAJA ========== */
function FlujoCajaTab({ data }) {
  if (!data) return <Empty />;

  return (
    <div data-testid="flujo-caja-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <KPI label="Total Ingresos" value={fmt(data.ingresos.total)} color="#22c55e" icon={ArrowUpRight} />
        <KPI label="Total Egresos" value={fmt(data.egresos.total)} color="#ef4444" icon={ArrowDownRight} />
        <KPI label="Flujo Neto" value={fmt(data.flujo_neto)} color={data.flujo_neto >= 0 ? '#166534' : '#991b1b'} icon={Banknote} bold />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Ingresos */}
        <SectionCard title="INGRESOS" total={data.ingresos.total} color="#22c55e">
          <GroupHeader label="Cobros de Ventas" total={data.ingresos.cobros_ventas} />
          <GroupHeader label="Tesoreria (otros ingresos)" total={data.ingresos.tesoreria} />
          <GroupHeader label="Pagos Recibidos" total={data.ingresos.pagos_recibidos} />
          {data.ingresos.detalle?.length > 0 && (
            <>
              <div style={{ padding: '0.5rem 0.75rem 0.25rem', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Detalle</div>
              <SimpleTable
                headers={['Concepto', 'Monto']}
                rows={data.ingresos.detalle.map(r => [r.concepto || 'Sin concepto', { v: fmt(r.total), color: '#22c55e' }])}
                testId="flujo-ing-detalle"
              />
            </>
          )}
        </SectionCard>

        {/* Egresos */}
        <SectionCard title="EGRESOS" total={data.egresos.total} color="#ef4444">
          <GroupHeader label="Tesoreria (salidas)" total={data.egresos.tesoreria} />
          <GroupHeader label="Pagos a Proveedores" total={data.egresos.pagos_proveedores} />
          {data.egresos.detalle?.length > 0 && (
            <>
              <div style={{ padding: '0.5rem 0.75rem 0.25rem', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Detalle</div>
              <SimpleTable
                headers={['Concepto', 'Monto']}
                rows={data.egresos.detalle.map(r => [r.concepto || 'Sin concepto', { v: fmt(r.total), color: '#ef4444' }])}
                testId="flujo-egr-detalle"
              />
            </>
          )}
        </SectionCard>
      </div>

      {/* Saldos de Cuentas */}
      {data.saldos_cuentas?.length > 0 && (
        <Card title="Saldos Actuales de Cuentas" icon={Banknote} testId="flujo-saldos">
          <SimpleTable
            headers={['Cuenta', 'Tipo', 'Saldo']}
            rows={data.saldos_cuentas.map(r => [
              r.nombre, r.tipo,
              { v: fmt(r.saldo_actual), color: Number(r.saldo_actual) >= 0 ? '#22c55e' : '#ef4444', bold: true }
            ])}
            testId="flujo-saldos-table"
          />
        </Card>
      )}
    </div>
  );
}


/* ========== INVENTARIO VALORIZADO ========== */
function InventarioValorizado({ data }) {
  if (!data) return <Empty />;

  return (
    <div data-testid="inventario-valorizado-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <KPI label="Materia Prima" value={fmt(data.materia_prima.total)} color="#3b82f6" icon={Package} />
        <KPI label="Producto Terminado" value={fmt(data.producto_terminado.total)} color="#8b5cf6" icon={Package} />
        <KPI label="Trabajo en Proceso" value={fmt(data.wip.total)} color="#f59e0b" icon={Package} />
        <KPI label="Gran Total" value={fmt(data.gran_total)} color="#0f172a" icon={Scale} bold />
      </div>

      {/* MP Table */}
      {data.materia_prima.items.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <Card title={`Materia Prima (${data.materia_prima.items.length} items)`} icon={Package} testId="inv-mp-card">
            <SimpleTable
              headers={['Articulo', 'Codigo', 'Categoria', 'UM', 'Stock', 'Costo Prom.', 'Valor Total']}
              rows={data.materia_prima.items.map(r => [
                r.nombre, r.codigo || '-', r.categoria, r.unidad_medida || '-',
                Number(r.stock || 0).toFixed(2),
                { v: fmt(r.costo_promedio), color: '#64748b' },
                { v: fmt(r.valor_total), color: '#3b82f6', bold: true }
              ])}
              testId="inv-mp-table"
            />
            <TotalRow label="Total Materia Prima" value={data.materia_prima.total} color="#3b82f6" />
          </Card>
        </div>
      )}

      {/* PT Table */}
      {data.producto_terminado.items.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <Card title={`Producto Terminado (${data.producto_terminado.items.length} items)`} icon={Package} testId="inv-pt-card">
            <SimpleTable
              headers={['Articulo', 'Codigo', 'UM', 'Stock', 'Costo Prom.', 'Valor Total']}
              rows={data.producto_terminado.items.map(r => [
                r.nombre, r.codigo || '-', r.unidad_medida || '-',
                Number(r.stock || 0).toFixed(2),
                { v: fmt(r.costo_promedio), color: '#64748b' },
                { v: fmt(r.valor_total), color: '#8b5cf6', bold: true }
              ])}
              testId="inv-pt-table"
            />
            <TotalRow label="Total Producto Terminado" value={data.producto_terminado.total} color="#8b5cf6" />
          </Card>
        </div>
      )}

      {/* WIP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {data.wip.mp_consumida.length > 0 && (
          <Card title="WIP - MP Consumida" icon={Package} testId="inv-wip-mp-card">
            <SimpleTable
              headers={['Articulo', 'Tipo', 'Consumido', 'Valor']}
              rows={data.wip.mp_consumida.map(r => [
                r.inventario_nombre, r.tipo_componente || '-',
                Number(r.consumido || 0).toFixed(2),
                { v: fmt(r.valor), color: '#f59e0b', bold: true }
              ])}
              testId="inv-wip-mp-table"
            />
            <TotalRow label="Total MP Consumida" value={data.wip.total_mp} color="#f59e0b" />
          </Card>
        )}

        {data.wip.servicios.length > 0 && (
          <Card title="WIP - Servicios" icon={Package} testId="inv-wip-srv-card">
            <SimpleTable
              headers={['Descripcion', 'Monto']}
              rows={data.wip.servicios.map(r => [
                r.descripcion || 'Sin descripcion', { v: fmt(r.monto), color: '#f59e0b', bold: true }
              ])}
              testId="inv-wip-srv-table"
            />
            <TotalRow label="Total Servicios" value={data.wip.total_srv} color="#f59e0b" />
          </Card>
        )}
      </div>
    </div>
  );
}


/* ========== RENTABILIDAD POR LINEA ========== */
function RentabilidadLinea({ data }) {
  if (!data) return <Empty />;
  const { lineas, totales } = data;
  const hasData = lineas.some(l => l.ventas > 0 || l.costo_total > 0);

  return (
    <div data-testid="rentabilidad-linea-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <KPI label="Ventas Totales" value={fmt(totales.ventas)} color="#22c55e" icon={ArrowUpRight} />
        <KPI label="Costo Total" value={fmt(totales.costo_total)} color="#ef4444" icon={ArrowDownRight} />
        <KPI label="Margen Bruto" value={fmt(totales.margen_bruto)} subtitle={`${totales.pct_margen}%`} color={totales.margen_bruto >= 0 ? '#166534' : '#991b1b'} icon={TrendingUp} bold />
        <KPI label="Utilidad Neta" value={fmt(totales.utilidad)} color={totales.utilidad >= 0 ? '#166534' : '#991b1b'} icon={BarChart3} bold />
      </div>

      {!hasData ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          <BarChart3 size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>Sin datos de ventas/costos en este periodo</p>
        </div>
      ) : (
        <>
          {/* Main table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={16} color="#64748b" />
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: '#334155' }}>Rentabilidad por Linea de Negocio</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#94a3b8' }}>{data.periodo.desde} - {data.periodo.hasta}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }} data-testid="rentabilidad-table">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Linea de Negocio', 'Ventas', 'Costo MP', 'Costo Srv.', 'Costo Total', 'Margen Bruto', '%', 'Gastos', 'Utilidad'].map((h, i) => (
                    <th key={i} style={{ padding: '6px 10px', textAlign: i === 0 ? 'left' : 'right', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0', fontSize: '0.72rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineas.map((ln, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>{ln.linea_nombre}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{fmt(ln.ventas)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b' }}>{fmt(ln.costo_mp)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b' }}>{fmt(ln.costo_servicios)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>{fmt(ln.costo_total)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: ln.margen_bruto >= 0 ? '#166534' : '#991b1b' }}>{fmt(ln.margen_bruto)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: ln.pct_margen >= 30 ? '#166534' : ln.pct_margen >= 0 ? '#d97706' : '#991b1b' }}>{ln.pct_margen}%</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#ef4444' }}>{fmt(ln.gastos)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: ln.utilidad >= 0 ? '#166534' : '#991b1b' }}>{fmt(ln.utilidad)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0fdf4', borderTop: '2px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>TOTAL</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{fmt(totales.ventas)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }} colSpan={2}></td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmt(totales.costo_total)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: totales.margen_bruto >= 0 ? '#166534' : '#991b1b' }}>{fmt(totales.margen_bruto)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{totales.pct_margen}%</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmt(totales.gastos)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: totales.utilidad >= 0 ? '#166534' : '#991b1b' }}>{fmt(totales.utilidad)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Visual bar comparison */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', padding: '1rem' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>Comparativa Visual</h3>
            {lineas.filter(l => l.ventas > 0 || l.utilidad !== 0).map((ln, i) => {
              const maxVenta = Math.max(...lineas.map(l => l.ventas), 1);
              return (
                <div key={i} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{ln.linea_nombre}</span>
                    <span style={{ color: ln.utilidad >= 0 ? '#166534' : '#991b1b', fontWeight: 600 }}>Utilidad: {fmt(ln.utilidad)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', height: '20px' }}>
                    <div style={{ width: `${(ln.ventas / maxVenta) * 100}%`, background: '#22c55e', borderRadius: '3px 0 0 3px', minWidth: ln.ventas > 0 ? '2px' : 0 }} title={`Ventas: ${fmt(ln.ventas)}`}></div>
                    <div style={{ width: `${(ln.costo_total / maxVenta) * 100}%`, background: '#fbbf24', minWidth: ln.costo_total > 0 ? '2px' : 0 }} title={`Costo: ${fmt(ln.costo_total)}`}></div>
                    <div style={{ width: `${(ln.gastos / maxVenta) * 100}%`, background: '#ef4444', borderRadius: '0 3px 3px 0', minWidth: ln.gastos > 0 ? '2px' : 0 }} title={`Gastos: ${fmt(ln.gastos)}`}></div>
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.65rem', color: '#94a3b8' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#22c55e', borderRadius: 2, marginRight: 4 }}></span>Ventas</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fbbf24', borderRadius: 2, marginRight: 4 }}></span>Costo</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 4 }}></span>Gastos</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/* ========== CXP AGING ========== */
function CxpAging({ data }) {
  if (!data) return <Empty />;
  const { buckets, total, detalle, resumen_proveedor } = data;
  const bucketLabels = { vigente: 'Vigente', '1_30': '1-30 dias', '31_60': '31-60 dias', '61_90': '61-90 dias', '90_plus': '90+ dias' };
  const bucketColors = { vigente: '#22c55e', '1_30': '#3b82f6', '31_60': '#f59e0b', '61_90': '#f97316', '90_plus': '#ef4444' };

  return (
    <div data-testid="cxp-aging-content">
      {/* Aging KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <KPI label="Total CxP" value={fmt(total)} color="#0f172a" icon={Scale} bold />
        {Object.entries(bucketLabels).map(([key, label]) => (
          <KPI key={key} label={label} value={fmt(buckets[key])} color={bucketColors[key]} icon={Clock} />
        ))}
      </div>

      {/* Aging bar */}
      {total > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Distribucion de Antiguedad</h3>
          <div style={{ display: 'flex', height: '32px', borderRadius: '6px', overflow: 'hidden' }}>
            {Object.entries(buckets).map(([key, val]) => val > 0 && (
              <div key={key} style={{ width: `${(val / total) * 100}%`, background: bucketColors[key], minWidth: '2px', position: 'relative' }}
                title={`${bucketLabels[key]}: ${fmt(val)} (${((val / total) * 100).toFixed(1)}%)`}>
                {val / total > 0.08 && (
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
                    {((val / total) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.65rem', color: '#94a3b8', flexWrap: 'wrap' }}>
            {Object.entries(bucketLabels).map(([key, label]) => (
              <span key={key}><span style={{ display: 'inline-block', width: 10, height: 10, background: bucketColors[key], borderRadius: 2, marginRight: 4 }}></span>{label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Resumen por proveedor */}
      {resumen_proveedor?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} color="#64748b" />
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: '#334155' }}>Por Proveedor</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }} data-testid="cxp-proveedor-table">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Proveedor', 'Vigente', '1-30', '31-60', '61-90', '90+', 'Total'].map((h, i) => (
                  <th key={i} style={{ padding: '6px 10px', textAlign: i === 0 ? 'left' : 'right', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0', fontSize: '0.72rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumen_proveedor.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>{p.nombre}</td>
                  {['vigente', '1_30', '31_60', '61_90', '90_plus'].map(b => (
                    <td key={b} style={{ padding: '6px 10px', textAlign: 'right', color: p[b] > 0 ? bucketColors[b] : '#cbd5e1', fontWeight: p[b] > 0 ? 600 : 400 }}>
                      {p[b] > 0 ? fmt(p[b]) : '-'}
                    </td>
                  ))}
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmt(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detalle */}
      {detalle.length > 0 && (
        <AgingDetailTable data={detalle} entityField="proveedor" bucketLabels={bucketLabels} bucketColors={bucketColors} testId="cxp-detalle-table" />
      )}

      {detalle.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          <Clock size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No hay cuentas por pagar pendientes</p>
        </div>
      )}
    </div>
  );
}


/* ========== CXC AGING ========== */
function CxcAging({ data }) {
  if (!data) return <Empty />;
  const { buckets, total, detalle } = data;
  const bucketLabels = { vigente: 'Vigente', '1_30': '1-30 dias', '31_60': '31-60 dias', '61_90': '61-90 dias', '90_plus': '90+ dias' };
  const bucketColors = { vigente: '#22c55e', '1_30': '#3b82f6', '31_60': '#f59e0b', '61_90': '#f97316', '90_plus': '#ef4444' };

  return (
    <div data-testid="cxc-aging-content">
      {/* Aging KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <KPI label="Total CxC" value={fmt(total)} color="#0f172a" icon={Scale} bold />
        {Object.entries(bucketLabels).map(([key, label]) => (
          <KPI key={key} label={label} value={fmt(buckets[key])} color={bucketColors[key]} icon={Clock} />
        ))}
      </div>

      {/* Aging bar */}
      {total > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Distribucion de Antiguedad</h3>
          <div style={{ display: 'flex', height: '32px', borderRadius: '6px', overflow: 'hidden' }}>
            {Object.entries(buckets).map(([key, val]) => val > 0 && (
              <div key={key} style={{ width: `${(val / total) * 100}%`, background: bucketColors[key], minWidth: '2px', position: 'relative' }}
                title={`${bucketLabels[key]}: ${fmt(val)} (${((val / total) * 100).toFixed(1)}%)`}>
                {val / total > 0.08 && (
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
                    {((val / total) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.65rem', color: '#94a3b8', flexWrap: 'wrap' }}>
            {Object.entries(bucketLabels).map(([key, label]) => (
              <span key={key}><span style={{ display: 'inline-block', width: 10, height: 10, background: bucketColors[key], borderRadius: 2, marginRight: 4 }}></span>{label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Detalle */}
      {detalle.length > 0 && (
        <AgingDetailTable data={detalle} entityField="cliente" bucketLabels={bucketLabels} bucketColors={bucketColors} testId="cxc-detalle-table" />
      )}

      {detalle.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          <Clock size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No hay cuentas por cobrar pendientes</p>
        </div>
      )}
    </div>
  );
}


/* ========== AGING DETAIL TABLE (shared) ========== */
function AgingDetailTable({ data, entityField, bucketLabels, bucketColors, testId }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: '#334155' }}>Detalle</h3>
      </div>
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }} data-testid={testId}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
            <tr>
              {[entityField === 'proveedor' ? 'Proveedor' : 'Cliente/Documento', 'Documento', 'Monto Orig.', 'Saldo', 'Vencimiento', 'Dias', 'Estado'].map((h, i) => (
                <th key={i} style={{ padding: '6px 10px', textAlign: i <= 1 ? 'left' : 'right', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0', fontSize: '0.72rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>{d[entityField]}</td>
                <td style={{ padding: '6px 10px', color: '#64748b' }}>{d.documento || d.cliente}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b' }}>{fmt(d.monto_original)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: bucketColors[d.bucket] }}>{fmt(d.saldo)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748b' }}>{d.fecha_vencimiento || '-'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  <span style={{
                    padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    background: d.dias_vencido > 60 ? '#fef2f2' : d.dias_vencido > 30 ? '#fffbeb' : d.dias_vencido > 0 ? '#eff6ff' : '#f0fdf4',
                    color: d.dias_vencido > 60 ? '#dc2626' : d.dias_vencido > 30 ? '#d97706' : d.dias_vencido > 0 ? '#2563eb' : '#16a34a'
                  }}>
                    {d.dias_vencido > 0 ? `${d.dias_vencido}d` : 'Vigente'}
                  </span>
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, background: bucketColors[d.bucket] + '18', color: bucketColors[d.bucket] }}>
                    {bucketLabels[d.bucket]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ========== SHARED COMPONENTS ========== */

function CollapsibleRow({ label, total, isOpen, onToggle, children, simple, hasDetail = true, testId }) {
  const canExpand = !simple && hasDetail && children;
  return (
    <div data-testid={testId}>
      <div
        onClick={canExpand ? onToggle : undefined}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid #f1f5f9',
          cursor: canExpand ? 'pointer' : 'default',
          background: isOpen ? '#f8fafc' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {canExpand && (
            isOpen ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />
          )}
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{label}</span>
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{fmt(total)}</span>
      </div>
      {canExpand && isOpen && (
        <div style={{ borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, subtitle, color, icon: Icon, bold }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
      padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
    }}>
      {Icon && (
        <div style={{ width: 36, height: 36, borderRadius: '8px', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={color} />
        </div>
      )}
      <div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: bold ? '1.125rem' : '1rem', fontWeight: 700, color }}>{value}</div>
        {subtitle && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function SectionCard({ title, total, color, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0, color: '#334155', letterSpacing: '0.05em' }}>{title}</h3>
        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color }}>{fmt(total)}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function GroupHeader({ label, total }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.75rem', borderBottom: '1px solid #f8fafc', background: '#fafbfc' }}>
      <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#475569' }}>{label}</span>
      <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#1e293b' }}>{fmt(total)}</span>
    </div>
  );
}

function Card({ title, icon: Icon, children, testId }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }} data-testid={testId}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon size={16} color="#64748b" />
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0, color: '#334155' }}>{title}</h3>
      </div>
      <div style={{ padding: '0.5rem' }}>{children}</div>
    </div>
  );
}

function SimpleTable({ headers, rows, testId }) {
  if (!rows || !rows.length) return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '1rem' }}>Sin datos</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }} data-testid={testId}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '4px 8px', textAlign: i === 0 ? 'left' : 'right', color: '#64748b', fontWeight: 500, borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
            {row.map((cell, j) => {
              const isObj = typeof cell === 'object' && cell !== null;
              return (
                <td key={j} style={{
                  padding: '4px 8px',
                  textAlign: j === 0 ? 'left' : 'right',
                  fontWeight: (j === 0 || (isObj && cell.bold)) ? 600 : 400,
                  color: isObj ? cell.color : '#1e293b',
                  fontSize: '0.775rem',
                }}>
                  {isObj ? cell.v : cell}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TotalRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderTop: '2px solid #e2e8f0', background: '#fafbfc' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{fmt(value)}</span>
    </div>
  );
}

function Empty() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
      <Minus size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
      <p style={{ fontSize: '0.875rem' }}>Sin datos disponibles</p>
    </div>
  );
}
