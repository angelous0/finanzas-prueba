# AUDITORÍA TÉCNICA — Finanzas 4.0
## Fecha: 13 Marzo 2026 | Solo lectura — sin cambios

---

# 1. FRONTEND

## 1.1 Mapa de Rutas

### Rutas ACTIVAS en Sidebar (21 rutas visibles al usuario)
| Ruta | Componente | Líneas | Clasificación |
|------|-----------|--------|---------------|
| `/` | Dashboard.jsx | 222 | **CORE** |
| `/dashboard-financiero` | DashboardFinanciero.jsx | 407 | **CORE** — revisar si se unifica con Dashboard |
| `/ventas-pos` | VentasPOS.jsx | 1133 | **CORE** ⚠️ archivo grande |
| `/cxc` | CxC.jsx | 352 | **CORE** |
| `/gastos` | Gastos.jsx | 1344 | **CORE** ⚠️ archivo grande |
| `/prorrateo` | ProrrateoGastos.jsx | 457 | **CORE** |
| `/facturas-proveedor` | FacturasProveedor.jsx | 2575 | **CORE** ⚠️ MÁS GRANDE del proyecto |
| `/cxp` | CxP.jsx | 357 | **CORE** |
| `/tesoreria` | Tesoreria.jsx | 212 | **CORE** |
| `/cuentas-bancarias` | CuentasBancarias.jsx | 482 | **CORE** |
| `/pagos` | Pagos.jsx | 343 | **CORE** |
| `/flujo-caja` | FlujoCaja.jsx | 223 | **CORE** |
| `/reportes-gerenciales` | Reportes.jsx | 168 | **CORE** — revisar si se unifica con Simplificados |
| `/reportes-simplificados` | ReportesSimplificados.jsx | 194 | **CORE** |
| `/lineas-negocio` | LineasNegocio.jsx | 245 | **CORE** |
| `/marcas` | Marcas.jsx | 99 | **CORE** |
| `/centros-costo` | CentrosCosto.jsx | 171 | **CORE** |
| `/categorias-gasto` | CategoriasGasto.jsx | 181 | **CORE** |
| `/proveedores` | Proveedores.jsx | 334 | **CORE** |
| `/clientes` | Clientes (PlaceholderPages) | — | **CORE** — es solo placeholder |
| `/empresas` | Empresas.jsx | 261 | **CORE** |

### Rutas OCULTAS — Registradas en App.js pero NO en Sidebar (23 rutas fantasma)
| Ruta | Componente | Líneas | Clasificación |
|------|-----------|--------|---------------|
| `/valorizacion-inventario` | ValorizacionInventario.jsx | 200 | **CORE** — falta agregar al Sidebar |
| `/ordenes-compra` | OrdenesCompra.jsx | 1267 | **REVISAR** — ¿lo usa el usuario? |
| `/pagar-facturas` | PagarFacturas.jsx | 422 | **REVISAR** — ligado a Facturas Proveedor |
| `/letras` | Letras.jsx | 450 | **REVISAR** — ¿se usa actualmente? |
| `/conciliacion` | ConciliacionBancaria.jsx | 1362 | **REVISAR** — ¿se usa? Archivo grande |
| `/historial-conciliaciones` | HistorialConciliaciones.jsx | 335 | **REVISAR** — ligado a Conciliación |
| `/rentabilidad` | Rentabilidad.jsx | 252 | **LEGACY** — reportes gerenciales cubren esto |
| `/rentabilidad-linea` | RentabilidadLinea.jsx | 313 | **LEGACY** — cubierto por Reportes Simplificados |
| `/presupuesto-vs-real` | PresupuestoVsReal.jsx | 180 | **LEGACY** |
| `/presupuestos` | Presupuestos.jsx | 324 | **LEGACY** |
| `/roi-proyectos` | RoiProyectos.jsx | 217 | **LEGACY** |
| `/proyectos` | Proyectos.jsx | 115 | **LEGACY** |
| `/balance-general` | BalanceGeneral.jsx | 192 | **LEGACY** — contabilidad compleja |
| `/estado-resultados` | EstadoResultados.jsx | 175 | **LEGACY** — contabilidad compleja |
| `/asientos` | Asientos.jsx | 189 | **LEGACY** — contabilidad compleja |
| `/cuentas-contables` | CuentasContables.jsx | 230 | **LEGACY** — contabilidad compleja |
| `/config-contable` | ConfigContable.jsx | 111 | **LEGACY** — contabilidad compleja |
| `/reporte-pagos` | ReportePagos.jsx | 237 | **LEGACY** — cubierto por Pagos/Tesorería |
| `/empleados` | Empleados.jsx | 452 | **LEGACY** — planilla |
| `/adelantos` | Adelantos.jsx | 916 | **LEGACY** — planilla |
| `/planilla` y `/planillas` | Planilla.jsx | 939 | **LEGACY** — planilla (ruta duplicada) |
| `/articulos` | Articulos.jsx | 116 | **LEGACY** — catálogo no usado |
| `/categorias` | Categorias.jsx | 313 | **LEGACY** — reemplazado por CategoríasGasto |

