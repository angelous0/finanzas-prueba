# Finanzas 4.0 - PRD (Simplificacion)

## Problema Original
Simplificar el modulo de Finanzas Gerenciales para enfocarse en operaciones financieras core:
Ventas POS, Gastos, CxC, CxP, Tesoreria y dimensiones analiticas clave.

## Principios Clave
1. **1 movimiento real de tesoreria por cobro** + N distribuciones analiticas
2. **Distribucion automatica por linea de negocio** desde detalle POS (nunca manual)
3. **Gastos**: directo / comun / no_asignado con prorrateo de comunes
4. **Dimensiones**: Linea de Negocio (eje principal), Marca, Centro de Costo, Categoria de Gasto

## Modulos Activos
- Dashboard Ejecutivo / Dashboard Financiero
- Ventas POS + CxC
- Gastos + Prorrateo + Factura Proveedor + CxP
- Tesoreria + Cuentas Bancarias + Movimientos + Flujo de Caja
- Reportes Gerenciales + Reportes Simplificados
- Catalogos: Lineas de Negocio, Marcas, Centros de Costo, Categorias Gasto, Proveedores, Clientes, Empresas

## Modulos Pausados
- Proyectos, Capital & ROI, Valorizacion Inventario, Presupuesto vs Real

## Lo Implementado

### Fase 0 - Desacoplamiento Odoo (COMPLETADO - Feb 2026)
- Refactorizacion completa de endpoints financieros para leer tablas locales
- Sincronizacion local de datos Odoo
- Tabla cont_distribucion_analitica para separar tesoreria de analitica

### Fase 1 - Backend Simplificacion (COMPLETADO - Mar 2026)
- CRUD categorias de gasto
- Gastos con campos: categoria_gasto_id, tipo_asignacion, centro_costo_id, marca_id, linea_negocio_id
- Prorrateo: pendientes, preview (3 metodos), ejecutar, historial

### Fase 2 - Frontend Simplificacion (COMPLETADO - Mar 2026)
- Sidebar simplificado, CategoriasGasto.jsx, ProrrateoGastos.jsx, Gastos.jsx actualizado

### Dashboard Ejecutivo (COMPLETADO - Mar 2026)
- KPIs, alertas clickables, utilidad por linea, cobranza por linea

### Ventas POS - Mejoras (COMPLETADO - Mar 2026)
- Tabla con columnas: Fecha, Comp, N Comp, Cliente, Vendedor, Tienda, Empresa, Pagos, Cant, Total, Estado, Pagos Asoc
- Detalle modal: sin Codigo, Subtotal = price_subtotal_incl, layout compacto
- Timezone fix: UTC -> Lima (UTC-5)
- Sync mejorado: vendedor_id, vendedor_name, tienda_name, company_name, quantity_total
- Fix moneda_id en pagos (dinamico, no hardcoded)
- Auto-confirmacion solo cuando pago total >= amount_total

### Distribucion Analitica (COMPLETADO - Mar 2026)
- Auto-confirm via pagos ahora crea distribucion analitica de ingreso + cobro
- crear_distribucion_ingreso y crear_distribucion_cobro integrados en el flujo de pagos

### Reportes Simplificados (COMPLETADO - Mar 2026)
- 8 endpoints: ventas-pendientes, ingresos-por-linea, ingresos-por-marca, cobranzas-por-linea, pendiente-cobrar, gastos-por-categoria, gastos-por-centro-costo, utilidad-por-linea
- Pagina ReportesSimplificados.jsx con filtros de fecha y cards por reporte

### Bug P0 Fix - Tesoreria y Pagos (COMPLETADO - Mar 2026)
- Causa raiz: confirmar_venta_pos creaba movimiento de tesoreria pero NO cont_pago; add_pago_venta_pos (auto-confirm) creaba cont_pago pero NO movimiento de tesoreria
- Fix: Ambas rutas ahora crean AMBOS registros (cont_movimiento_tesoreria + cont_pago + cont_pago_detalle + cont_pago_aplicacion)
- Backfill de datos existentes para order 146662
- Testing: 100% pass (backend 14/14, frontend 8/8)

## Arquitectura
- Backend: FastAPI + PostgreSQL (schema finanzas2)
- Frontend: React + Shadcn UI
- Odoo: lectura via sync local, no queries directos

## Backlog / Tareas Pendientes

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea
- Gastos comunes pendientes de prorrateo (reporte formal)
- Utilidad por linea antes de prorrateo (reporte standalone)

### P2 - Modulos Futuros
- Proyectos
- Capital & ROI
- Valorizacion Inventario
- Presupuesto vs Real
