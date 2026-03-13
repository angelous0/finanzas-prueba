# FASE 4 — Archivos movidos a /legacy/
## Fecha: 13 Marzo 2026

---

## 1. Archivos MOVIDOS a /legacy/ (28 archivos)

### Backend: /app/backend/routers/legacy/ (9 archivos)
| Archivo | Endpoints | Origen |
|---------|-----------|--------|
| contabilidad.py | 18 legacy (CORE extraído a core_contabilidad.py) | Fase 3 |
| articulos.py | 2 legacy (CORE extraído a inventario_core.py) | Fase 3 |
| finanzas_gerencial.py | 3 legacy (CORE extraído a flujo_caja.py) | Fase 3 |
| planillas.py | 5 | Fase 2 |
| presupuestos.py | 5 | Fase 2 |
| proyectos.py | 4 | Fase 2 |
| capital_linea.py | 5 | Fase 2 |
| dashboard_financiero.py | 1 | Fase 2 |
| reportes_gerenciales.py | 7 | Fase 2 |

### Frontend: /app/frontend/src/pages/legacy/ (19 archivos)
| Archivo | Módulo Legacy |
|---------|--------------|
| DashboardFinanciero.jsx | Unificado con Dashboard |
| BalanceGeneral.jsx | Contabilidad |
| EstadoResultados.jsx | Contabilidad |
| Asientos.jsx | Contabilidad |
| CuentasContables.jsx | Contabilidad |
| ConfigContable.jsx | Contabilidad |
| Empleados.jsx | Planilla |
| Adelantos.jsx | Planilla |
| Planilla.jsx | Planilla |
| Presupuestos.jsx | Presupuesto |
| PresupuestoVsReal.jsx | Presupuesto |
| Proyectos.jsx | Proyectos |
| RoiProyectos.jsx | ROI/Capital |
| Rentabilidad.jsx | ROI/Capital |
| RentabilidadLinea.jsx | ROI/Capital |
| ReportePagos.jsx | Cubierto por Pagos |
| Articulos.jsx | Artículos (CRUD no usado) |
| Categorias.jsx | Reemplazado por CategoriasGasto |
| Reportes.jsx | Reemplazado por ReportesSimplificados |

---

## 2. Archivos NO movidos (con justificación)

### Módulos en REVISIÓN (NO tocar):
| Archivo | Motivo |
|---------|--------|
| frontend/src/pages/OrdenesCompra.jsx | Pendiente decisión usuario |
| frontend/src/pages/PagarFacturas.jsx | Pendiente decisión usuario |
| frontend/src/pages/Letras.jsx | Pendiente decisión usuario |
| frontend/src/pages/ConciliacionBancaria.jsx | Pendiente decisión usuario |
| frontend/src/pages/HistorialConciliaciones.jsx | Pendiente decisión usuario |
| backend/routers/compras.py | Sirve a OC, Facturas, Letras |
| backend/routers/banco.py | Sirve a Conciliación |

### Backend business logic (NO es router, es servicio):
| Archivo | Motivo |
|---------|--------|
| backend/contabilidad.py | Módulo de lógica usado por core_contabilidad.py |

---

## 3. Verificación post-move

- Backend: arranca sin errores ✅
- Frontend: compila sin errores ✅
- 12/12 endpoints CORE: 200 ✅
- 0 imports rotos

---

## 4. Estado final del repositorio

### /app/backend/routers/ (activos)
```
core.py, dashboard.py, empresas.py, maestros.py,
cuentas_financieras.py, terceros.py, compras.py,
pagos.py, gastos.py, ventas_pos.py, cxc_cxp.py,
banco.py, reportes.py, export.py, marcas.py,
tesoreria.py, valorizacion.py, categorias_gasto.py,
prorrateo.py, reportes_simplificados.py,
core_contabilidad.py, inventario_core.py, flujo_caja.py
```

### /app/backend/routers/legacy/ (archivados)
```
contabilidad.py, articulos.py, finanzas_gerencial.py,
planillas.py, presupuestos.py, proyectos.py,
capital_linea.py, dashboard_financiero.py, reportes_gerenciales.py
```

### /app/frontend/src/pages/ (activas)
```
Dashboard.jsx, VentasPOS.jsx, CxC.jsx, Gastos.jsx,
ProrrateoGastos.jsx, FacturasProveedor.jsx, CxP.jsx,
Tesoreria.jsx, CuentasBancarias.jsx, Pagos.jsx,
FlujoCaja.jsx, ReportesSimplificados.jsx,
ValorizacionInventario.jsx, CategoriasGasto.jsx,
LineasNegocio.jsx, CentrosCosto.jsx, Marcas.jsx,
Proveedores.jsx, Empresas.jsx, PlaceholderPages.jsx
+ REVISAR: OrdenesCompra.jsx, PagarFacturas.jsx, Letras.jsx,
  ConciliacionBancaria.jsx, HistorialConciliaciones.jsx
```

### /app/frontend/src/pages/legacy/ (archivadas)
```
19 archivos legacy
```
