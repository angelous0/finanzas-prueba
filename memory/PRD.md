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
- Fase 3: 3 routers hibridos -> 3 CORE puros (23 endpoints legacy adicionales)
- Fase 4: 28 archivos movidos a /legacy/ (9 backend + 19 frontend)
- Total: 50 endpoints legacy removidos, 0 dependencias CORE rotas

## Fase 5: Split de archivos grandes (EN PROGRESO)

### ventas_pos.py - COMPLETADO (2026-03-13)
Archivo original: 1191 lineas -> Orquestador de 21 lineas + 4 modulos

| Modulo | Lineas | Responsabilidad | Endpoints |
|--------|--------|-----------------|-----------|
| pos_common.py | 10 | Utilidades compartidas (get_company_key) | 0 |
| pos_sync.py | 267 | Config Odoo, sync-local, refresh, _sync_odoo_to_local | 4 |
| pos_crud.py | 232 | Listado ventas, detalle lineas, _list_from_odoo | 2 |
| pos_estados.py | 419 | Confirmar/credito/descartar/desconfirmar, distribucion analitica | 5 |
| pos_pagos.py | 298 | CRUD pagos (GET/POST/PUT/DELETE), pagos oficiales | 5 |
| ventas_pos.py | 21 | Orquestador: importa e incluye los 4 sub-routers | 0 |
| **Total** | **1247** | | **16** |

Verificacion: 90% backend (18/20 - 2 son comportamiento esperado), 100% frontend. 0 regresiones.

## Backlog

### P0 - Pendiente de split (Fase 5)
- Split FacturasProveedor.jsx (frontend)
- Split Gastos.jsx (frontend)
- Split VentasPOS.jsx (frontend)
- Split compras.py (backend)
- Split gastos.py (backend)

### P0 - Decisiones pendientes usuario
- Ordenes de Compra, Letras, PagarFacturas -> CORE o LEGACY?
- Conciliacion Bancaria -> CORE o LEGACY?

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
