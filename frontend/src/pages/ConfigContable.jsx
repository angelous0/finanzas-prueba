import React, { useState, useEffect } from 'react';
import { getConfigContable, updateConfigContable, getCuentasContables } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

export const ConfigContable = () => {
  const { empresaActual } = useEmpresa();
  const [cuentas, setCuentas] = useState([]);
  const [config, setConfig] = useState({ cta_gastos_default_id: '', cta_igv_default_id: '', cta_xpagar_default_id: '', cta_otrib_default_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [empresaActual]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, cfgRes] = await Promise.all([getCuentasContables(), getConfigContable()]);
      setCuentas(cRes.data.filter(c => c.es_activa));
      const cfg = cfgRes.data;
      setConfig({
        cta_gastos_default_id: cfg.cta_gastos_default_id || '',
        cta_igv_default_id: cfg.cta_igv_default_id || '',
        cta_xpagar_default_id: cfg.cta_xpagar_default_id || '',
        cta_otrib_default_id: cfg.cta_otrib_default_id || '',
      });
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfigContable({
        cta_gastos_default_id: config.cta_gastos_default_id || null,
        cta_igv_default_id: config.cta_igv_default_id || null,
        cta_xpagar_default_id: config.cta_xpagar_default_id || null,
        cta_otrib_default_id: config.cta_otrib_default_id || null,
      });
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const cuentasByTipo = (tipos) => cuentas.filter(c => tipos.includes(c.tipo));

  const CuentaSelect = ({ label, desc, value, onChange, tipos, testId }) => (
    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</label>
      <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0.5rem' }}>{desc}</p>
      <select className="form-input form-select" value={value} onChange={onChange} data-testid={testId} style={{ maxWidth: '500px' }}>
        <option value="">-- Sin asignar --</option>
        {cuentasByTipo(tipos).map(c => (
          <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
        ))}
      </select>
    </div>
  );

  if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;

  return (
    <div data-testid="config-contable-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración Contable</h1>
          <p className="page-subtitle">Cuentas por defecto para el export CompraAPP</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} data-testid="guardar-config-btn">
          <Save size={18} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="page-content">
        <div className="card" style={{ padding: '1.5rem' }}>
          {cuentas.length === 0 ? (
            <div className="empty-state">
              <Settings className="empty-state-icon" />
              <div className="empty-state-title">No hay cuentas contables</div>
              <div className="empty-state-description">Primero crea cuentas en el Plan de Cuentas</div>
            </div>
          ) : (
            <>
              <CuentaSelect label="Cuenta de Gastos (default)" desc="Se usa en Cta Gastos del export si la categoría no tiene cuenta asignada"
                value={config.cta_gastos_default_id} onChange={(e) => setConfig(prev => ({ ...prev, cta_gastos_default_id: e.target.value ? parseInt(e.target.value) : '' }))}
                tipos={['GASTO', 'ACTIVO', 'OTRO']} testId="config-cta-gastos" />
              <CuentaSelect label="Cuenta de IGV (default)" desc="Se usa en Cta IGV del export cuando IGV(A) > 0"
                value={config.cta_igv_default_id} onChange={(e) => setConfig(prev => ({ ...prev, cta_igv_default_id: e.target.value ? parseInt(e.target.value) : '' }))}
                tipos={['IMPUESTO', 'ACTIVO', 'OTRO']} testId="config-cta-igv" />
              <CuentaSelect label="Cuenta por Pagar (default)" desc="Se usa en Cta x Pagar del export cuando hay saldo pendiente"
                value={config.cta_xpagar_default_id} onChange={(e) => setConfig(prev => ({ ...prev, cta_xpagar_default_id: e.target.value ? parseInt(e.target.value) : '' }))}
                tipos={['PASIVO', 'OTRO']} testId="config-cta-xpagar" />
              <CuentaSelect label="Cuenta Otros Tributos (default)" desc="Se usa en Cta O. Trib. del export cuando ISC > 0 u otros tributos aplican"
                value={config.cta_otrib_default_id} onChange={(e) => setConfig(prev => ({ ...prev, cta_otrib_default_id: e.target.value ? parseInt(e.target.value) : '' }))}
                tipos={['IMPUESTO', 'GASTO', 'OTRO']} testId="config-cta-otrib" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigContable;
