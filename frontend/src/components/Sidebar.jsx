import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Receipt, CreditCard, 
  Building2, Users, Wallet,
  ChevronDown, ChevronRight, DollarSign, Landmark, Clock,
  Tags, GitBranch, Target, X, ChevronLeft,
  Tag, Activity, ClipboardList,
  Vault, Layers, Package, FileSpreadsheet, Link2, History, BookOpen, PieChart
} from 'lucide-react';

const navSections = [
  {
    title: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ]
  },
  {
    title: 'Ventas',
    items: [
      { icon: ShoppingCart, label: 'Ventas POS', path: '/ventas-pos' },
      { icon: CreditCard, label: 'CxC', path: '/cxc' },
    ]
  },
  {
    title: 'Egresos',
    items: [
      { icon: Wallet, label: 'Gastos', path: '/gastos' },
      { icon: Layers, label: 'Prorrateo', path: '/prorrateo' },
      { icon: Receipt, label: 'Factura Proveedor', path: '/facturas-proveedor' },
      { icon: ShoppingCart, label: 'Ordenes de Compra', path: '/ordenes-compra' },
      { icon: Clock, label: 'CxP', path: '/cxp' },
      { icon: FileSpreadsheet, label: 'Letras', path: '/letras' },
    ]
  },
  {
    title: 'Tesorería',
    items: [
      { icon: Vault, label: 'Tesorería', path: '/tesoreria' },
      { icon: Landmark, label: 'Cuentas Bancarias', path: '/cuentas-bancarias' },
      { icon: DollarSign, label: 'Movimientos/Pagos', path: '/pagos' },
      { icon: Activity, label: 'Flujo de Caja', path: '/flujo-caja' },
      { icon: Link2, label: 'Conciliación Bancaria', path: '/conciliacion' },
      { icon: History, label: 'Historial Conciliaciones', path: '/historial-conciliaciones' },
    ]
  },
  {
    title: 'Reportes',
    items: [
      { icon: PieChart, label: 'Reportes Financieros', path: '/reportes-financieros' },
      { icon: ClipboardList, label: 'Reportes', path: '/reportes-simplificados' },
      { icon: GitBranch, label: 'Rentabilidad x Linea', path: '/rentabilidad-linea' },
      { icon: BookOpen, label: 'Libro Analitico', path: '/libro-analitico' },
      { icon: Package, label: 'Valorización Inventario', path: '/valorizacion-inventario' },
    ]
  },
  {
    title: 'Catálogos',
    items: [
      { icon: GitBranch, label: 'Líneas de Negocio', path: '/lineas-negocio' },
      { icon: Tag, label: 'Marcas', path: '/marcas' },
      { icon: Target, label: 'Centros de Costo', path: '/centros-costo' },
      { icon: Tags, label: 'Categorías Gasto', path: '/categorias-gasto' },
      { icon: Users, label: 'Proveedores', path: '/proveedores' },
      { icon: Users, label: 'Clientes', path: '/clientes' },
      { icon: Building2, label: 'Empresas', path: '/empresas' },
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
