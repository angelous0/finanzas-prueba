# Finanzas 4.0 - PRD

## Problema Original
Simplificar el modulo de Finanzas Gerenciales para enfocarse en operaciones financieras core.

## Principios Clave
1. 1 movimiento real de tesoreria por cobro + N distribuciones analiticas
2. Distribucion automatica por linea de negocio desde detalle POS
3. Gastos: directo / comun / no_asignado con prorrateo de comunes
4. Dimensiones: Linea de Negocio, Marca, Centro de Costo, Categoria de Gasto

## Modulos CORE Activos (20 items en Sidebar)
| Seccion | Items |
|---------|-------|
| Principal | Dashboard |
| Ventas | Ventas POS, CxC |
| Egresos | Gastos, Prorrateo, Factura Proveedor, CxP, Letras |
| Tesoreria | Tesoreria, Cuentas Bancarias, Movimientos/Pagos, Flujo de Caja, Conciliacion Bancaria, Historial Conciliaciones |
| Reportes | Reportes Simplificados, Valorizacion Inventario |
| Catalogos | Lineas Negocio, Marcas, Centros Costo, Categorias Gasto, Proveedores, Clientes, Empresas |

## Backend: 22 routers CORE activos
core, dashboard, empresas, maestros, cuentas_financieras, terceros,
inventario_core, compras, pagos, gastos, ventas_pos, cxc_cxp,
banco, reportes, core_contabilidad, export, marcas, flujo_caja,
tesoreria, valorizacion, categorias_gasto, prorrateo, reportes_simplificados

## Cleanup Completado (Fases 1-4)
- Fase 1: 19 rutas frontend + ~50 funciones api.js eliminadas
- Fase 2: 6 routers backend desregistrados (27 endpoints)
- Fase 3: 3 routers hibridos -> 3 CORE puros (23 endpoints legacy adicionales)
- Fase 4: 28 archivos movidos a /legacy/ (9 backend + 19 frontend)
- Total: 50 endpoints legacy removidos, 0 dependencias CORE rotas

## Fase 5: Split de archivos grandes

### ventas_pos.py - COMPLETADO (2026-03-13)
Archivo original: 1191 lineas -> Orquestador de 21 lineas + 4 modulos
| Modulo | Lineas | Responsabilidad |
|--------|--------|-----------------|
| pos_common.py | 10 | get_company_key() |
| pos_sync.py | 267 | Config Odoo, sync-local, refresh |
| pos_crud.py | 232 | Listado ventas, detalle lineas |
| pos_estados.py | 419 | Confirmar/credito/descartar/desconfirmar, distribucion analitica |
| pos_pagos.py | 298 | CRUD pagos |
| ventas_pos.py | 21 | Orquestador |

### FacturasProveedor.jsx - COMPLETADO (2026-03-13)
Archivo original: 2576 lineas -> Orquestador de 256 lineas + 9 componentes
| Modulo | Lineas | Responsabilidad |
|--------|--------|-----------------|
| helpers.js | 209 | Formatters, calculos, PDF |
| FacturaFormModal.jsx | 495 | Modal crear/editar factura |
| FacturasTable.jsx | 170 | Tabla con filtros y acciones |
| PagoModal.jsx | 144 | Modal registrar pago |
| LetrasModal.jsx | 203 | Modal canjear por letras |
| VerPagosModal.jsx | 125 | Modal historial de pagos |
| VerLetrasModal.jsx | 127 | Modal letras vinculadas |
| ExportModal.jsx | 85 | Modal exportar CompraAPP |
| ProveedorModal.jsx | 59 | Modal crear proveedor |
| FacturasProveedor.jsx | 256 | Orquestador |

## Unificacion Tablas de Pago - COMPLETADO (2026-03-13)

### Problema
Pagos se escribian en dos tablas separadas: `cont_pago` y `cont_movimiento_tesoreria`, causando inconsistencias entre las vistas "Movimientos/Pagos" (leia cont_pago) y "Tesoreria" (leia cont_movimiento_tesoreria).

### Solucion
`cont_movimiento_tesoreria` es ahora la UNICA fuente de verdad para todos los movimientos financieros.

### Cambios realizados
| Archivo | Cambio |
|---------|--------|
| pagos.py | Reescritura completa: CRUD lee/escribe de cont_movimiento_tesoreria |
| database.py | Migracion: columna movimiento_tesoreria_id en cont_pago_aplicacion y cont_pago_detalle |
| models.py | PagoDetalle/PagoAplicacion: pago_id opcional, nuevo movimiento_tesoreria_id |
| server.py | sync_correlativos actualizado para leer de cont_movimiento_tesoreria |
| compras.py | get_pagos_de_factura usa COALESCE para soportar registros old/new style |

### Tabla deprecada
- `cont_pago` ya NO se escribe desde pagos.py (otros routers aun escriben dual)

### Testing
- Backend: 13/13 tests passed (lifecycle factura+pago, lifecycle letras+pago)
- Frontend: Todas las pruebas UI pasaron

## Bug Fix - Clasificacion en facturas pagadas/canjeadas - COMPLETADO (2026-03-13)

### Problema
Al editar la clasificacion (Linea de Negocio, Categoria, Centro de Costo) de una factura pagada o canjeada y guardar, los cambios no se persistian.

### Causa Raiz
En `FacturaFormModal.jsx`, la funcion `populateFromFactura` no incluia el `id` de cada linea de detalle al cargar los datos en el state del formulario. Sin el `id`, el backend no podia identificar que lineas actualizar y las ignoraba.

### Fix
Se agrego `id: l.id` en el mapeo de lineas dentro de `populateFromFactura` (lineas 70 y 75 del archivo).

### Testing
- Backend API: PUT classification update -> PASSED
- Frontend UI: Modal edit + Guardar -> PASSED
- Data persistence verified -> PASSED

## Backlog

### P1 - Pendiente de split (Fase 5)
- Split Gastos.jsx (frontend)
- Split VentasPOS.jsx (frontend)
- Split compras.py (backend)
- Split gastos.py (backend)

### P1 - Decisiones pendientes usuario
- Ordenes de Compra, PagarFacturas -> CORE o LEGACY?
- RESUELTO: Letras -> CORE (reactivado 2026-03-13)
- RESUELTO: Conciliacion Bancaria -> CORE (reactivado 2026-03-13)

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
