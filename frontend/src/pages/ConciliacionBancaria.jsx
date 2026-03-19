import React, { useState, useEffect, useCallback } from 'react';
import { 
  getCuentasFinancieras, getMovimientosBanco, getPagos,
  importarExcelBanco, getConciliaciones, conciliarMovimientos, previsualizarExcelBanco,
  crearGastoBancario, getCategorias
} from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { 
  Upload, Search, RefreshCw, Check, X, FileSpreadsheet, 
  AlertCircle, CheckCircle, Clock, ArrowDown, Download,
  Building2, Link2, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value, symbol = 'S/') => {
  return `${symbol} ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE');
};

const BANCOS = [
  { id: 'BCP', nombre: 'BCP - Banco de Crédito' },
  { id: 'BBVA', nombre: 'BBVA Continental' },
  { id: 'IBK', nombre: 'Interbank' },
  { id: 'SCOTIABANK', nombre: 'Scotiabank' },
  { id: 'PERSONALIZADO', nombre: 'Personalizado' }
];

export const ConciliacionBancaria = () => {
  const { empresaActual } = useEmpresa();

  const [cuentas, setCuentas] = useState([]);
  const [movimientosBanco, setMovimientosBanco] = useState([]);
  const [movimientosSistema, setMovimientosSistema] = useState([]);
  const [conciliaciones, setConciliaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [bancoSeleccionado, setBancoSeleccionado] = useState('BCP');
  const [filtroBanco, setFiltroBanco] = useState('pendientes'); // New filter state
  
  const [selectedBanco, setSelectedBanco] = useState([]);
  const [selectedSistema, setSelectedSistema] = useState([]);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState('pendientes');
  const [expandedBanco, setExpandedBanco] = useState(true);
  const [expandedSistema, setExpandedSistema] = useState(true);
  
  // Modal de gasto bancario
  const [showGastoBancarioModal, setShowGastoBancarioModal] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [gastoData, setGastoData] = useState({
    categoria_id: '',
    descripcion: 'Gastos bancarios'
  });

  useEffect(() => {
    loadInitialData();
  }, [empresaActual]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [cuentasRes, categoriasRes] = await Promise.all([
        getCuentasFinancieras('banco'),
        getCategorias('egreso')
      ]);
      setCuentas(cuentasRes.data || []);
      setCategorias(categoriasRes.data || []);
      
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      setFechaDesde(lastMonth.toISOString().split('T')[0]);
      setFechaHasta(today.toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadMovimientos = useCallback(async () => {
    if (!cuentaSeleccionada) {
      toast.error('Seleccione una cuenta bancaria');
      return;
    }
    
    try {
      setLoading(true);
      const [bancoPendientesRes, bancoConciliadosRes, sistemaPendientesRes, sistemaConciliadosRes, concilRes] = await Promise.all([
        getMovimientosBanco({ cuenta_financiera_id: cuentaSeleccionada, conciliado: false }),
        getMovimientosBanco({ cuenta_financiera_id: cuentaSeleccionada, conciliado: true }),
        getPagos({ cuenta_financiera_id: cuentaSeleccionada, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, conciliado: false }),
        getPagos({ cuenta_financiera_id: cuentaSeleccionada, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, conciliado: true }),
        getConciliaciones(cuentaSeleccionada)
      ]);
      
      // Combine pending and reconciled movements for both bank and system
      const allBancoMovements = [...(bancoPendientesRes.data || []), ...(bancoConciliadosRes.data || [])];
      const allSistemaMovements = [...(sistemaPendientesRes.data || []), ...(sistemaConciliadosRes.data || [])];
      
      setMovimientosBanco(allBancoMovements);
      setMovimientosSistema(allSistemaMovements);
      setConciliaciones(concilRes.data || []);
      setSelectedBanco([]);
      setSelectedSistema([]);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast.error('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [cuentaSeleccionada, fechaDesde, fechaHasta]);

  const handlePreviewExcel = async () => {
    if (!uploadFile) return;
    
    try {
      setImporting(true);
      const result = await previsualizarExcelBanco(uploadFile, bancoSeleccionado);
      setPreviewData(result.data.preview);
      setShowImportModal(false);
      setShowPreviewModal(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al previsualizar Excel');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!uploadFile || !cuentaSeleccionada) return;
    
    try {
      setImporting(true);
      const result = await importarExcelBanco(uploadFile, cuentaSeleccionada, bancoSeleccionado);
      const data = result.data;
      
      let msg = '';
      if (data.imported > 0) msg += `${data.imported} nuevos`;
      if (data.updated > 0) msg += `${msg ? ', ' : ''}${data.updated} actualizados`;
      if (data.skipped > 0) msg += `${msg ? ', ' : ''}${data.skipped} omitidos (ya conciliados)`;
      
      toast.success(msg || 'Importación completada');
      setShowPreviewModal(false);
      setUploadFile(null);
      setPreviewData(null);
      loadMovimientos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al importar Excel');
    } finally {
      setImporting(false);
    }
  };

  const handleImportExcel = async () => {
    // Show preview first
    handlePreviewExcel();
  };

  const handleSelectBanco = (id) => {
    setSelectedBanco(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectSistema = (id) => {
    setSelectedSistema(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConciliarManual = async () => {
    if (selectedBanco.length === 0 || selectedSistema.length === 0) {
      toast.error('Seleccione movimientos de ambos lados');
      return;
    }
    
    const totalBanco = selectedBanco.reduce((sum, id) => {
      const mov = movimientosBanco.find(m => m.id === id);
      return sum + (mov ? (mov.monto || 0) : 0);
    }, 0);
    
    const totalSistema = selectedSistema.reduce((sum, id) => {
      const mov = movimientosSistema.find(m => m.id === id);
      return sum + (mov ? (mov.tipo === 'ingreso' ? mov.monto_total : -mov.monto_total) : 0);
    }, 0);
    
    if (Math.abs(totalBanco - totalSistema) > 0.01) {
      toast.error(`Los montos no coinciden: Banco ${formatCurrency(totalBanco)} vs Sistema ${formatCurrency(totalSistema)}`);
      return;
    }
    
    try {
      setLoading(true);
      await conciliarMovimientos(selectedBanco, selectedSistema);
      toast.success('Movimientos conciliados exitosamente');
      await loadMovimientos();
    } catch (error) {
      console.error('Error al conciliar:', error);
      toast.error('Error al guardar la conciliación');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCrearGastoBancario = () => {
    if (selectedBanco.length === 0) {
      toast.error('Seleccione al menos un movimiento bancario');
      return;
    }
    
    // Reset form
    setGastoData({
      categoria_id: categorias.length > 0 ? categorias[0].id : '',
      descripcion: 'Gastos bancarios (ITF, comisiones)'
    });
    
    setShowGastoBancarioModal(true);
  };
  
  const handleConfirmarGastoBancario = async () => {
    if (!gastoData.categoria_id) {
      toast.error('Seleccione una categoría');
      return;
    }
    
    try {
      setLoading(true);
      const result = await crearGastoBancario(
        selectedBanco,
        gastoData.categoria_id,
        cuentaSeleccionada,
        gastoData.descripcion
      );
      
      toast.success(`Gasto creado: ${result.data.gasto_numero} (${result.data.movimientos_conciliados} movimientos)`);
      setShowGastoBancarioModal(false);
      setSelectedBanco([]);
      await loadMovimientos();
    } catch (error) {
      console.error('Error al crear gasto:', error);
      toast.error(error.response?.data?.detail || 'Error al crear gasto');
    } finally {
      setLoading(false);
    }
  };

  const handleConciliarAuto = async () => {
    if (movimientosBanco.length === 0 || movimientosSistema.length === 0) {
      toast.error('No hay movimientos para conciliar');
      return;
    }
    
    let conciliados = 0;
    const bancoUsados = new Set();
    const sistemaUsados = new Set();
    
    for (const movBanco of movimientosBanco) {
      if (bancoUsados.has(movBanco.id)) continue;
      const montoBanco = movBanco.monto || 0;
      
      for (const movSistema of movimientosSistema) {
        if (sistemaUsados.has(movSistema.id)) continue;
        const montoSistema = movSistema.tipo === 'ingreso' ? movSistema.monto_total : -movSistema.monto_total;
        
        if (Math.abs(montoBanco - montoSistema) < 0.01) {
          const fechaBanco = new Date(movBanco.fecha);
          const fechaSistema = new Date(movSistema.fecha);
          const diffDays = Math.abs((fechaBanco - fechaSistema) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 3) {
            bancoUsados.add(movBanco.id);
            sistemaUsados.add(movSistema.id);
            conciliados++;
            break;
          }
        }
      }
    }
    
    if (conciliados > 0) {
      toast.success(`Se conciliaron ${conciliados} movimientos automáticamente`);
      loadMovimientos();
    } else {
      toast.info('No se encontraron coincidencias automáticas');
    }
  };

  const pendientesBanco = movimientosBanco.filter(m => !m.conciliado).length;
  const pendientesSistema = movimientosSistema.filter(m => !m.conciliado).length;
  
  // Calculate totals for pending items
  const movsPendientesBanco = movimientosBanco.filter(m => !m.conciliado);
  const movsPendientesSistema = movimientosSistema.filter(m => !m.conciliado);
  
  const totalBancoPendiente = movsPendientesBanco.reduce((sum, m) => sum + (m.monto || 0), 0);
  const totalSistemaPendiente = movsPendientesSistema.reduce((sum, m) => 
    sum + (m.tipo === 'ingreso' ? m.monto_total : -m.monto_total), 0);
  
  // Diferencia: Esta es la diferencia absoluta entre pendientes
  // Si está cerca de 0, significa que todo cuadra
  const diferencia = Math.abs(totalBancoPendiente) - Math.abs(totalSistemaPendiente);

  const selectedBancoTotal = selectedBanco.reduce((sum, id) => {
    const mov = movimientosBanco.find(m => m.id === id);
    return sum + (mov ? (mov.monto || 0) : 0);
  }, 0);

  const selectedSistemaTotal = selectedSistema.reduce((sum, id) => {
    const mov = movimientosSistema.find(m => m.id === id);
    return sum + (mov ? (mov.tipo === 'ingreso' ? mov.monto_total : -mov.monto_total) : 0);
  }, 0);

  return (
    <div className="page" data-testid="conciliacion-page">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Conciliación Bancaria</h1>
          <p className="page-subtitle">Concilie los movimientos del banco con el sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline"
            onClick={() => setShowImportModal(true)}
            disabled={!cuentaSeleccionada}
          >
            <Upload size={16} />
            Importar Excel
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleConciliarAuto}
            disabled={movimientosBanco.length === 0}
          >
            <RefreshCw size={16} />
            Conciliar Auto
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '220px', marginBottom: 0 }}>
            <label className="form-label">Cuenta Bancaria</label>
            <select
              className="form-input form-select"
              value={cuentaSeleccionada}
              onChange={(e) => setCuentaSeleccionada(e.target.value)}
            >
              <option value="">Seleccionar cuenta...</option>
              {cuentas.map(cuenta => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre} - {cuenta.banco}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Desde</label>
            <input
              type="date"
              className="form-input"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hasta</label>
            <input
              type="date"
              className="form-input"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={loadMovimientos}
            disabled={!cuentaSeleccionada}
          >
            <Search size={16} />
            Buscar
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '0.75rem', 
        marginBottom: '1.25rem' 
      }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Banco Pendientes</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{pendientesBanco}</div>
            <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>{formatCurrency(totalBancoPendiente)}</div>
          </div>
        </div>
        
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSpreadsheet size={18} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Sistema Pendientes</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{pendientesSistema}</div>
            <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600 }}>{formatCurrency(totalSistemaPendiente)}</div>
          </div>
        </div>
        
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={18} color="#7c3aed" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Conciliados</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{conciliaciones.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#7c3aed' }}>Este periodo</div>
          </div>
        </div>
        
        <div style={{ background: '#fff', border: `1px solid ${diferencia === 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '8px', background: diferencia === 0 ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {diferencia === 0 ? <Check size={18} color="#16a34a" /> : <AlertCircle size={18} color="#dc2626" />}
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Diferencia</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: diferencia === 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(Math.abs(diferencia))}</div>
            <div style={{ fontSize: '0.7rem', color: diferencia === 0 ? '#16a34a' : '#dc2626' }}>
              {diferencia === 0 ? 'Cuadrado' : diferencia > 0 ? 'Banco mayor' : 'Sistema mayor'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs mejorados */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        padding: '0.75rem',
        background: '#f8fafc',
        borderRadius: '12px'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('pendientes')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'pendientes' ? 'white' : 'transparent',
              color: activeTab === 'pendientes' ? '#1B4D3E' : '#64748b',
              boxShadow: activeTab === 'pendientes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Clock size={16} /> Pendientes
          </button>
          <button 
            onClick={() => setActiveTab('banco')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'banco' ? 'white' : 'transparent',
              color: activeTab === 'banco' ? '#1B4D3E' : '#64748b',
              boxShadow: activeTab === 'banco' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Building2 size={16} /> Movimientos Banco
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: activeTab === 'historial' ? 'white' : 'transparent',
              color: activeTab === 'historial' ? '#1B4D3E' : '#64748b',
              boxShadow: activeTab === 'historial' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <CheckCircle size={16} /> Historial
          </button>
        </div>

        {/* Filter for Movimientos del Banco - Only show in Movimientos Banco tab */}
        {activeTab === 'banco' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '0.5rem', fontWeight: 500 }}>
              Filtrar:
            </span>
            <button
              onClick={() => setFiltroBanco('pendientes')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: filtroBanco === 'pendientes' ? '#2563eb' : 'white',
                color: filtroBanco === 'pendientes' ? 'white' : '#64748b',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Pendientes ({movimientosBanco.filter(m => !m.conciliado).length})
            </button>
            <button
              onClick={() => setFiltroBanco('conciliados')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: filtroBanco === 'conciliados' ? '#2563eb' : 'white',
                color: filtroBanco === 'conciliados' ? 'white' : '#64748b',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Conciliados ({movimientosBanco.filter(m => m.conciliado).length})
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'pendientes' && (
        <>
          {/* Side by side layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: (selectedBanco.length > 0 || selectedSistema.length > 0) ? '5rem' : '1rem' }}>
            
            {/* LEFT: Banco */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.625rem 1rem', borderBottom: '2px solid #2563eb', background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>
                    Banco ({movimientosBanco.filter(m => !m.conciliado).length})
                  </span>
                  {selectedBanco.length > 0 && (
                    <span style={{ background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                      {selectedBanco.length} sel.
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(totalBancoPendiente)}</span>
              </div>
              
              <div style={{ maxHeight: '500px', overflow: 'auto', flex: 1 }}>
                {loading ? (
                  <div className="loading" style={{ padding: '2rem' }}><div className="loading-spinner"></div></div>
                ) : movimientosBanco.filter(m => !m.conciliado).length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <Upload size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.8rem' }}>No hay movimientos. Importe un Excel.</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }} data-testid="banco-table">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: 32, padding: '6px 8px' }}>
                          <input type="checkbox" style={{ width: 14, height: 14 }}
                            checked={selectedBanco.length === movimientosBanco.filter(m => !m.conciliado).length && movimientosBanco.filter(m => !m.conciliado).length > 0}
                            onChange={() => {
                              const pending = movimientosBanco.filter(m => !m.conciliado);
                              setSelectedBanco(selectedBanco.length === pending.length ? [] : pending.map(m => m.id));
                            }} />
                        </th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Fecha</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Ref</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Descripcion</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosBanco.filter(m => !m.conciliado).map(mov => {
                        const isSelected = selectedBanco.includes(mov.id);
                        return (
                          <tr key={mov.id} onClick={() => handleSelectBanco(mov.id)}
                            style={{ cursor: 'pointer', borderBottom: '1px solid #f8fafc', background: isSelected ? '#eff6ff' : 'transparent', transition: 'background 0.1s' }}>
                            <td style={{ padding: '5px 8px' }} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected} onChange={() => handleSelectBanco(mov.id)} style={{ width: 14, height: 14 }} />
                            </td>
                            <td style={{ padding: '5px 8px', whiteSpace: 'nowrap', color: '#475569' }}>{formatDate(mov.fecha)}</td>
                            <td style={{ padding: '5px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: '#64748b' }}>{mov.referencia || '-'}</td>
                            <td style={{ padding: '5px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>{mov.descripcion}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: mov.monto < 0 ? '#dc2626' : '#16a34a', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                              {formatCurrency(mov.monto, mov.monto < 0 ? '-S/' : 'S/')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* RIGHT: Sistema */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.625rem 1rem', borderBottom: '2px solid #d97706', background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileSpreadsheet size={16} color="#d97706" />
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>
                    Sistema ({movimientosSistema.filter(m => !m.conciliado).length})
                  </span>
                  {selectedSistema.length > 0 && (
                    <span style={{ background: '#fff7ed', color: '#d97706', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                      {selectedSistema.length} sel.
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706' }}>{formatCurrency(totalSistemaPendiente)}</span>
              </div>
              
              <div style={{ maxHeight: '500px', overflow: 'auto', flex: 1 }}>
                {loading ? (
                  <div className="loading" style={{ padding: '2rem' }}><div className="loading-spinner"></div></div>
                ) : movimientosSistema.filter(m => !m.conciliado).length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <FileSpreadsheet size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.8rem' }}>{cuentaSeleccionada ? 'No hay movimientos pendientes' : 'Seleccione una cuenta'}</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }} data-testid="sistema-table">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: 32, padding: '6px 8px' }}>
                          <input type="checkbox" style={{ width: 14, height: 14 }}
                            checked={selectedSistema.length === movimientosSistema.filter(m => !m.conciliado).length && movimientosSistema.filter(m => !m.conciliado).length > 0}
                            onChange={() => {
                              const pending = movimientosSistema.filter(m => !m.conciliado);
                              setSelectedSistema(selectedSistema.length === pending.length ? [] : pending.map(m => m.id));
                            }} />
                        </th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Fecha</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Numero</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Tipo</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Descripcion</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosSistema.filter(m => !m.conciliado).map(mov => {
                        const isSelected = selectedSistema.includes(mov.id);
                        return (
                          <tr key={mov.id} onClick={() => handleSelectSistema(mov.id)}
                            style={{ cursor: 'pointer', borderBottom: '1px solid #f8fafc', background: isSelected ? '#fff7ed' : 'transparent', transition: 'background 0.1s' }}>
                            <td style={{ padding: '5px 8px' }} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected} onChange={() => handleSelectSistema(mov.id)} style={{ width: 14, height: 14 }} />
                            </td>
                            <td style={{ padding: '5px 8px', whiteSpace: 'nowrap', color: '#475569' }}>{formatDate(mov.fecha)}</td>
                            <td style={{ padding: '5px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: '#64748b' }}>{mov.numero}</td>
                            <td style={{ padding: '5px 8px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', 
                                background: mov.tipo === 'ingreso' ? '#dcfce7' : '#fee2e2', color: mov.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>
                                {mov.tipo === 'ingreso' ? 'ING' : 'EGR'}
                              </span>
                            </td>
                            <td style={{ padding: '5px 8px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                              {mov.notas || mov.tercero_nombre || '-'}
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem',
                              color: mov.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>
                              {mov.tipo === 'ingreso' ? '' : '-'}{formatCurrency(mov.monto_total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Floating Action Bar */}
          {(selectedBanco.length > 0 || selectedSistema.length > 0) && (
            <div style={{ 
              position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
              background: '#fff', borderRadius: '12px', padding: '0.75rem 1.25rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '90vw'
            }} data-testid="conciliacion-action-bar">
              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Building2 size={14} color="#2563eb" />
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>{selectedBanco.length}</span>
                  <span style={{ color: '#64748b' }}>=</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(selectedBancoTotal)}</span>
                </div>
                <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <FileSpreadsheet size={14} color="#d97706" />
                  <span style={{ fontWeight: 600, color: '#d97706' }}>{selectedSistema.length}</span>
                  <span style={{ color: '#64748b' }}>=</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(selectedSistemaTotal)}</span>
                </div>
                {selectedBanco.length > 0 && selectedSistema.length > 0 && (
                  <>
                    <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
                    {Math.abs(selectedBancoTotal - selectedSistemaTotal) < 0.01 ? (
                      <Check size={18} color="#16a34a" />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                        Dif: {formatCurrency(Math.abs(selectedBancoTotal - selectedSistemaTotal))}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedBanco.length > 0 && selectedSistema.length > 0 && Math.abs(selectedBancoTotal - selectedSistemaTotal) < 0.01 && (
                  <button className="btn btn-primary btn-sm" onClick={handleConciliarManual} data-testid="conciliar-btn"
                    style={{ borderRadius: '8px', fontWeight: 600 }}>
                    <Check size={14} /> Conciliar
                  </button>
                )}
                {selectedBanco.length > 0 && selectedSistema.length === 0 && (
                  <button className="btn btn-sm" onClick={handleCrearGastoBancario} data-testid="gasto-bancario-btn"
                    style={{ borderRadius: '8px', fontWeight: 600, background: '#ea580c', color: '#fff', border: 'none' }}>
                    <FileSpreadsheet size={14} /> Gasto Bancario
                  </button>
                )}
                <button className="btn btn-outline btn-sm" onClick={() => { setSelectedBanco([]); setSelectedSistema([]); }}
                  style={{ borderRadius: '8px' }}>
                  <X size={14} /> Limpiar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'banco' && (
        <div className="card">
          <div className="data-table-wrapper">
            {movimientosBanco.length === 0 ? (
              <div className="empty-state">
                <Upload className="empty-state-icon" />
                <div className="empty-state-title">No hay movimientos importados</div>
                <div className="empty-state-description">Importe un archivo Excel del banco</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nro Operación</th>
                    <th>Descripción</th>
                    <th className="text-right">Monto</th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosBanco
                    .filter(m => filtroBanco === 'pendientes' ? !m.conciliado : m.conciliado)
                    .map(mov => (
                    <tr key={mov.id}>
                      <td>{formatDate(mov.fecha)}</td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem' }}>
                        {mov.referencia || '-'}
                      </td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mov.descripcion}
                      </td>
                      <td className="text-right currency-display" style={{ 
                        color: mov.monto < 0 ? '#dc2626' : '#16a34a',
                        fontWeight: 500
                      }}>
                        {formatCurrency(mov.monto, mov.monto < 0 ? '-S/' : 'S/')}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${mov.conciliado ? 'badge-success' : 'badge-warning'}`}>
                          {mov.conciliado ? 'Conciliado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="card">
          <div className="data-table-wrapper">
            {/* Movimientos del Banco Conciliados */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                borderRadius: '12px',
                marginBottom: '1rem'
              }}>
                <CheckCircle size={20} color="white" />
                <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                  Movimientos del Banco Conciliados ({movimientosBanco.filter(m => m.conciliado).length})
                </h3>
              </div>
              
              {movimientosBanco.filter(m => m.conciliado).length === 0 ? (
                <div className="empty-state">
                  <CheckCircle className="empty-state-icon" />
                  <div className="empty-state-title">No hay movimientos bancarios conciliados</div>
                </div>
              ) : (
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Banco</th>
                      <th>Nro Operación</th>
                      <th>Descripción</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosBanco.filter(m => m.conciliado).map(mov => (
                      <tr key={mov.id}>
                        <td>{formatDate(mov.fecha)}</td>
                        <td>{mov.banco_excel || mov.banco || '-'}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                          {mov.referencia || '-'}
                        </td>
                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mov.descripcion}
                        </td>
                        <td className="text-right currency-display" style={{ 
                          color: mov.monto < 0 ? '#dc2626' : '#16a34a',
                          fontWeight: 500
                        }}>
                          {formatCurrency(mov.monto, mov.monto < 0 ? '-S/' : 'S/')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Movimientos del Sistema Conciliados */}
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                borderRadius: '12px',
                marginBottom: '1rem'
              }}>
                <CheckCircle size={20} color="white" />
                <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                  Movimientos del Sistema Conciliados ({movimientosSistema.filter(m => m.conciliado).length})
                </h3>
              </div>
              
              {movimientosSistema.filter(m => m.conciliado).length === 0 ? (
                <div className="empty-state">
                  <CheckCircle className="empty-state-icon" />
                  <div className="empty-state-title">No hay movimientos del sistema conciliados</div>
                </div>
              ) : (
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Número</th>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosSistema.filter(m => m.conciliado).map(mov => (
                      <tr key={mov.id}>
                        <td>{formatDate(mov.fecha)}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                          {mov.numero}
                        </td>
                        <td>
                          <span className={`badge ${mov.tipo === 'ingreso' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6875rem' }}>
                            {mov.tipo === 'ingreso' ? 'INGRESO' : 'EGRESO'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mov.notas || mov.tercero_nombre || '-'}
                        </td>
                        <td className="text-right currency-display" style={{ 
                          fontWeight: 500,
                          color: mov.tipo === 'ingreso' ? '#16a34a' : '#dc2626'
                        }}>
                          {mov.tipo === 'ingreso' ? '' : '-'}{formatCurrency(mov.monto_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Importar Movimientos</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">Banco</label>
                <select
                  className="form-input form-select"
                  value={bancoSeleccionado}
                  onChange={(e) => setBancoSeleccionado(e.target.value)}
                >
                  {BANCOS.map(banco => (
                    <option key={banco.id} value={banco.id}>{banco.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label required">Archivo Excel</label>
                <div 
                  style={{ 
                    border: `2px dashed ${uploadFile ? '#16a34a' : '#e2e8f0'}`, 
                    borderRadius: '12px', 
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: uploadFile ? '#f0fdf4' : '#f8fafc',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => document.getElementById('excel-input').click()}
                >
                  <input
                    id="excel-input"
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                  {uploadFile ? (
                    <>
                      <CheckCircle size={40} color="#16a34a" style={{ marginBottom: '0.75rem' }} />
                      <div style={{ fontWeight: 600, color: '#16a34a' }}>{uploadFile.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Click para cambiar
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={40} color="#94a3b8" style={{ marginBottom: '0.75rem' }} />
                      <div style={{ fontWeight: 500 }}>Click para seleccionar archivo</div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Formatos: .xlsx, .xls
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #fcd34d', 
                borderRadius: '8px', 
                padding: '0.875rem',
                fontSize: '0.8125rem',
                display: 'flex',
                gap: '0.75rem'
              }}>
                <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Formatos esperados:</strong>
                  <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                    <li><strong>BCP:</strong> Fecha, Nro Operación, Descripción, Monto</li>
                    <li><strong>BBVA:</strong> F. Operación, Nº Doc, Concepto, Importe</li>
                    <li><strong>IBK:</strong> Fecha, Nro Operación, Descripción, Cargo/Abono</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowImportModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImportExcel}
                disabled={!uploadFile || importing}
              >
                {importing ? <><RefreshCw size={16} className="spin" /> Importando...</> : <><Upload size={16} /> Importar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Previsualización de Importación</h2>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Revise los datos antes de importar ({previewData.length} registros)
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowPreviewModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
              <div className="data-table-wrapper" style={{ padding: 0 }}>
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                    <tr>
                      <th style={{ width: '100px' }}>Fecha</th>
                      <th style={{ width: '120px' }}>Banco</th>
                      <th style={{ width: '150px' }}>Nro Operación</th>
                      <th>Descripción</th>
                      <th className="text-right" style={{ width: '120px' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx}>
                        <td>{formatDate(row.fecha)}</td>
                        <td>{row.banco}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                          {row.referencia || '-'}
                        </td>
                        <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.descripcion}
                        </td>
                        <td className="text-right currency-display" style={{ 
                          color: row.monto < 0 ? '#dc2626' : '#16a34a',
                          fontWeight: 500
                        }}>
                          {formatCurrency(row.monto, row.monto < 0 ? '-S/' : 'S/')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowPreviewModal(false);
                  setShowImportModal(true);
                }}
              >
                <X size={16} /> Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmImport}
                disabled={importing}
              >
                {importing ? <><RefreshCw size={16} className="spin" /> Importando...</> : <><Check size={16} /> Confirmar e Importar</>}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Gasto Bancario */}
      {showGastoBancarioModal && (
        <div className="modal-overlay" onClick={() => setShowGastoBancarioModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Generar Gasto Bancario</h2>
              <button className="modal-close" onClick={() => setShowGastoBancarioModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ 
                background: '#f1f5f9', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Movimientos seleccionados:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBanco.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Total:</span>
                  <span style={{ fontWeight: 600, color: '#ea580c', fontSize: '1.125rem' }}>
                    {formatCurrency(selectedBancoTotal)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Categoría de Gasto *</label>
                <select 
                  className="form-input"
                  value={gastoData.categoria_id}
                  onChange={(e) => setGastoData({ ...gastoData, categoria_id: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea 
                  className="form-input"
                  value={gastoData.descripcion}
                  onChange={(e) => setGastoData({ ...gastoData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Ej: Impuestos ITF, comisiones bancarias, etc."
                />
              </div>

              <div style={{ 
                background: '#fef3c7', 
                padding: '0.75rem 1rem', 
                borderRadius: '6px',
                border: '1px solid #fbbf24',
                fontSize: '0.875rem',
                color: '#92400e'
              }}>
                <strong>Nota:</strong> Se creará automáticamente un gasto agrupando todos los movimientos seleccionados y se marcarán como conciliados.
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowGastoBancarioModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleConfirmarGastoBancario}
                disabled={!gastoData.categoria_id}
                style={{ 
                  background: '#ea580c',
                  opacity: !gastoData.categoria_id ? 0.5 : 1 
                }}
              >
                <Check size={18} />
                Generar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConciliacionBancaria;
