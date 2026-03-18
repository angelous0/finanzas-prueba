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

### Problema 1 - Form state sin IDs
Al editar la clasificacion (Linea de Negocio, Categoria, Centro de Costo) de una factura pagada o canjeada y guardar, los cambios no se persistian.
- Causa: `populateFromFactura` no incluia el `id` de cada linea de detalle
- Fix: Se agrego `id: l.id` en el mapeo de lineas

### Problema 2 - Distribuciones analiticas no se creaban para pagos de letras
Los pagos de letras vinculadas a una factura no generaban distribuciones analiticas, causando que los costos por linea de negocio no aparecieran en el Dashboard.
- Causa 1: FK incorrecto en `cont_distribucion_analitica.categoria_id` apuntaba a `cont_categoria_gasto` en vez de `cont_categoria`
- Causa 2: `recalcular_distribuciones_factura` retornaba temprano si no habia pagos directos, sin procesar pagos de letras
- Fix 1: Corregido FK en BD y en `database.py` (con migracion automatica)
- Fix 2: Removido el `return` temprano en `distribucion_service.py`

### Problema 3 - Reportes deben mostrar solo movimientos de dinero real (CORREGIDO 2026-03-13)
- Regla de negocio: Dashboard/reportes solo muestran ingresos cuando hay movimiento de dinero real
- Venta a credito NO debe sumar en ingresos hasta que se cobre la CxC
- Fix final: Dashboard/reportes usan solo `cobranza_cxc` (cobros reales), NO `venta_pos_ingreso`
- `marcar_credito` ya no crea distribucion de ingreso
- `confirmar_venta` solo crea `cobranza_cxc` (dinero recibido), ya no `venta_pos_ingreso`
- Todo con IGV incluido (amount_total)

### Testing
- Backend API: PUT classification update -> PASSED
- Frontend UI: Modal edit + Guardar -> PASSED
- Dashboard: Costos por linea de negocio ahora muestran Element Premium S/3000 + Confeccion S/5900 -> PASSED

## Vendedor y Referencia de Pago - COMPLETADO (2026-03-14)
- Corregido: Vendedor ahora usa `vendedor_id`/`vendedor_name` de Odoo (personas: Jaqueline, Luz, Julissa) en vez de `user_id` (tiendas: S. Barranca, Gamarra)
- Referencia de pago auto-llena con numero de comprobante (B014-04862, B014-04862-2, etc.)

## Bug Fix - Pagos Asociados en Ventas Credito - COMPLETADO (2026-03-14)
### Problema
Cuando se hacia un pago parcial de una venta a credito via CxC, la pestaña Ventas POS > Credito mostraba "Pago Asociado" como S/ 0.00 y no habia forma de ver el historial de pagos.
### Causa
La query de listado en pos_crud.py solo consultaba `cont_pago_aplicacion` (pagos de ventas confirmadas), pero los pagos de credito se registran en `cont_cxc_abono` a traves de la CxC vinculada.
### Solucion
- Backend: Agregados subqueries `pagos_cxc` y `num_pagos_cxc` en pos_crud.py que suman desde cont_cxc_abono -> cont_cxc -> venta
- Backend: Nuevo endpoint GET /api/ventas-pos/{order_id}/pagos-credito que retorna abonos y info CxC
- Frontend: Columna "Pagos Asoc." ahora muestra el monto correcto para ventas a credito
- Frontend: Boton "Ver Pagos" (ojo) abre modal con detalle completo: monto original, cobrado, saldo pendiente, estado CxC, tabla de abonos
### Testing
- Backend: 4/4 tests passed
- Frontend: 6/6 UI tests passed

