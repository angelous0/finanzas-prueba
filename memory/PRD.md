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
| Catalogos | Lineas Negocio, Marcas, Centros Costo, Categorias Gasto, Proveedores, Clientes, Empresas |

## Backend: 22 routers CORE activos
core, dashboard, empresas, maestros, cuentas_financieras, terceros,
inventario_core, compras, pagos, gastos, ventas_pos, cxc_cxp,
banco, reportes, core_contabilidad, export, marcas, flujo_caja,
tesoreria, valorizacion, categorias_gasto, prorrateo, reportes_simplificados

## Cleanup Completado (Fases 1-4)
- Fase 1: 19 rutas frontend + ~50 funciones api.js eliminadas
- Fase 2: 6 routers backend desregistrados (27 endpoints)
- Fase 3: 3 routers hibridos → 3 CORE puros (23 endpoints legacy adicionales)
- Fase 4: 28 archivos movidos a /legacy/ (9 backend + 19 frontend)
- Total: 50 endpoints legacy removidos, 0 dependencias CORE rotas

## Backlog

### P0 - Decisiones pendientes usuario
- Ordenes de Compra, Letras, PagarFacturas → CORE o LEGACY?
- Conciliacion Bancaria → CORE o LEGACY?

### P1 - Refactoring archivos grandes
- Split ventas_pos.py (1190 lineas)
- Split FacturasProveedor.jsx (2575 lineas)

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
