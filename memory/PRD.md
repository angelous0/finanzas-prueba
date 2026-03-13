# Finanzas 4.0 - PRD (Simplificación)

## Problema Original
Simplificar el módulo de Finanzas Gerenciales para enfocarse en operaciones financieras core:
Ventas POS, Gastos, CxC, CxP, Tesorería y dimensiones analíticas clave.

## Principios Clave
1. **1 movimiento real de tesorería por cobro** + N distribuciones analíticas
2. **Distribución automática por línea de negocio** desde detalle POS (nunca manual)
3. **Gastos**: directo / común / no_asignado con prorrateo de comunes
4. **Dimensiones**: Línea de Negocio (eje principal), Marca, Centro de Costo, Categoría de Gasto

## Módulos Activos
- Dashboard Ejecutivo / Dashboard Financiero
- Ventas POS + CxC
- Gastos + Prorrateo + Factura Proveedor + CxP
- Tesorería + Cuentas Bancarias + Movimientos + Flujo de Caja
- Reportes Gerenciales + Reportes Simplificados
- Catálogos: Líneas de Negocio, Marcas, Centros de Costo, Categorías Gasto, Proveedores, Clientes, Empresas

## Módulos Pausados
- Proyectos, Capital & ROI, Valorización Inventario, Presupuesto vs Real, Contabilidad compleja

## Lo Implementado

### Fase 0 - Desacoplamiento Odoo (COMPLETADO - Feb 2026)
- Refactorización completa de endpoints financieros para leer tablas locales
- Sincronización local de datos Odoo
- Tabla cont_distribucion_analitica para separar tesorería de analítica

### Fase 1 - Backend Simplificación (COMPLETADO - Mar 2026)
- CRUD categorías de gasto
- Gastos con campos: categoria_gasto_id, tipo_asignacion, centro_costo_id, marca_id, linea_negocio_id
- Prorrateo: pendientes, preview (3 métodos), ejecutar, historial

### Fase 2 - Frontend Simplificación (COMPLETADO - Mar 2026)
- Sidebar simplificado, CategoriasGasto.jsx, ProrrateoGastos.jsx, Gastos.jsx actualizado

### Dashboard Ejecutivo (COMPLETADO - Mar 2026)
- KPIs, alertas clickables, utilidad por línea, cobranza por línea

### Ventas POS - Mejoras (COMPLETADO - Mar 2026)
- Tabla con columnas: Fecha, Comp, N°Comp, Cliente, Vendedor, Tienda, Empresa, Pagos, Cant, Total, Estado, Pagos Asoc
- Detalle modal: sin Código, Subtotal = price_subtotal_incl, layout compacto
- Timezone fix: UTC -> Lima (UTC-5)
- Sync mejorado: vendedor_id, vendedor_name, tienda_name, company_name, quantity_total
- Fix moneda_id en pagos (dinámico, no hardcoded)
- Auto-confirmación solo cuando pago total >= amount_total

### Distribución Analítica (COMPLETADO - Mar 2026)
- Auto-confirm via pagos ahora crea distribución analítica de ingreso + cobro
- crear_distribucion_ingreso y crear_distribucion_cobro integrados en el flujo de pagos

### Reportes Simplificados (COMPLETADO - Mar 2026)
- 8 endpoints: ventas-pendientes, ingresos-por-linea, ingresos-por-marca, cobranzas-por-linea, pendiente-cobrar, gastos-por-categoria, gastos-por-centro-costo, utilidad-por-linea
- Página ReportesSimplificados.jsx con filtros de fecha y cards por reporte

## Arquitectura
- Backend: FastAPI + PostgreSQL (schema finanzas2)
- Frontend: React + Shadcn UI
- Odoo: lectura vía sync local, no queries directos
