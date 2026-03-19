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

### FacturasProveedor.jsx - COMPLETADO (2026-03-13)
Archivo original: 2576 lineas -> Orquestador de 256 lineas + 9 componentes

## Unificacion Tablas de Pago - COMPLETADO (2026-03-13)
`cont_movimiento_tesoreria` es ahora la UNICA fuente de verdad para todos los movimientos financieros.

## Bug Fix - Clasificacion en facturas pagadas/canjeadas - COMPLETADO (2026-03-13)

## Vendedor y Referencia de Pago - COMPLETADO (2026-03-14)

## Bug Fix - Pagos Asociados en Ventas Credito - COMPLETADO (2026-03-14)

## Feature - Rentabilidad x Linea (5 Reportes) - COMPLETADO (2026-03-14)

## Libro Analitico - COMPLETADO (2026-03-13)

## Filtro PT en Ordenes de Compra - COMPLETADO (2026-03-17)

## Detalle Fino Servicios en Factura Proveedor - COMPLETADO (2026-03-18)

## Tipo Linea en Factura Proveedor (Inventariable vs Servicio) - COMPLETADO (2026-03-18)

## Vinculacion Factura Proveedor - Ingresos MP - COMPLETADO (2026-03-17)

## Bug Fix - Editar OC creaba duplicado + Articulo vacio - COMPLETADO (2026-03-17)

## Reportes Financieros Gerenciales - COMPLETADO (2026-03-18)

## Auto-Matching Conciliacion Bancaria - COMPLETADO (2026-03-19)
### Descripcion
Motor de sugerencias automaticas para la conciliacion bancaria que analiza movimientos pendientes del banco y del sistema, y sugiere pares que coinciden.
### Reglas de matching
1. **Referencia Exacta (confianza alta):** Monto identico + referencia identica
2. **Monto + Fecha (confianza media/alta):** Monto identico + fecha dentro de ±3 dias
### Implementacion
- Backend: `GET /api/conciliacion/sugerencias` - Retorna pares sugeridos con regla y confianza
- Backend: `POST /api/conciliacion/confirmar-sugerencias` - Persiste matches seleccionados
- Frontend: Banner verde con conteo de coincidencias, lista de pares sugeridos con checkboxes
- Frontend: Filas resaltadas en verde con icono link en ambas tablas
- Frontend: Boton "Confirmar N Sugerencias" en header, botones Deseleccionar/Descartar
- DB Migration: Eliminado FK obsoleto cont_conciliacion_linea.pago_id -> cont_pago (tabla deprecated)
### Testing
- Backend: 14/14 tests passed
- Frontend: 9/9 UI tests passed

## Backlog

### P1 - Conciliacion N:1 y 1:N
- Permitir vincular multiples movimientos del sistema a uno del banco y viceversa

### P1 - Agregar Linea de Negocio a Factura Proveedor
- Campo linea_negocio_id en cont_factura_proveedor_linea
- Selector en form modal, persistencia en backend

### P1 - Pendiente de split (Fase 5)
- Split Gastos.jsx (frontend)
- Split VentasPOS.jsx (frontend)
- Split compras.py (backend)
- Split gastos.py (backend)

### P1 - Decisiones pendientes usuario
- Ordenes de Compra, PagarFacturas -> CORE o LEGACY?

### P2 - Reportes Faltantes
- Completar reportes simplificados restantes

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