## Feature - Rentabilidad x Linea (5 Reportes) - COMPLETADO (2026-03-14)
### Descripcion
Modulo completo de control de dinero por linea de negocio con 5 reportes:
1. **Dinero por Linea** (consolidado): ventas, cobranzas, CxC pendiente, gastos, saldo neto
2. **Ventas por Linea**: ventas confirmadas, tickets, ticket promedio
3. **Cobranza por Linea**: vendido, cobrado, pendiente, % cobrado
4. **Cruce Linea x Marca**: desglose de marcas dentro de cada linea con barras de %
5. **Gastos Directos por Linea**: gastos, facturas proveedor, total egresos
### Implementacion
- Backend: `backend/routers/reportes_linea.py` (5 endpoints GET /api/reportes/*)
- Frontend: `frontend/src/pages/RentabilidadLinea.jsx` con 5 pestanas, KPIs y export Excel
- Navegacion: Sidebar > Reportes > "Rentabilidad x Linea"
### Testing
- Backend: 19/19 tests passed
- Frontend: 8/8 UI tests passed

## Libro Analitico - COMPLETADO (2026-03-13)
Nuevo modulo que permite ver el historial completo de entradas y salidas por:
- Linea de Negocio, Marca, Centro de Costo, Categoria
- Filtro por rango de fechas
- Tabla con: Fecha, Tipo, Descripcion, Entrada, Salida, Saldo Acumulado
- Boton link para abrir el documento fuente (venta, pago, letra, gasto)
- Exportacion a CSV
- Archivos: backend/routers/libro_analitico.py, frontend/src/pages/LibroAnalitico.jsx

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

## Filtro PT en Ordenes de Compra - COMPLETADO (2026-03-17)
- El dropdown de artículos en Órdenes de Compra ahora excluye artículos con categoría 'PT' (Producto Terminado)
- Cambio mínimo: filtro frontend en OrdenesCompra.jsx línea 150

## Detalle Fino Servicios en Factura Proveedor - COMPLETADO (2026-03-18)
- Nuevo campo `servicio_detalle` (text) en cont_factura_proveedor_linea
- UI: Columna "DETALLE SERVICIO" (texto libre: Cerrado, Remallado, Basta, etc.) solo visible para tipo Servicio
- Columna "ART. / SRV. PADRE" = vínculo a servicio general de Producción (Costura, Corte, etc.)
- "REGISTRO / CORTE" = vínculo opcional al registro/corte productivo
- Lógica: Producción trabaja resumido, Finanzas registra el detalle fino → trazabilidad completa
- Archivos: FacturaFormModal.jsx (UI), compras.py (INSERT), models.py (campo), DB (ALTER TABLE)

## Tipo Línea en Factura Proveedor (Inventariable vs Servicio) - COMPLETADO (2026-03-18)
- Nuevo campo `tipo_linea` ('inventariable' / 'servicio') y `servicio_id` en cont_factura_proveedor_linea
- Endpoint GET /api/servicios-produccion (9 servicios: Corte, Lazer, Estampado, Bordado, Costura, etc.)
- UI: Columna TIPO con selector verde (Inv) / azul (Srv), selector dinámico Artículo o Servicio, Registro/Corte solo habilitado para servicios
- Archivos: FacturaFormModal.jsx, FacturasProveedor.jsx, helpers.js, api.js, compras.py, models.py

## Vinculación Factura Proveedor ↔ Ingresos MP - COMPLETADO (2026-03-17)
- Tabla puente: `finanzas2.cont_factura_ingreso_mp` (factura_linea_id, ingreso_id, articulo_id, cantidad_aplicada)
- Backend: 4 endpoints (vinculaciones, ingresos-disponibles, vincular, desvincular)
- Frontend: Modal `VincularIngresosModal.jsx` accesible desde botón Link2 en tabla de facturas
- Validaciones: no exceder cantidad facturada, no exceder cantidad del ingreso, artículo debe coincidir
- Relación many-to-many por detalle y artículo

## Bug Fix - Editar OC creaba duplicado + Artículo vacío - COMPLETADO (2026-03-17)
### Problema 1 - Editar creaba nueva OC
- `handleSubmit` siempre llamaba `createOrdenCompra()` sin verificar modo edición
- Fix: Condicionó submit para llamar `updateOrdenCompra()` cuando `editingOC` existe
### Problema 2 - Backend PUT no soportaba líneas
- `OCUpdate` solo aceptaba campos header, no líneas de detalle
- Fix: Reescrito PUT para soportar reemplazo completo de líneas con recálculo de totales
### Problema 3 - articulo_id se perdía (UUID vs integer)
- `cont_oc_linea.articulo_id` era integer pero `prod_inventario.id` es varchar (UUID)
- Backend intentaba `int(uuid)` que fallaba silenciosamente, guardando NULL
- Fix: ALTER TABLE para cambiar columna a text, eliminando FK obsoleta a cont_articulo_ref
- Mismo cambio aplicado a `cont_factura_proveedor_linea.articulo_id`

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