## 1.2 Archivos Grandes (>500 líneas) — Candidatos a partir
| Archivo | Líneas | Riesgo |
|---------|--------|--------|
| FacturasProveedor.jsx | **2575** | 🔴 MUY GRANDE — difícil de mantener |
| ConciliacionBancaria.jsx | **1362** | 🔴 Grande + oculto (legacy?) |
| Gastos.jsx | **1344** | 🟡 Grande pero CORE |
| OrdenesCompra.jsx | **1267** | 🟡 Grande + oculto (revisar) |
| VentasPOS.jsx | **1133** | 🟡 Grande pero CORE |
| Planilla.jsx | **939** | 🔴 Grande + legacy |
| Adelantos.jsx | **916** | 🔴 Grande + legacy |

## 1.3 Componentes
| Componente | Uso | Estado |
|-----------|-----|--------|
| Sidebar.jsx | Navegación principal | **CORE** — limpio |
| TopBar.jsx | Selector empresa | **CORE** |
| SearchableSelect.jsx | Select buscable | **CORE** — usado en forms |
| TableSearchSelect.jsx | Select en tablas | **REVISAR** — ¿se usa aún? |
| PlaceholderPages.jsx | Páginas placeholder | **LIMPIAR** — solo `Clientes` se importa, el resto son exports muertos |

## 1.4 API Functions Muertas (en api.js, nunca usadas en /pages/)
```
getDashboardKPIs, createMoneda, deleteMoneda, getClientes,
getEmpleadoDetalle, getArticulos, createArticulo, getOrdenCompra,
updateOrdenCompra, getFacturaProveedor, getDistribucionAnalitica,
createConciliacion, getReporteFlujoCaja, getReporteMayor,
getReporteBalanceContable, getReportePnl, getPeriodos,
cerrarPeriodo, abrirPeriodo, getRetencionDetalle, upsertRetencionDetalle
```
**21 funciones exportadas que nadie consume.**

---

# 2. BACKEND

## 2.1 Routers Registrados (28 routers activos en server.py)

### CORE — Necesarios para operación actual
| Router | Endpoints | Líneas | Estado |
|--------|-----------|--------|--------|
| ventas_pos.py | 16 | **1190** | ⚠️ MÁS GRANDE — necesita split |
| gastos.py | 9 | 444 | CORE |
| cxc_cxp.py | 10 | 512 | CORE |
| pagos.py | 8 | 358 | CORE |
| tesoreria.py | 3 | 202 | CORE |
| cuentas_financieras.py | 7 | 225 | CORE |
| dashboard.py | 2 | 186 | CORE |
| dashboard_financiero.py | 1 | 226 | CORE — revisar unificar con dashboard |
| categorias_gasto.py | 4 | 66 | CORE |
| prorrateo.py | 5 | 237 | CORE |
| reportes_simplificados.py | 8 | 208 | CORE |
| marcas.py | 4 | 55 | CORE |
| empresas.py | 4 | 83 | CORE |
| terceros.py | 10 | 182 | CORE (proveedores/clientes) |
| maestros.py | 16 | 240 | CORE (monedas, categorías, líneas, centros) |
| valorizacion.py | 2 | 192 | CORE (usuario lo quiere activo) |
| core.py | 2 | 20 | CORE (health check) |
| export.py | 1 | 183 | CORE (exportar a Excel) |

### LEGACY — Candidatos a desregistrar de server.py
| Router | Endpoints | Líneas | Motivo |
|--------|-----------|--------|--------|
| contabilidad.py | **20** | **462** | Asientos, Balance, PnL, Cuentas, Config — TODO legacy |
| finanzas_gerencial.py | 4 | 431 | Flujo gerencial, Rentabilidad, PvsR, ROI — duplica reportes |
| reportes_gerenciales.py | 7 | 441 | Exportaciones gerenciales — revisar si alguno se usa |
| capital_linea.py | 5 | 284 | ROI/Capital por línea — legacy |
| proyectos.py | 4 | 77 | Módulo pausado |
| presupuestos.py | 5 | 111 | Presupuesto vs Real — legacy |
| planillas.py | 5 | 168 | Planilla/Empleados — legacy |
| articulos.py | 5 | 114 | Catálogo artículos — no usado |

