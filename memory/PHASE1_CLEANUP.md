# FASE 1 — Limpieza Frontend Completada
## Fecha: 13 Marzo 2026

---

## 1. Rutas frontend ELIMINADAS de App.js (19 rutas legacy)

| Ruta | Modulo Legacy |
|------|--------------|
| `/dashboard-financiero` | Unificado con Dashboard |
| `/balance-general` | Contabilidad |
| `/estado-resultados` | Contabilidad |
| `/asientos` | Contabilidad |
| `/cuentas-contables` | Contabilidad |
| `/config-contable` | Contabilidad |
| `/empleados` | Planilla |
| `/adelantos` | Planilla |
| `/planilla` | Planilla |
| `/planillas` | Planilla (duplicada) |
| `/presupuesto-vs-real` | Presupuesto |
| `/presupuestos` | Presupuesto |
| `/proyectos` | Proyectos |
| `/roi-proyectos` | ROI/Capital |
| `/rentabilidad` | ROI/Capital |
| `/rentabilidad-linea` | ROI/Capital |
| `/reporte-pagos` | Cubierto por Pagos |
| `/articulos` | No usado |
| `/categorias` | Reemplazado por CategoríasGasto |

---

## 2. Imports y funciones ELIMINADAS de api.js

### Funciones eliminadas (legacy confirmado):
| Funcion | Modulo Legacy |
|---------|--------------|
| `getDashboardKPIs` | Dashboard viejo |
| `createMoneda` / `deleteMoneda` | Config no usada |
| `getClientes` | Nunca usada (placeholder) |
| `getEmpleadoDetalle` / `saveEmpleadoDetalle` | Planilla |
| `getArticulos` / `createArticulo` | Articulos |
| `getAdelantos` / `createAdelanto` / `updateAdelanto` / `deleteAdelanto` / `pagarAdelanto` | Planilla |
| `getPlanillas` / `getPlanilla` / `createPlanilla` / `deletePlanilla` / `pagarPlanilla` | Planilla |
| `getPresupuestos` / `getPresupuesto` / `createPresupuesto` / `updatePresupuesto` / `deletePresupuesto` | Presupuesto |
| `getReporteFlujoCaja` | Contabilidad legacy |
| `getReporteEstadoResultados` | Contabilidad legacy |
| `getReporteBalanceGeneral` | Contabilidad legacy |
| `createCuentaContable` / `updateCuentaContable` / `deleteCuentaContable` / `seedCuentasPeru` | Contabilidad |
| `getConfigContable` / `updateConfigContable` | Contabilidad |
| `postearAsiento` / `anularAsiento` / `getAsientos` / `getAsiento` | Contabilidad |
| `getReporteMayor` / `getReporteBalanceContable` / `getReportePnl` | Contabilidad |
| `getPeriodos` / `cerrarPeriodo` / `abrirPeriodo` | Contabilidad |
| `getDashboardFinanciero` | Unificado |
| `getRentabilidad` | Cubierto por Reportes Simplificados |
| `getPresupuestoVsReal` | Legacy |
| `getRoiProyectos` | Legacy |
| `getResumenEjecutivo` | Cubierto por Dashboard |
| `exportarCxC` / `exportarCxP` / `exportarFlujoCaja` / `exportarRentabilidad` / `exportarGastos` / `exportarTesoreria` | Reportes Gerenciales legacy |
| `getProyectos` / `createProyecto` / `updateProyecto` / `deleteProyecto` | Proyectos legacy |

### Funciones CONSERVADAS a pesar de ser contabilidad (usadas por CORE):
| Funcion | Usada por |
|---------|----------|
| `getCuentasContables` | CuentasBancarias.jsx |
| `generarAsiento` | Gastos.jsx, FacturasProveedor.jsx |

### Funciones conservadas (modulos REVISAR - Fase 2):
- Todas las funciones de OC, Letras, Conciliacion, Retenciones

---

## 3. Sidebar CORE visible final (20 items)

### Principal
- Dashboard

### Ventas
- Ventas POS
- CxC

### Egresos
- Gastos
- Prorrateo
- Factura Proveedor
- CxP

### Tesorería
- Tesoreria
- Cuentas Bancarias
- Movimientos/Pagos
- Flujo de Caja

### Reportes
- Reportes (simplificados)
- Valorizacion Inventario (NUEVO en sidebar)

### Catalogos
- Lineas de Negocio
- Marcas
- Centros de Costo
- Categorias Gasto
- Proveedores
- Clientes
- Empresas

---

## 4. PlaceholderPages.jsx limpiado

Exports eliminados: `Articulos`, `Adelantos`, `Planillas`, `Presupuestos`, `Conciliacion`, `EstadoResultados`, `FlujoCaja`
Solo permanece: `Clientes` (unico export usado)

---

## 5. Pendientes exactos para Fase 2

### Rutas REVISAR (siguen activas en App.js, NO en Sidebar):
| Ruta | Componente | Decision pendiente |
|------|-----------|-------------------|
| `/ordenes-compra` | OrdenesCompra.jsx (1267 lineas) | Decidir si es CORE o LEGACY |
| `/pagar-facturas` | PagarFacturas.jsx (422 lineas) | Ligado a Facturas Proveedor |
| `/letras` | Letras.jsx (450 lineas) | Decidir si es CORE o LEGACY |
| `/conciliacion` | ConciliacionBancaria.jsx (1362 lineas) | Decidir si es CORE o LEGACY |
| `/historial-conciliaciones` | HistorialConciliaciones.jsx (335 lineas) | Ligado a Conciliacion |

### Backend — Routers legacy AUN ACTIVOS en server.py (Fase 2):
| Router | Endpoints | Accion pendiente |
|--------|-----------|-----------------|
| contabilidad.py | 20 | Desregistrar |
| capital_linea.py | 5 | Desregistrar |
| proyectos.py | 4 | Desregistrar |
| presupuestos.py | 5 | Desregistrar |
| planillas.py | 5 | Desregistrar |
| finanzas_gerencial.py | 4 | Revisar dependencia FlujoCaja |
| reportes_gerenciales.py | 7 | Revisar si algun export se usa |
| articulos.py | 5 | Desregistrar |

### Archivos frontend legacy que siguen existiendo (no borrados):
- DashboardFinanciero.jsx, BalanceGeneral.jsx, EstadoResultados.jsx, Asientos.jsx
- CuentasContables.jsx, ConfigContable.jsx, Empleados.jsx, Adelantos.jsx
- Planilla.jsx, Presupuestos.jsx, PresupuestoVsReal.jsx, Proyectos.jsx
- RoiProyectos.jsx, Rentabilidad.jsx, RentabilidadLinea.jsx, ReportePagos.jsx
- Articulos.jsx, Categorias.jsx, Reportes.jsx

### Refactoring pendiente (Fase 3):
- ventas_pos.py: split en 3 archivos
- FacturasProveedor.jsx: split tabla/form/modal
- database.py: separar schemas legacy
