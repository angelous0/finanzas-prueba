import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Scale, TrendingUp, Banknote, Package, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import {
  getReporteBalanceGeneral, getReporteEstadoResultados,
  getReporteFlujoCaja, getReporteInventarioValorizado
} from '../services/api';
import { toast } from 'sonner';

const fmt = (v) => `S/ ${Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

const TABS = [
  { id: 'balance', label: 'Balance General', icon: Scale },
  { id: 'egyp', label: 'Estado de Resultados', icon: TrendingUp },
  { id: 'flujo', label: 'Flujo de Caja', icon: Banknote },
  { id: 'inventario', label: 'Inventario Valorizado', icon: Package },
];

export default function ReportesFinancieros() {
  const [tab, setTab] = useState('balance');
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); return d.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});

  const needsDates = tab === 'egyp' || tab === 'flujo';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = needsDates ? { fecha_desde: fechaDesde, fecha_hasta: fechaHasta } : {};
      let result;
      switch (tab) {
        case 'balance':
          result = await getReporteBalanceGeneral();
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
        default: break;
      }
      setData(prev => ({ ...prev, [tab]: result?.data }));
    } catch {
      toast.error('Error cargando reporte');
    } finally {
      setLoading(false);
    }
  }, [tab, fechaDesde, fechaHasta, needsDates]);

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
        </>
      )}
    </div>
  );
}


/* ========== BALANCE GENERAL ========== */
function BalanceGeneral({ data }) {
  if (!data) return <Empty />;
  const { activos, pasivos, patrimonio } = data;

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
            <GroupHeader label="Caja y Bancos" total={activos.caja_bancos.total} />
            <SimpleTable
              headers={['Cuenta', 'Tipo', 'Saldo']}
              rows={activos.caja_bancos.cuentas.map(c => [
                c.nombre, c.tipo, { v: fmt(c.saldo_actual), color: '#22c55e', bold: true }
              ])}
              testId="balance-cuentas-table"
            />

            <GroupHeader label="Cuentas por Cobrar" total={activos.cuentas_por_cobrar} />

            <GroupHeader label="Inventario Materia Prima" total={activos.inventario_mp.total} />
            {activos.inventario_mp.detalle.length > 0 && (
              <SimpleTable
                headers={['Categoria', 'Cantidad', 'Valor']}
                rows={activos.inventario_mp.detalle.map(r => [
                  r.categoria, Number(r.cantidad || 0).toFixed(2), { v: fmt(r.valor), color: '#22c55e' }
                ])}
                testId="balance-inv-mp-table"
              />
            )}

            <GroupHeader label="Inventario Producto Terminado" total={activos.inventario_pt} />

            <GroupHeader label="Trabajo en Proceso (WIP)" total={activos.wip.total} />
            <div style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>MP Consumida</span><span>{fmt(activos.wip.mp_consumida)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Servicios</span><span>{fmt(activos.wip.servicios)}</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* PASIVOS + PATRIMONIO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SectionCard title="PASIVOS" total={pasivos.total} color="#ef4444">
            <GroupHeader label="Cuentas por Pagar" total={pasivos.cuentas_por_pagar} />
            <GroupHeader label="Letras por Pagar" total={pasivos.letras_por_pagar} />
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


/* ========== SHARED COMPONENTS ========== */

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