### REVISAR — Pueden ser core o legacy
| Router | Endpoints | Líneas | Duda |
|--------|-----------|--------|------|
| compras.py | 14 | **524** | OC + Facturas + Letras — ¿se usa activamente? |
| banco.py | 9 | **431** | Conciliación bancaria — ¿activo o pausado? |
| reportes.py | 3 | 101 | Flujo caja contable, EERR, Balance — ¿se usa o lo cubre reportes_simplificados? |

## 2.2 Archivos Grandes Backend (>400 líneas)
| Archivo | Líneas | Riesgo |
|---------|--------|--------|
| ventas_pos.py | **1190** | 🔴 Monolítico — sync, CRUD, pagos, confirm, credit todo junto |
| compras.py | **524** | 🟡 OC + Facturas + Letras en un solo archivo |
| cxc_cxp.py | **512** | 🟡 CxC y CxP juntos — podría separarse |
| contabilidad.py | **462** | 🔴 Legacy completo — 20 endpoints que no se usan |
| gastos.py | **444** | 🟡 CORE pero grande |
| reportes_gerenciales.py | **441** | 🔴 Legacy — duplica reportes simplificados |
| finanzas_gerencial.py | **431** | 🔴 Legacy — duplica funcionalidad |
| banco.py | **431** | 🟡 Revisar si activo |

## 2.3 Services
| Service | Líneas | Estado |
|---------|--------|--------|
| distribucion_analitica.py | 87 | **CORE** |
| linea_mapping.py | 85 | **CORE** |
| treasury_service.py | 51 | **CORE** |

## 2.4 Database (database.py — 1260 líneas)
**49 tablas creadas.** Muchas corresponden a módulos legacy:
- `cont_asiento`, `cont_asiento_linea` — contabilidad
- `cont_capital_linea_negocio` — ROI
- `cont_presupuesto`, `cont_presupuesto_linea` — presupuesto
- `cont_planilla`, `cont_planilla_detalle`, `cont_empleado_detalle`, `cont_adelanto_empleado` — planilla
- `cont_banco_mov`, `cont_banco_mov_raw`, `cont_conciliacion`, `cont_conciliacion_linea` — conciliación
- `cont_periodo_cerrado`, `cont_cuenta`, `cont_config_empresa`, `cont_tipo_cambio` — contabilidad
- `cont_retencion_detalle` — retenciones

---

# 3. CLASIFICACIÓN FINAL

## 🟢 CONSERVAR (Core activo)
| Módulo | Frontend | Backend | Notas |
|--------|----------|---------|-------|
| Dashboard | Dashboard.jsx | dashboard.py | — |
| Dashboard Financiero | DashboardFinanciero.jsx | dashboard_financiero.py | Evaluar unificar |
| Ventas POS | VentasPOS.jsx | ventas_pos.py | Split necesario |
| Gastos | Gastos.jsx | gastos.py | — |
| CxC | CxC.jsx | cxc_cxp.py | — |
| CxP | CxP.jsx | cxc_cxp.py | — |
| Tesorería | Tesoreria.jsx | tesoreria.py | — |
| Cuentas Bancarias | CuentasBancarias.jsx | cuentas_financieras.py | — |
| Movimientos/Pagos | Pagos.jsx | pagos.py | — |
| Flujo de Caja | FlujoCaja.jsx | reportes.py? | Verificar fuente de datos |
| Facturas Proveedor | FacturasProveedor.jsx | compras.py | Split necesario |
| Prorrateo | ProrrateoGastos.jsx | prorrateo.py | — |
| Reportes Simplificados | ReportesSimplificados.jsx | reportes_simplificados.py | — |
| Reportes Gerenciales | Reportes.jsx | reportes_gerenciales.py | Evaluar unificar con Simplificados |
| Valorización Inventario | ValorizacionInventario.jsx | valorizacion.py | Agregar al Sidebar |
| Líneas de Negocio | LineasNegocio.jsx | maestros.py | — |
| Marcas | Marcas.jsx | marcas.py | — |
| Centros de Costo | CentrosCosto.jsx | maestros.py | — |
| Categorías Gasto | CategoriasGasto.jsx | categorias_gasto.py | — |
| Proveedores | Proveedores.jsx | terceros.py | — |
| Clientes | PlaceholderPages | terceros.py | Necesita implementación real |
| Empresas | Empresas.jsx | empresas.py | — |
| Export Excel | — | export.py | — |

