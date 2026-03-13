# FASE 3 — Desacople CORE/LEGACY en Routers Híbridos
## Fecha: 13 Marzo 2026

---

## 1. Nuevos routers CORE creados

### core_contabilidad.py (2 endpoints extraídos de contabilidad.py)
| Endpoint | Usado por |
|----------|----------|
| `GET /cuentas-contables` | CuentasBancarias.jsx |
| `POST /asientos/generar` | Gastos.jsx, FacturasProveedor.jsx |

### inventario_core.py (3 endpoints extraídos de articulos.py)
| Endpoint | Usado por |
|----------|----------|
| `GET /inventario` | FacturasProveedor.jsx, OrdenesCompra.jsx |
| `GET /modelos-cortes` | api.js (getModelosCortes) |
| `GET /modelos` | api.js (getModelos) |

### flujo_caja.py (1 endpoint extraído de finanzas_gerencial.py)
| Endpoint | Usado por |
|----------|----------|
| `GET /flujo-caja-gerencial` | FlujoCaja.jsx |

---

## 2. Endpoints LEGACY que salen de la carga activa

### De contabilidad.py (18 endpoints legacy)
- `POST /cuentas-contables` (CRUD create)
- `PUT /cuentas-contables/{id}` (CRUD update)
- `DELETE /cuentas-contables/{id}` (CRUD delete)
- `POST /cuentas-contables/seed-peru`
- `GET /config-contable`
- `PUT /config-contable`
- `GET /retencion-detalle`
- `PUT /retencion-detalle`
- `GET /asientos`
- `GET /asientos/{id}`
- `POST /asientos/{id}/postear`
- `POST /asientos/{id}/anular`
- `GET /reportes/mayor`
- `GET /reportes/balance-general`
- `GET /reportes/estado-resultados`
- `GET /periodos`
- `POST /periodos/{id}/cerrar`
- `POST /periodos/{id}/abrir`

### De articulos.py (2 endpoints legacy)
- `GET /articulos`
- `POST /articulos`

### De finanzas_gerencial.py (3 endpoints legacy)
- `GET /rentabilidad`
- `GET /presupuesto-vs-real`
- `GET /roi-proyectos`

**Total: 23 endpoints legacy adicionales removidos.**

---

## 3. Cambios en server.py

### Imports reemplazados:
| Antes (híbrido) | Después (CORE puro) |
|-----------------|-------------------|
| `from routers.contabilidad` | `from routers.core_contabilidad` |
| `from routers.articulos` | `from routers.inventario_core` |
| `from routers.finanzas_gerencial` | `from routers.flujo_caja` |

### Routers activos finales en server.py (22 → 22, misma cantidad pero 100% CORE):
```
CORE puros (20):
  core, dashboard, empresas, maestros, cuentas_financieras, terceros,
  inventario_core, compras, pagos, gastos, ventas_pos, cxc_cxp,
  banco, reportes, core_contabilidad, export, marcas, flujo_caja,
  tesoreria, valorizacion, categorias_gasto, prorrateo, reportes_simplificados

REVISAR (2):
  compras, banco
```

---

## 4. Archivos legacy listos para mover a /legacy/

### Backend (9 archivos, 0 dependencias CORE)
```
routers/contabilidad.py       → legacy/ (18 endpoints muertos)
routers/articulos.py           → legacy/ (2 endpoints muertos)
routers/finanzas_gerencial.py  → legacy/ (3 endpoints muertos)
routers/planillas.py           → legacy/ (Fase 2)
routers/presupuestos.py        → legacy/ (Fase 2)
routers/proyectos.py           → legacy/ (Fase 2)
routers/capital_linea.py       → legacy/ (Fase 2)
routers/dashboard_financiero.py → legacy/ (Fase 2)
routers/reportes_gerenciales.py → legacy/ (Fase 2)
```

### Frontend (19 archivos, 0 imports activos)
```
pages/DashboardFinanciero.jsx, BalanceGeneral.jsx, EstadoResultados.jsx,
Asientos.jsx, CuentasContables.jsx, ConfigContable.jsx,
Empleados.jsx, Adelantos.jsx, Planilla.jsx,
Presupuestos.jsx, PresupuestoVsReal.jsx,
Proyectos.jsx, RoiProyectos.jsx,
Rentabilidad.jsx, RentabilidadLinea.jsx,
ReportePagos.jsx, Articulos.jsx, Categorias.jsx, Reportes.jsx
```

---

## 5. Siguiente paso: Fase 4 (mover a /legacy/)

Crear carpetas y mover archivos:
```bash
mkdir -p /app/backend/routers/legacy
mkdir -p /app/frontend/src/pages/legacy
mv backend/routers/{contabilidad,articulos,finanzas_gerencial,planillas,presupuestos,proyectos,capital_linea,dashboard_financiero,reportes_gerenciales}.py backend/routers/legacy/
mv frontend/src/pages/{DashboardFinanciero,BalanceGeneral,...}.jsx frontend/src/pages/legacy/
```
