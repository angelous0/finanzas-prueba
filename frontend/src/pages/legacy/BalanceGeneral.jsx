import React, { useState, useEffect } from 'react';
import { getReporteBalanceGeneral } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value, symbol = 'S/') => {
  return `${symbol} ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
};

export const BalanceGeneral = () => {
  const { empresaActual } = useEmpresa();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [empresaActual]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getReporteBalanceGeneral();
      setData(response.data);
    } catch (error) {
      console.error('Error loading balance:', error);
      toast.error('Error al cargar balance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div data-testid="balance-general-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Balance General</h1>
          <p className="page-subtitle">Resumen de activos, pasivos y patrimonio</p>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
          {/* Activos */}
          <div className="card">
            <div className="card-header" style={{ background: '#dcfce7' }}>
              <h3 className="card-title" style={{ color: '#166534' }}>Activos</h3>
            </div>
            <div className="card-content">
              {data?.activos?.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.5rem 0',
                  borderBottom: index < data.activos.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <span>{item.cuenta}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                    {formatCurrency(item.monto)}
                  </span>
                </div>
              ))}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '0.75rem 0',
                borderTop: '2px solid var(--border)',
                marginTop: '0.5rem',
                fontWeight: 600
              }}>
                <span>Total Activos</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#22C55E' }}>
                  {formatCurrency(data?.total_activos)}
                </span>
              </div>
            </div>
          </div>

          {/* Pasivos */}
          <div className="card">
            <div className="card-header" style={{ background: '#fee2e2' }}>
              <h3 className="card-title" style={{ color: '#991b1b' }}>Pasivos</h3>
            </div>
            <div className="card-content">
              {data?.pasivos?.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.5rem 0',
                  borderBottom: index < data.pasivos.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <span>{item.cuenta}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                    {formatCurrency(item.monto)}
                  </span>
                </div>
              ))}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '0.75rem 0',
                borderTop: '2px solid var(--border)',
                marginTop: '0.5rem',
                fontWeight: 600
              }}>
                <span>Total Pasivos</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#EF4444' }}>
                  {formatCurrency(data?.total_pasivos)}
                </span>
              </div>
            </div>
          </div>

          {/* Patrimonio */}
          <div className="card">
            <div className="card-header" style={{ background: '#dbeafe' }}>
              <h3 className="card-title" style={{ color: '#1e40af' }}>Patrimonio</h3>
            </div>
            <div className="card-content">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '0.5rem 0'
              }}>
                <span>Capital</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                  {formatCurrency(data?.patrimonio)}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '0.75rem 0',
                borderTop: '2px solid var(--border)',
                marginTop: '0.5rem',
                fontWeight: 600
              }}>
                <span>Total Patrimonio</span>
                <span style={{ 
                  fontFamily: "'JetBrains Mono', monospace", 
                  color: data?.patrimonio >= 0 ? '#3B82F6' : '#EF4444'
                }}>
                  {formatCurrency(data?.patrimonio)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ecuación contable */}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-content">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '2rem',
              fontSize: '1.25rem',
              fontWeight: 600
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>ACTIVOS</div>
                <div style={{ color: '#22C55E' }}>{formatCurrency(data?.total_activos)}</div>
              </div>
              <span>=</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>PASIVOS</div>
                <div style={{ color: '#EF4444' }}>{formatCurrency(data?.total_pasivos)}</div>
              </div>
              <span>+</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>PATRIMONIO</div>
                <div style={{ color: '#3B82F6' }}>{formatCurrency(data?.patrimonio)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceGeneral;
