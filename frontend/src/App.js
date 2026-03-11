import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Menu } from 'lucide-react';
import './App.css';

// Context
import { EmpresaProvider, useEmpresa } from './context/EmpresaContext';

// Components
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

// Pages
import Dashboard from './pages/Dashboard';
import VentasPOS from './pages/VentasPOS';
import FacturasProveedor from './pages/FacturasProveedor';
import OrdenesCompra from './pages/OrdenesCompra';
import Gastos from './pages/Gastos';
import Letras from './pages/Letras';
import PagarFacturas from './pages/PagarFacturas';
import CxP from './pages/CxP';
import CxC from './pages/CxC';
import CuentasBancarias from './pages/CuentasBancarias';
import Pagos from './pages/Pagos';
import Proveedores from './pages/Proveedores';
import Empleados from './pages/Empleados';
import Categorias from './pages/Categorias';
import BalanceGeneral from './pages/BalanceGeneral';
import LineasNegocio from './pages/LineasNegocio';
import CentrosCosto from './pages/CentrosCosto';
import Empresas from './pages/Empresas';
import Planilla from './pages/Planilla';
import Adelantos from './pages/Adelantos';
import ConciliacionBancaria from './pages/ConciliacionBancaria';
import { HistorialConciliaciones } from './pages/HistorialConciliaciones';
import { 
  Clientes,
} from './pages/PlaceholderPages';
import Presupuestos from './pages/Presupuestos';
import FlujoCaja from './pages/FlujoCaja';
import EstadoResultados from './pages/EstadoResultados';
import Articulos from './pages/Articulos';
import ReportePagos from './pages/ReportePagos';
import CuentasContables from './pages/CuentasContables';
import ConfigContable from './pages/ConfigContable';
import Asientos from './pages/Asientos';
import Marcas from './pages/Marcas';
import Proyectos from './pages/Proyectos';
import DashboardFinanciero from './pages/DashboardFinanciero';
import Rentabilidad from './pages/Rentabilidad';

function EmpresaGuard({ children }) {
  const { empresas, empresaActual, loading, reloadEmpresas } = useEmpresa();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ nombre: '', ruc: '' });

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;
  }

  if (!empresaActual && empresas.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '2.5rem', background: 'var(--card)', borderRadius: '1rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>F4</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Bienvenido a Finanzas 4.0</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Para comenzar, crea tu primera empresa</p>
          
          {!showCreate ? (
            <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => setShowCreate(true)} data-testid="crear-primera-empresa-btn">
              Crear mi empresa
            </button>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (creating || !form.nombre) return;
              setCreating(true);
              try {
                const { createEmpresa } = await import('./services/api');
                await createEmpresa(form);
                await reloadEmpresas();
              } catch (err) {
                console.error(err);
              } finally {
                setCreating(false);
              }
            }}>
              <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <label className="form-label required">Nombre de la empresa</label>
                <input className="form-input" required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Mi Empresa S.A.C." data-testid="empresa-nombre-input" />
              </div>
              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label className="form-label">RUC</label>
                <input className="form-input" value={form.ruc} onChange={e => setForm(p => ({ ...p, ruc: e.target.value }))} placeholder="20123456789" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={creating} data-testid="submit-primera-empresa-btn">
                {creating ? 'Creando...' : 'Crear empresa'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Router>
      <EmpresaProvider>
        <EmpresaGuard>
        <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
          {/* Mobile menu overlay */}
          {mobileMenuOpen && (
            <div 
              className="mobile-overlay" 
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-overlay"
            />
          )}
        
        <Sidebar 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />
        
        <main className="main-content">
          {/* Top Bar with empresa selector */}
          <TopBar />
          
          {/* Mobile hamburger button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            data-testid="mobile-menu-btn"
          >
            <Menu size={24} />
          </button>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard-financiero" element={<DashboardFinanciero />} />
            <Route path="/rentabilidad" element={<Rentabilidad />} />
            
            {/* Ventas */}
            <Route path="/ventas-pos" element={<VentasPOS />} />
            <Route path="/cxc" element={<CxC />} />
            
            {/* Proveedores y Egresos */}
            <Route path="/ordenes-compra" element={<OrdenesCompra />} />
            <Route path="/facturas-proveedor" element={<FacturasProveedor />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/pagar-facturas" element={<PagarFacturas />} />
            <Route path="/cxp" element={<CxP />} />
            <Route path="/letras" element={<Letras />} />
            
            {/* Bancos y Pagos */}
            <Route path="/cuentas-bancarias" element={<CuentasBancarias />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/conciliacion" element={<ConciliacionBancaria />} />
            <Route path="/historial-conciliaciones" element={<HistorialConciliaciones />} />
            
            {/* Planilla */}
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/adelantos" element={<Adelantos />} />
            <Route path="/planillas" element={<Planilla />} />
            <Route path="/planilla" element={<Planilla />} />
            
            {/* Presupuestos */}
            <Route path="/presupuestos" element={<Presupuestos />} />
            
            {/* Catálogos */}
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/articulos" element={<Articulos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/lineas-negocio" element={<LineasNegocio />} />
            <Route path="/centros-costo" element={<CentrosCosto />} />
            <Route path="/marcas" element={<Marcas />} />
            <Route path="/proyectos" element={<Proyectos />} />
            
            {/* Contabilidad */}
            <Route path="/balance-general" element={<BalanceGeneral />} />
            <Route path="/estado-resultados" element={<EstadoResultados />} />
            <Route path="/flujo-caja" element={<FlujoCaja />} />
            <Route path="/reporte-pagos" element={<ReportePagos />} />
            <Route path="/cuentas-contables" element={<CuentasContables />} />
            <Route path="/config-contable" element={<ConfigContable />} />
            <Route path="/asientos" element={<Asientos />} />
          </Routes>
        </main>
        </div>
        <Toaster position="top-right" richColors />
        </EmpresaGuard>
      </EmpresaProvider>
    </Router>
  );
}

export default App;
