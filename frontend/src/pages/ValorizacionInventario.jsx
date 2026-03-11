import React, { useState, useEffect, useCallback } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { Package, Search, Filter, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const fmt = (val) => {
  const n = Number(val) || 0;
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ValorizacionInventario() {
  const { empresaActual } = useEmpresa();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);

  const eId = empresaActual?.id;

  const fetchData = useCallback(async () => {
    if (!eId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ empresa_id: eId });
      if (search) params.set('search', search);
      if (categoria) params.set('categoria', categoria);
      const res = await fetch(`${API}/api/valorizacion-inventario?${params}`);
      setData(await res.json());
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }, [eId, search, categoria]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!eId) return <div className="p-6">Seleccione una empresa</div>;

  return (
    <div className="p-4 md:p-6 space-y-5" data-testid="valorizacion-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Valorizacion de Inventario</h1>
            <p className="text-sm text-gray-500">Costeo FIFO - Materia prima desde Produccion</p>
          </div>
        </div>
        <button onClick={fetchData} className="btn btn-ghost" data-testid="refresh-val-btn">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="valorizacion-kpis">
          <div className="card p-4 border-l-4 border-l-blue-500">
            <div className="text-xs text-gray-500 font-medium">Total Articulos</div>
            <div className="text-2xl font-bold mt-1">{data.total_articulos}</div>
          </div>
          <div className="card p-4 border-l-4 border-l-emerald-500">
            <div className="text-xs text-gray-500 font-medium">Valor Total FIFO</div>
            <div className="text-2xl font-bold mt-1 text-emerald-700">{fmt(data.total_valor_fifo)}</div>
          </div>
          <div className="card p-4 border-l-4 border-l-amber-500">
            <div className="text-xs text-gray-500 font-medium">Valor Total Promedio</div>
            <div className="text-2xl font-bold mt-1">{fmt(data.total_valor_promedio)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3" data-testid="valorizacion-filtros">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar articulo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input input-sm pl-8"
            data-testid="valorizacion-search"
          />
        </div>
        <select
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          className="input input-sm"
          data-testid="valorizacion-cat-filter"
        >
          <option value="">Todas las categorias</option>
          {data?.categorias?.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto" data-testid="valorizacion-table">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Categoria</th>
              <th>Unidad</th>
              <th className="text-right">Stock</th>
              <th className="text-right">Costo FIFO Unit.</th>
              <th className="text-right">Valor FIFO</th>
              <th className="text-right">Costo Promedio</th>
              <th className="text-right">Valor Promedio</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-8">Cargando...</td></tr>
            ) : !data?.data?.length ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">Sin articulos</td></tr>
            ) : data.data.map(item => (
              <React.Fragment key={item.id}>
                <tr
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  data-testid={`val-row-${item.codigo}`}
                >
                  <td>
                    {item.lotes_fifo?.length > 0 ? (
                      expandedItem === item.id
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronRight className="w-4 h-4 text-gray-400" />
                    ) : <span className="w-4 h-4 inline-block" />}
                  </td>
                  <td className="font-mono text-sm">{item.codigo}</td>
                  <td className="font-medium text-sm">{item.nombre}</td>
                  <td><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{item.categoria}</span></td>
                  <td className="text-sm">{item.unidad}</td>
                  <td className={`text-right font-medium ${item.stock_actual < 0 ? 'text-red-600' : ''}`}>
                    {item.stock_actual.toLocaleString('es-PE')}
                  </td>
                  <td className="text-right font-mono text-sm">{fmt(item.costo_fifo_unitario)}</td>
                  <td className="text-right font-bold text-emerald-700">{fmt(item.valor_fifo)}</td>
                  <td className="text-right font-mono text-sm">{fmt(item.costo_promedio)}</td>
                  <td className="text-right">{fmt(item.valor_promedio)}</td>
                </tr>
                {expandedItem === item.id && item.lotes_fifo?.length > 0 && (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <div className="bg-blue-50 p-3 ml-8 mr-4 mb-2 rounded-lg">
                        <h4 className="text-xs font-semibold text-blue-700 mb-2">Lotes FIFO disponibles (mas antiguo primero)</h4>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left pb-1">Fecha Ingreso</th>
                              <th className="text-left pb-1">Documento</th>
                              <th className="text-right pb-1">Cant. Disponible</th>
                              <th className="text-right pb-1">Costo Unitario</th>
                              <th className="text-right pb-1">Valor Lote</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.lotes_fifo.map((lote, i) => (
                              <tr key={lote.id || i} className="border-t border-blue-100">
                                <td className="py-1">{lote.fecha?.split('T')[0] || '-'}</td>
                                <td>{lote.documento || '-'}</td>
                                <td className="text-right font-mono">{lote.cantidad_disponible.toLocaleString('es-PE')}</td>
                                <td className="text-right font-mono">{fmt(lote.costo_unitario)}</td>
                                <td className="text-right font-mono font-medium">
                                  {fmt(lote.cantidad_disponible * lote.costo_unitario)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          {data?.data?.length > 0 && (
            <tfoot>
              <tr className="font-bold border-t-2">
                <td colSpan={7} className="text-right">TOTAL</td>
                <td className="text-right text-emerald-700">{fmt(data.total_valor_fifo)}</td>
                <td></td>
                <td className="text-right">{fmt(data.total_valor_promedio)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
