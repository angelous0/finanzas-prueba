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

## Backend: 22 routers activos
- 17 CORE puros
- 3 CORE con legacy residual (contabilidad, articulos, finanzas_gerencial)
- 2 REVISAR (compras, banco)

## Completado

### Fase 0 - Desacoplamiento Odoo
### Fase 1-2 - Simplificacion Backend+Frontend
### Dashboard + Ventas POS + Reportes
### Bug Fixes Criticos
- P0 Tesoreria/Pagos invisibles
- Error al marcar Credito
- Abono CxC no visible en Pagos
- Campos Odoo faltantes (tipo_comp, num_comp, x_pagos, company_name)
- Cantidad faltante (quantity_total)

### Fase 1 Cleanup Frontend (Mar 2026)
- 19 rutas legacy eliminadas de App.js
- ~50 funciones muertas eliminadas de api.js
- PlaceholderPages limpiado
- Sidebar simplificado: 6 secciones, 20 items
- Valorizacion Inventario agregada al Sidebar

### Fase 2 Cleanup Backend (Mar 2026)
- 6 routers legacy desregistrados de server.py (27 endpoints)
- Desregistrados: planillas, presupuestos, proyectos, capital_linea, dashboard_financiero, reportes_gerenciales
- 3 routers bloqueados por dependencias CORE (contabilidad, articulos, finanzas_gerencial)
- 2 routers REVISAR conservados (compras, banco)
- Documentacion completa en PHASE2_CLEANUP.md

## Backlog

### P0 - Fase 3 Refactoring
- Extraer endpoints CORE de contabilidad.py (getCuentasContables, generarAsiento) a micro-router
- Extraer /flujo-caja-gerencial de finanzas_gerencial.py a su propio router
- Renombrar articulos.py a inventario.py, limpiar endpoints muertos
- Split ventas_pos.py (1190 lineas)
- Split FacturasProveedor.jsx (2575 lineas)
- Mover archivos legacy a carpetas /legacy/

### P1 - Decisiones pendientes usuario
- Ordenes de Compra, Letras, PagarFacturas → CORE o LEGACY?
- Conciliacion Bancaria → CORE o LEGACY?

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
