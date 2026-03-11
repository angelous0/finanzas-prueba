import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, FileText, Receipt, CreditCard, 
  Building2, Users, Wallet, BarChart3, FileSpreadsheet, Settings,
  ChevronDown, ChevronRight, DollarSign, Landmark, Clock, FolderOpen,
  Package, Tags, GitBranch, Target, Menu, X, ChevronLeft, BookOpen,
  Tag, FolderKanban, PieChart, TrendingUp, Activity
} from 'lucide-react';

const navSections = [
  {
    title: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: PieChart, label: 'Dashboard Financiero', path: '/dashboard-financiero' },
    ]
  },
  {
    title: 'Finanzas Gerenciales',
    items: [
      { icon: Activity, label: 'Flujo de Caja', path: '/flujo-caja' },
      { icon: TrendingUp, label: 'Rentabilidad', path: '/rentabilidad' },
      { icon: Target, label: 'Presupuesto vs Real', path: '/presupuesto-vs-real' },
      { icon: PieChart, label: 'ROI Proyectos', path: '/roi-proyectos' },
    ]
  },
  {
    title: 'Ventas',
    items: [
      { icon: ShoppingCart, label: 'Ventas POS', path: '/ventas-pos' },
      { icon: CreditCard, label: 'Créditos por Cobrar', path: '/cxc' },
    ]
  },
  {
    title: 'Proveedores y Egresos',
    items: [
      { icon: FileText, label: 'Órdenes de Compra', path: '/ordenes-compra' },
      { icon: Receipt, label: 'Factura Proveedor', path: '/facturas-proveedor' },
      { icon: Wallet, label: 'Gastos', path: '/gastos' },
      { icon: DollarSign, label: 'Pagar Facturas', path: '/pagar-facturas' },
      { icon: Clock, label: 'CxP Pendientes', path: '/cxp' },
      { icon: FileSpreadsheet, label: 'Letras', path: '/letras' },
    ]
  },
  {
    title: 'Bancos y Pagos',
    items: [
      { icon: Landmark, label: 'Cuentas Bancarias', path: '/cuentas-bancarias' },
      { icon: DollarSign, label: 'Movimientos/Pagos', path: '/pagos' },
      { icon: FileSpreadsheet, label: 'Conciliación Bancaria', path: '/conciliacion' },
      { icon: Clock, label: 'Historial Conciliación', path: '/historial-conciliaciones' },
    ]
  },
  {
    title: 'Planilla',
    items: [
      { icon: Users, label: 'Empleados', path: '/empleados' },
      { icon: Wallet, label: 'Adelantos', path: '/adelantos' },
      { icon: FileText, label: 'Generar Planilla', path: '/planillas' },
    ]
  },
  {
    title: 'Presupuestos',
    items: [
      { icon: BarChart3, label: 'Presupuestos', path: '/presupuestos' },
    ]
  },
  {
    title: 'Catálogos',
    items: [
      { icon: Building2, label: 'Empresas', path: '/empresas' },
      { icon: Users, label: 'Proveedores', path: '/proveedores' },
      { icon: Users, label: 'Clientes', path: '/clientes' },
      { icon: Package, label: 'Artículos', path: '/articulos' },
      { icon: Tags, label: 'Categorías', path: '/categorias' },
      { icon: GitBranch, label: 'Líneas de Negocio', path: '/lineas-negocio' },
      { icon: Target, label: 'Centros de Costo', path: '/centros-costo' },
      { icon: Tag, label: 'Marcas', path: '/marcas' },
      { icon: FolderKanban, label: 'Proyectos', path: '/proyectos' },
    ]
  },
  {
    title: 'Contabilidad',
    items: [
      { icon: BookOpen, label: 'Plan de Cuentas', path: '/cuentas-contables' },
      { icon: Settings, label: 'Config. Contable', path: '/config-contable' },
      { icon: BookOpen, label: 'Asientos', path: '/asientos' },
      { icon: BarChart3, label: 'Balance General', path: '/balance-general' },
      { icon: FileText, label: 'Estado de Resultados', path: '/estado-resultados' },
      { icon: CreditCard, label: 'Reporte de Pagos', path: '/reporte-pagos' },
    ]
  },
];

export const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState(
    navSections.reduce((acc, section) => ({ ...acc, [section.title]: true }), {})
  );

  const toggleSection = (title) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNavClick = () => {
    // Close mobile menu when a nav item is clicked
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} data-testid="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">F4</div>
          {!collapsed && <span className="sidebar-logo-text">Finanzas 4.0</span>}
        </div>
        <div className="sidebar-header-buttons">
          <button 
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="sidebar-toggle"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          {/* Close button for mobile */}
          <button 
            className="mobile-close-btn"
            onClick={() => setMobileOpen && setMobileOpen(false)}
            data-testid="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title} className="nav-section">
            {!collapsed && (
              <button 
                className="nav-section-title"
                onClick={() => toggleSection(section.title)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem 1.5rem',
                  color: 'rgba(255,255,255,0.4)'
                }}
              >
                <span>{section.title}</span>
                {expandedSections[section.title] ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            )}
            
            {(collapsed || expandedSections[section.title]) && (
              <div className="nav-items">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => 
                      `nav-item ${isActive || (item.path === '/' && location.pathname === '/') ? 'active' : ''}`
                    }
                    data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
                    title={collapsed ? item.label : undefined}
                    onClick={handleNavClick}
                  >
                    <item.icon className="nav-item-icon" size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
