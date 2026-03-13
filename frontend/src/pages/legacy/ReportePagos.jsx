import React, { useState, useEffect } from 'react';
import { getPagos, getCentrosCosto, getLineasNegocio, getCuentasFinancieras } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Filter, Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-PE') : '-';

export default function ReportePagos() {
  const { empresaActual } = useEmpresa();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [lineasNegocio, setLineasNegocio] = useState([]);
  const [cuentas, setCuentas] = useState([]);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const [filtros, setFiltros] = useState({
    fecha_desde: inicioMes.toISOString().split('T')[0],
    fecha_hasta: hoy.toISOString().split('T')[0],
    tipo: '',
    centro_costo_id: '',
    linea_negocio_id: '',
    cuenta_financiera_id: ''
  });

  useEffect(() => {
    loadMasterData();
  }, [empresaActual]);

  useEffect(() => {
    loadPagos();
  }, [filtros, empresaActual]);

  const loadMasterData = async () => {
    try {
      const [ccRes, lnRes, ctRes] = await Promise.all([
        getCentrosCosto(), getLineasNegocio(), getCuentasFinancieras()
      ]);
      setCentrosCosto(ccRes.data);
      setLineasNegocio(lnRes.data);
      setCuentas(ctRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPagos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
      if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.centro_costo_id) params.centro_costo_id = filtros.centro_costo_id;
      if (filtros.linea_negocio_id) params.linea_negocio_id = filtros.linea_negocio_id;
      if (filtros.cuenta_financiera_id) params.cuenta_financiera_id = filtros.cuenta_financiera_id;
      const res = await getPagos(params);
      setPagos(res.data);
    } catch (err) {
      toast.error('Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  const totalIngresos = pagos.filter(p => p.tipo === 'ingreso').reduce((s, p) => s + parseFloat(p.monto_total || 0), 0);
  const totalEgresos = pagos.filter(p => p.tipo === 'egreso').reduce((s, p) => s + parseFloat(p.monto_total || 0), 0);

  const handleExport = () => {
    const headers = ['Fecha', 'Numero', 'Tipo', 'Cuenta', 'Centro Costo', 'Linea Negocio', 'Notas', 'Monto'];
    const rows = pagos.map(p => [
      p.fecha, p.numero, p.tipo, p.cuenta_nombre || '', p.centro_costo_nombre || '', p.linea_negocio_nombre || '', p.notas || '', p.monto_total
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_pagos_${filtros.fecha_desde}_${filtros.fecha_hasta}.csv`;
    a.click();
  };

  return (
    <div data-testid="reporte-pagos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporte de Pagos</h1>
          <p className="page-subtitle">Detalle de todos los pagos con centro de costo y línea de negocio</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport} disabled={pagos.length === 0} data-testid="export-pagos-btn">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Total Ingresos</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }} data-testid="rp-total-ingresos">{fmt(totalIngresos)}</div>
            </div>
            <TrendingUp size={28} style={{ color: '#10b981' }} />
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Total Egresos</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }} data-testid="rp-total-egresos">{fmt(totalEgresos)}</div>
            </div>
            <TrendingDown size={28} style={{ color: '#ef4444' }} />
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, letterSpacing: '0.05em' }}>Movimientos</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }} data-testid="rp-total-movimientos">{pagos.length}</div>
            </div>
            <DollarSign size={28} style={{ color: '#6366f1' }} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={filtros.fecha_desde}
              onChange={e => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))} data-testid="rp-fecha-desde" />
          </div>
          <div>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={filtros.fecha_hasta}
              onChange={e => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))} data-testid="rp-fecha-hasta" />
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <select className="form-input form-select" value={filtros.tipo}
              onChange={e => setFiltros(prev => ({ ...prev, tipo: e.target.value }))} data-testid="rp-tipo">
              <option value="">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
            </select>
          </div>
          <div>
            <label className="form-label">Centro de Costo</label>
            <select className="form-input form-select" value={filtros.centro_costo_id}
              onChange={e => setFiltros(prev => ({ ...prev, centro_costo_id: e.target.value }))} data-testid="rp-centro-costo">
              <option value="">Todos</option>
              {centrosCosto.map(cc => <option key={cc.id} value={cc.id}>{cc.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Línea de Negocio</label>
            <select className="form-input form-select" value={filtros.linea_negocio_id}
              onChange={e => setFiltros(prev => ({ ...prev, linea_negocio_id: e.target.value }))} data-testid="rp-linea-negocio">
              <option value="">Todas</option>
              {lineasNegocio.map(ln => <option key={ln.id} value={ln.id}>{ln.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Cuenta</label>
            <select className="form-input form-select" value={filtros.cuenta_financiera_id}
              onChange={e => setFiltros(prev => ({ ...prev, cuenta_financiera_id: e.target.value }))} data-testid="rp-cuenta">
              <option value="">Todas</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="data-table-wrapper">
          {loading ? (
            <div className="loading"><div className="loading-spinner"></div></div>
          ) : pagos.length === 0 ? (
            <div className="empty-state">
              <Filter className="empty-state-icon" />
              <div className="empty-state-title">Sin resultados</div>
              <div className="empty-state-description">Ajusta los filtros para ver pagos</div>
            </div>
          ) : (
            <table className="data-table" data-testid="reporte-pagos-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Cuenta</th>
                  <th>Centro Costo</th>
                  <th>Línea Negocio</th>
                  <th>Notas</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.id}>
                    <td>{fmtDate(pago.fecha)}</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>{pago.numero}</td>
                    <td>
                      <span className={`badge ${pago.tipo === 'ingreso' ? 'badge-success' : 'badge-error'}`}>
                        {pago.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td>{pago.cuenta_nombre || '-'}</td>
                    <td>{pago.centro_costo_nombre || '-'}</td>
                    <td>{pago.linea_negocio_nombre || '-'}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pago.notas || '-'}</td>
                    <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: pago.tipo === 'ingreso' ? '#10b981' : '#ef4444' }}>
                      {fmt(pago.monto_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
                  <td colSpan={7} className="text-right">Total filtrado:</td>
                  <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(totalIngresos - totalEgresos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
