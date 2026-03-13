import React, { useState, useEffect } from 'react';
import { getInventario } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { toast } from 'sonner';
import { Search, Package, AlertTriangle } from 'lucide-react';

export default function Articulos() {
  const { empresaActual } = useEmpresa();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getInventario(search || undefined);
      setItems(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar artículos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [search, empresaActual]);

  const fmt = (n) => n != null ? parseFloat(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

  return (
    <div data-testid="articulos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Artículos</h1>
          <p className="page-subtitle">Inventario desde produccion.prod_inventario</p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
            data-testid="articulos-search"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Cargando...</div>
        ) : items.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <Package size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
            <div className="empty-state-title">Sin artículos</div>
            <p style={{ color: '#9ca3af' }}>No se encontraron artículos</p>
          </div>
        ) : (
          <table className="data-table" data-testid="articulos-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>Stock Mín.</th>
                <th style={{ textAlign: 'right' }}>Costo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const stockBajo = item.stock_actual != null && item.stock_minimo != null && parseFloat(item.stock_actual) <= parseFloat(item.stock_minimo);
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.codigo || '-'}</td>
                    <td>{item.nombre}</td>
                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>{item.categoria || '-'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.unidad_medida || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: stockBajo ? '#ef4444' : '#111827' }}>
                      {fmt(item.stock_actual)}
                      {stockBajo && <AlertTriangle size={14} style={{ marginLeft: '0.25rem', color: '#ef4444', verticalAlign: 'text-bottom' }} />}
                    </td>
                    <td style={{ textAlign: 'right', color: '#6b7280' }}>{fmt(item.stock_minimo)}</td>
                    <td style={{ textAlign: 'right' }}>{item.costo_compra ? `S/ ${fmt(item.costo_compra)}` : '-'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '9999px',
                        fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                        background: item.activo !== false ? '#d1fae5' : '#fee2e2',
                        color: item.activo !== false ? '#065f46' : '#991b1b'
                      }}>
                        {item.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