## 🟡 REFACTORIZAR (Core pero necesita work)
| Archivo | Problema | Acción sugerida |
|---------|----------|-----------------|
| ventas_pos.py (1190 líneas) | Monolítico | Split: pos_sync.py, pos_pagos.py, pos_crud.py |
| FacturasProveedor.jsx (2575 líneas) | Enorme | Split: tabla, form, modal detalle |
| Gastos.jsx (1344 líneas) | Grande | Split: tabla, form |
| VentasPOS.jsx (1133 líneas) | Grande | Split: tabla, modal detalle, acciones |
| cxc_cxp.py (512 líneas) | CxC y CxP juntos | Evaluar split |
| App.js (238 líneas) | 44 imports, 23 rutas legacy | Limpiar tras mover legacy |
| api.js (334 líneas) | 21 funciones muertas | Eliminar exports no usados |
| database.py (1260 líneas) | 49 tablas incluyendo legacy | Separar schemas |
| App.css (2444 líneas) | Monolítico | Evaluar módulos CSS |

## 🔴 MOVER A LEGACY
| Módulo | Frontend | Backend | Tablas BD |
|--------|----------|---------|-----------|
| **Contabilidad** | BalanceGeneral, EstadoResultados, Asientos, CuentasContables, ConfigContable | contabilidad.py (20 endpoints) | cont_asiento, cont_asiento_linea, cont_cuenta, cont_config_empresa, cont_periodo_cerrado |
| **Presupuesto** | Presupuestos, PresupuestoVsReal | presupuestos.py, finanzas_gerencial.py | cont_presupuesto, cont_presupuesto_linea |
| **Proyectos** | Proyectos.jsx | proyectos.py | cont_proyecto |
| **ROI/Capital** | RoiProyectos, Rentabilidad, RentabilidadLinea | capital_linea.py, finanzas_gerencial.py | cont_capital_linea_negocio |
| **Planilla** | Empleados, Adelantos, Planilla | planillas.py | cont_planilla, cont_planilla_detalle, cont_empleado_detalle, cont_adelanto_empleado |
| **Conciliación** | ConciliacionBancaria, HistorialConciliaciones | banco.py | cont_banco_mov, cont_banco_mov_raw, cont_conciliacion, cont_conciliacion_linea |
| **Artículos** | Articulos.jsx | articulos.py | cont_articulo_ref |

## ⚪ ELIMINAR POTENCIALMENTE
| Elemento | Motivo |
|----------|--------|
| PlaceholderPages.jsx (exports muertos) | Solo `Clientes` se usa, 7 exports basura |
| Categorias.jsx | Reemplazada por CategoriasGasto.jsx |
| ReportePagos.jsx | Cubierto por Pagos/Tesorería |
| Ruta `/planillas` (duplicada) | Ya existe `/planilla` |
| 21 funciones muertas en api.js | Nunca se llaman |
| Letras.jsx / OrdenesCompra.jsx / PagarFacturas.jsx | Revisar con usuario si se usan |

---

# 4. PROPUESTA DE LIMPIEZA POR FASES

## Fase 1 — Limpieza segura (0 riesgo)
- Remover imports y rutas de módulos legacy en App.js
- Limpiar PlaceholderPages.jsx (solo dejar Clientes)
- Eliminar 21 funciones muertas de api.js
- Eliminar ruta duplicada `/planillas`
- Agregar `/valorizacion-inventario` al Sidebar

## Fase 2 — Desregistrar routers legacy (bajo riesgo)
- Comentar/remover de server.py:
  - contabilidad.py
  - capital_linea.py
  - proyectos.py
  - presupuestos.py
  - planillas.py
  - finanzas_gerencial.py (tras verificar que FlujoCaja no depende)
- NO borrar archivos, solo desconectar

## Fase 3 — Refactorizar core (medio riesgo)
- Split ventas_pos.py → pos_sync.py, pos_pagos.py, pos_crud.py
- Split FacturasProveedor.jsx → tabla + form + modal
- Limpiar api.js por módulos
- Evaluar unificar Dashboard + DashboardFinanciero
- Evaluar unificar Reportes + ReportesSimplificados

## Fase 4 — Mover archivos a /legacy/ (organización)
- Crear /app/frontend/src/pages/legacy/ y /app/backend/routers/legacy/
- Mover los 15+ archivos legacy
- Documentar en PRD qué está en legacy y por qué

## Fase 5 — Limpieza profunda (para cuando haya tests)
- Revisar tablas BD legacy (no borrar, solo documentar)
- Limpiar App.css de estilos huérfanos
- Revisar dependencias npm/pip no usadas

---

# 5. RESUMEN NUMÉRICO

| Métrica | Valor |
|---------|-------|
| Rutas totales en App.js | **44** |
| Rutas en Sidebar (visibles) | **21** |
| Rutas ocultas (fantasma) | **23** |
| Routers backend activos | **28** |
| Routers legacy estimados | **8** |
| Endpoints legacy cargados | **~53** |
| Páginas frontend > 500 líneas | **7** |
| Funciones API muertas | **21** |
| Tablas BD legacy estimadas | **~15** |
| Archivos candidatos a legacy | **~20** |
