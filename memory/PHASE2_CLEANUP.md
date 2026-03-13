# FASE 2 — Limpieza Backend Completada
## Fecha: 13 Marzo 2026

---

## 1. Routers DESREGISTRADOS de server.py (6 routers, 30 endpoints)

| Router | Endpoints | Motivo |
|--------|-----------|--------|
| planillas.py | 5 | Planilla legacy — sin dependencias CORE |
| presupuestos.py | 5 | Presupuesto legacy — sin dependencias CORE |
| proyectos.py | 4 | Proyectos legacy — tesoreria.py solo hace LEFT JOIN a la tabla (no al router) |
| capital_linea.py | 5 | ROI/Capital legacy — sin dependencias CORE |
| dashboard_financiero.py | 1 | Unificado con Dashboard en Fase 1 — sin dependencias CORE |
| reportes_gerenciales.py | 7 | Exportaciones gerenciales legacy — sin dependencias CORE |

**Total: 27 endpoints legacy removidos de la carga activa.**

---

## 2. Endpoints que salen de la carga activa

### planillas.py (5 endpoints)
- `GET /planillas`
- `GET /planillas/{id}`
- `POST /planillas`
- `DELETE /planillas/{id}`
- `POST /planillas/{id}/pagar`

### presupuestos.py (5 endpoints)
- `GET /presupuestos`
- `GET /presupuestos/{id}`
- `POST /presupuestos`
- `PUT /presupuestos/{id}`
- `DELETE /presupuestos/{id}`

### proyectos.py (4 endpoints)
- `GET /proyectos`
- `POST /proyectos`
- `PUT /proyectos/{id}`
- `DELETE /proyectos/{id}`

### capital_linea.py (5 endpoints)
- `GET /capital-linea`
- `GET /capital-linea/{id}`
- `POST /capital-linea`
- `PUT /capital-linea/{id}`
- `DELETE /capital-linea/{id}`

### dashboard_financiero.py (1 endpoint)
- `GET /dashboard-financiero`

### reportes_gerenciales.py (7 endpoints)
- `GET /reportes-gerenciales/cxc`
- `GET /reportes-gerenciales/cxp`
- `GET /reportes-gerenciales/flujo-caja`
- `GET /reportes-gerenciales/rentabilidad`
- `GET /reportes-gerenciales/gastos`
- `GET /reportes-gerenciales/tesoreria`
- `GET /reportes-gerenciales/resumen-ejecutivo`

---

## 3. Dependencias BLOQUEANTES (routers que NO se pueden desregistrar)

### contabilidad.py (20 endpoints — 2 usados por CORE)
| Endpoint | Usado por | Modulo |
|----------|----------|--------|
| `GET /cuentas-contables` | CuentasBancarias.jsx | CORE |
| `POST /asientos/generar` | Gastos.jsx, FacturasProveedor.jsx | CORE |
| Los otros 18 endpoints | Nadie | Legacy inactivo |
**Accion futura (Fase 3):** Extraer los 2 endpoints CORE a un micro-router, desregistrar el resto.

### articulos.py (5 endpoints — 3 usados por CORE)
| Endpoint | Usado por | Modulo |
|----------|----------|--------|
| `GET /inventario` | FacturasProveedor.jsx, OrdenesCompra.jsx | CORE + REVISAR |
| `GET /modelos-cortes` | api.js (getModelosCortes) | Potencial CORE |
| `GET /modelos` | api.js (getModelos) | Potencial CORE |
| `GET /articulos` | Nadie | Legacy inactivo |
| `POST /articulos` | Nadie | Legacy inactivo |
**Accion futura (Fase 3):** Renombrar a inventario.py, eliminar endpoints muertos.

### finanzas_gerencial.py (4 endpoints — 1 usado por CORE)
| Endpoint | Usado por | Modulo |
|----------|----------|--------|
| `GET /flujo-caja-gerencial` | FlujoCaja.jsx | CORE |
| `GET /rentabilidad` | Nadie | Legacy inactivo |
| `GET /presupuesto-vs-real` | Nadie | Legacy inactivo |
| `GET /roi-proyectos` | Nadie | Legacy inactivo |
**Accion futura (Fase 3):** Extraer `/flujo-caja-gerencial` a su propio router, desregistrar el resto.

---

## 4. Modulos pendientes para revision manual (NO tocados)

| Modulo | Router | Endpoints | Razon |
|--------|--------|-----------|-------|
| Ordenes de Compra | compras.py | 14 | Pendiente decision usuario |
| Letras | compras.py | (incluidas) | Parte del mismo router |
| PagarFacturas | compras.py | (incluidas) | Parte del mismo router |
| Conciliacion Bancaria | banco.py | 9 | Pendiente decision usuario |

---

## 5. Estado final: Routers activos en server.py (22 routers)

### CORE puro (17)
core, dashboard, empresas, maestros, cuentas_financieras, terceros,
pagos, gastos, ventas_pos, cxc_cxp, tesoreria, valorizacion,
marcas, categorias_gasto, prorrateo, reportes_simplificados, export

### CORE con legacy residual (3 — limpiar en Fase 3)
contabilidad (2/20 endpoints usados), articulos (3/5 usados), finanzas_gerencial (1/4 usado)

### REVISAR (2 — pendiente decision usuario)
compras, banco

### Reportes legacy inactivo (1)
reportes (3 endpoints — verificar si FlujoCaja depende o usa finanzas_gerencial)

---

## 6. Trazabilidad para futura carpeta /legacy/

Archivos backend para mover a `/app/backend/routers/legacy/`:
```
planillas.py        → legacy/planillas.py
presupuestos.py     → legacy/presupuestos.py
proyectos.py        → legacy/proyectos.py
capital_linea.py    → legacy/capital_linea.py
dashboard_financiero.py → legacy/dashboard_financiero.py
reportes_gerenciales.py → legacy/reportes_gerenciales.py
```

Archivos frontend para mover a `/app/frontend/src/pages/legacy/`:
```
DashboardFinanciero.jsx, BalanceGeneral.jsx, EstadoResultados.jsx,
Asientos.jsx, CuentasContables.jsx, ConfigContable.jsx,
Empleados.jsx, Adelantos.jsx, Planilla.jsx,
Presupuestos.jsx, PresupuestoVsReal.jsx,
Proyectos.jsx, RoiProyectos.jsx,
Rentabilidad.jsx, RentabilidadLinea.jsx,
ReportePagos.jsx, Articulos.jsx, Categorias.jsx, Reportes.jsx
```
