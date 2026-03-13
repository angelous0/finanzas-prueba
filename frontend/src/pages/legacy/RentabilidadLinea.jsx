import React, { useState, useEffect, useCallback } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { TrendingUp, DollarSign, Plus, Trash2, Edit2, RefreshCw, ArrowUpCircle, ArrowDownCircle, Wallet, Target, X } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const fmt = (v) => {
  const n = Number(v) || 0;
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const pct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

const TIPO_LABELS = { capital_inicial: 'Capital Inicial', aporte: 'Aporte', retiro: 'Retiro' };
const TIPO_COLORS = { capital_inicial: 'bg-blue-100 text-blue-700', aporte: 'bg-green-100 text-green-700', retiro: 'bg-red-100 text-red-700' };

export default function RentabilidadLinea() {
  const { empresaActual } = useEmpresa();
  const [vista, setVista] = useState('rendimiento'); // 'rendimiento' | 'recuperacion'
  const [data, setData] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [lineasNegocio, setLineasNegocio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ linea_negocio_id: '', fecha: new Date().toISOString().split('T')[0], tipo_movimiento: 'capital_inicial', monto: '', observacion: '' });
  const [fechaDesde, setFechaDesde] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const eId = empresaActual?.id;

  const fetchData = useCallback(async () => {
    if (!eId) return;
    setLoading(true);
    try {
      const [rentRes, movRes, lnRes] = await Promise.all([
        fetch(`${API}/api/rentabilidad-linea-negocio?empresa_id=${eId}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`).then(r => r.json()),
        fetch(`${API}/api/capital-linea-negocio?empresa_id=${eId}`).then(r => r.json()),
        fetch(`${API}/api/lineas-negocio?empresa_id=${eId}`).then(r => r.json()),
      ]);
      setData(rentRes);
      setMovimientos(movRes.data || []);
      setLineasNegocio(Array.isArray(lnRes) ? lnRes : lnRes.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [eId, fechaDesde, fechaHasta]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.linea_negocio_id || !form.monto) { toast.error('Complete los campos requeridos'); return; }
    try {
      const res = await fetch(`${API}/api/capital-linea-negocio?empresa_id=${eId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, linea_negocio_id: parseInt(form.linea_negocio_id), monto: parseFloat(form.monto) })
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      toast.success('Movimiento registrado');
      setShowModal(false);
      setForm({ linea_negocio_id: '', fecha: new Date().toISOString().split('T')[0], tipo_movimiento: 'capital_inicial', monto: '', observacion: '' });
      fetchData();
    } catch (e) { toast.error(e.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminar este movimiento?')) return;
    try {
      await fetch(`${API}/api/capital-linea-negocio/${id}?empresa_id=${eId}`, { method: 'DELETE' });
      toast.success('Eliminado');
      fetchData();
    } catch (e) { toast.error('Error al eliminar'); }
  };

  if (!eId) return <div className="p-6">Seleccione una empresa</div>;

  const lineas = data?.lineas || [];
  const totales = data?.totales || {};

  return (
    <div className="p-4 md:p-6 space-y-5" data-testid="rentabilidad-linea-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="w-7 h-7 text-violet-600" />
          <div>
            <h1 className="text-2xl font-bold">Rentabilidad por Linea de Negocio</h1>
            <p className="text-sm text-gray-500">Capital, rendimiento y recuperacion</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" data-testid="registrar-capital-btn">
            <Plus className="w-4 h-4 mr-1" /> Registrar Capital
          </button>
          <button onClick={fetchData} className="btn btn-ghost btn-sm"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Vista toggles + Date filters */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border" data-testid="vista-toggle">
          <button onClick={() => setVista('rendimiento')}
            className={`px-4 py-1.5 text-sm font-medium transition ${vista === 'rendimiento' ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            data-testid="vista-rendimiento-btn">
            Rendimiento Economico
          </button>
          <button onClick={() => setVista('recuperacion')}
            className={`px-4 py-1.5 text-sm font-medium transition ${vista === 'recuperacion' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            data-testid="vista-recuperacion-btn">
            Recuperacion de Caja
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="input input-sm" data-testid="rent-fecha-desde" />
          <span className="text-gray-400">a</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="input input-sm" data-testid="rent-fecha-hasta" />
        </div>
      </div>

      {loading ? <div className="text-center py-8">Cargando...</div> : (
        <>
          {/* KPIs */}
          {vista === 'rendimiento' ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="kpi-rendimiento">
              <Kpi label="Capital Total" value={fmt(totales.capital_total)} color="violet" />
              <Kpi label="Ingresos" value={fmt(totales.ingresos)} color="green" />
              <Kpi label="Costos + Gastos" value={fmt((totales.costos || 0) + (totales.gastos || 0))} color="red" />
              <Kpi label="Utilidad" value={fmt(totales.utilidad)} color={totales.utilidad >= 0 ? 'emerald' : 'red'} />
              <Kpi label="ROI Global" value={pct(totales.roi_pct)} color={totales.roi_pct >= 0 ? 'blue' : 'red'} />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="kpi-recuperacion">
              <Kpi label="Capital Invertido" value={fmt(totales.capital_total)} color="violet" />
              <Kpi label="Cobrado Real" value={fmt(totales.cobrado_real)} color="green" />
              <Kpi label="Pagado Real" value={fmt(totales.pagado_real)} color="red" />
              <Kpi label="Flujo Neto Caja" value={fmt(totales.flujo_neto_caja)} color={totales.flujo_neto_caja >= 0 ? 'emerald' : 'red'} />
              <Kpi label="Por Recuperar" value={fmt(totales.saldo_por_recuperar)} color="amber" />
            </div>
          )}

          {/* Table */}
          <div className="card overflow-x-auto" data-testid="rentabilidad-table">
            <table className="table w-full">
              <thead>
                {vista === 'rendimiento' ? (
                  <tr>
                    <th>Linea de Negocio</th>
                    <th className="text-right">Capital Neto</th>
                    <th className="text-right">Ingresos</th>
                    <th className="text-right">Costos</th>
                    <th className="text-right">Gastos</th>
                    <th className="text-right">Utilidad</th>
                    <th className="text-right">ROI</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Linea de Negocio</th>
                    <th className="text-right">Capital Neto</th>
                    <th className="text-right">Cobrado Real</th>
                    <th className="text-right">Pagado Real</th>
                    <th className="text-right">Flujo Neto</th>
                    <th className="text-right">Por Recuperar</th>
                    <th className="text-right">Payback Est.</th>
                    <th className="text-right">Flujo Mensual</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {lineas.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-6 text-gray-400">No hay lineas de negocio con capital registrado</td></tr>
                ) : lineas.map(ln => (
                  vista === 'rendimiento' ? (
                    <tr key={ln.linea_negocio_id} data-testid={`rent-row-${ln.linea_negocio_id}`}>
                      <td className="font-medium">{ln.linea_negocio}</td>
                      <td className="text-right">{fmt(ln.capital_neto)}</td>
                      <td className="text-right text-green-600">{fmt(ln.ingresos)}</td>
                      <td className="text-right text-red-600">{fmt(ln.costos)}</td>
                      <td className="text-right text-orange-600">{fmt(ln.gastos)}</td>
                      <td className={`text-right font-bold ${ln.utilidad >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(ln.utilidad)}</td>
                      <td className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ln.roi_pct >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {pct(ln.roi_pct)}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr key={ln.linea_negocio_id} data-testid={`recup-row-${ln.linea_negocio_id}`}>
                      <td className="font-medium">{ln.linea_negocio}</td>
                      <td className="text-right">{fmt(ln.capital_neto)}</td>
                      <td className="text-right text-green-600">{fmt(ln.cobrado_real)}</td>
                      <td className="text-right text-red-600">{fmt(ln.pagado_real)}</td>
                      <td className={`text-right font-bold ${ln.flujo_neto_caja >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(ln.flujo_neto_caja)}</td>
                      <td className="text-right text-amber-600 font-medium">{fmt(ln.saldo_por_recuperar)}</td>
                      <td className="text-right">
                        {ln.payback_meses != null ? (
                          <span className="text-xs font-medium">{ln.payback_meses} meses</span>
                        ) : <span className="text-xs text-gray-400">N/A</span>}
                      </td>
                      <td className="text-right text-sm">{fmt(ln.flujo_mensual_promedio)}/mes</td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {/* Movimientos de Capital */}
          <div className="card" data-testid="capital-movimientos">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Movimientos de Capital</h3>
              <span className="text-xs text-gray-400">{movimientos.length} registros</span>
            </div>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Linea</th>
                  <th>Tipo</th>
                  <th className="text-right">Monto</th>
                  <th>Observacion</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {movimientos.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-400">Sin movimientos de capital</td></tr>
                ) : movimientos.map(m => (
                  <tr key={m.id} data-testid={`cap-mov-${m.id}`}>
                    <td className="text-sm">{m.fecha?.split('T')[0]}</td>
                    <td className="text-sm font-medium">{m.linea_negocio_nombre}</td>
                    <td><span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[m.tipo_movimiento]}`}>{TIPO_LABELS[m.tipo_movimiento]}</span></td>
                    <td className={`text-right font-medium ${m.tipo_movimiento === 'retiro' ? 'text-red-600' : 'text-emerald-700'}`}>
                      {m.tipo_movimiento === 'retiro' ? '-' : '+'}{fmt(m.monto)}
                    </td>
                    <td className="text-sm text-gray-500 max-w-[200px] truncate">{m.observacion || '-'}</td>
                    <td>
                      <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-600" data-testid={`delete-cap-${m.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} data-testid="capital-modal">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: '1.5rem' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Registrar Movimiento de Capital</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Linea de Negocio *</label>
                <select value={form.linea_negocio_id} onChange={e => setForm(f => ({ ...f, linea_negocio_id: e.target.value }))}
                  className="input w-full mt-1" required data-testid="cap-linea-select">
                  <option value="">Seleccionar...</option>
                  {lineasNegocio.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="input w-full mt-1" required data-testid="cap-fecha" />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo *</label>
                  <select value={form.tipo_movimiento} onChange={e => setForm(f => ({ ...f, tipo_movimiento: e.target.value }))}
                    className="input w-full mt-1" data-testid="cap-tipo-select">
                    <option value="capital_inicial">Capital Inicial</option>
                    <option value="aporte">Aporte</option>
                    <option value="retiro">Retiro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Monto (S/) *</label>
                <input type="number" step="0.01" min="0.01" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  className="input w-full mt-1" required data-testid="cap-monto" />
              </div>
              <div>
                <label className="text-sm font-medium">Observacion</label>
                <input type="text" value={form.observacion} onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
                  className="input w-full mt-1" data-testid="cap-obs" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                <button type="submit" className="btn btn-primary" data-testid="cap-guardar-btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, color = 'gray' }) {
  const colors = {
    violet: 'border-l-violet-500', green: 'border-l-green-500', red: 'border-l-red-500',
    blue: 'border-l-blue-500', emerald: 'border-l-emerald-500', amber: 'border-l-amber-500', gray: 'border-l-gray-300',
  };
  return (
    <div className={`card p-3 border-l-4 ${colors[color]}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}
