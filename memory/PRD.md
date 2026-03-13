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
| Egresos | Gastos, Prorrateo, Factura Proveedor, CxP |
| Tesoreria | Tesoreria, Cuentas Bancarias, Movimientos/Pagos, Flujo de Caja |
| Reportes | Reportes Simplificados, Valorizacion Inventario |
| Catalogos | Lineas de Negocio, Marcas, Centros de Costo, Categorias Gasto, Proveedores, Clientes, Empresas |

## Backend: 22 routers activos (100% CORE)
core, dashboard, empresas, maestros, cuentas_financieras, terceros,
inventario_core, compras, pagos, gastos, ventas_pos, cxc_cxp,
banco, reportes, core_contabilidad, export, marcas, flujo_caja,
tesoreria, valorizacion, categorias_gasto, prorrateo, reportes_simplificados
+ 2 REVISAR: compras, banco

## Completado

### Fases 0-2 - Simplificacion + Bug Fixes (COMPLETADO)
### Fase 1 Cleanup Frontend (Mar 2026)
- 19 rutas legacy eliminadas, ~50 funciones muertas eliminadas, sidebar simplificado
### Fase 2 Cleanup Backend (Mar 2026)
- 6 routers legacy desregistrados (27 endpoints)
### Fase 3 Desacople CORE/LEGACY (Mar 2026)
- 3 routers hibridos reemplazados por 3 CORE puros
- core_contabilidad.py: getCuentasContables + generarAsiento
- inventario_core.py: /inventario + /modelos-cortes + /modelos
- flujo_caja.py: /flujo-caja-gerencial
- 23 endpoints legacy adicionales removidos
- Total endpoints legacy removidos: 50 (Fase 2 + Fase 3)

## Backlog

### P0 - Fase 4 (mover archivos a /legacy/)
- Crear carpetas legacy/ en backend y frontend
- Mover 9 archivos backend + 19 archivos frontend

### P1 - Decisiones pendientes usuario
- Ordenes de Compra, Letras, PagarFacturas → CORE o LEGACY?
- Conciliacion Bancaria → CORE o LEGACY?

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea

### P2 - Refactoring archivos grandes
- Split ventas_pos.py (1190 lineas)
- Split FacturasProveedor.jsx (2575 lineas)

### P3 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
