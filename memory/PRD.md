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

### Fase 1-2 - Simplificacion Backend+Frontend (COMPLETADO - Mar 2026)
- CRUD categorias de gasto, prorrateo, gastos actualizado
- Sidebar simplificado, CategoriasGasto, ProrrateoGastos, Gastos

### Dashboard + Ventas POS + Reportes (COMPLETADO - Mar 2026)
- Dashboard ejecutivo con KPIs
- Ventas POS mejorado (columnas, timezone, sync, moneda)
- 8 reportes simplificados

### Bug Fixes Sesion Actual (COMPLETADO - Mar 2026)

**P0 - Tesoreria/Pagos invisibles tras confirmar venta:**
- confirmar_venta_pos ahora crea AMBOS: cont_movimiento_tesoreria + cont_pago
- add_pago_venta_pos (auto-confirm) ahora crea AMBOS: cont_movimiento_tesoreria + cont_pago

**Error al marcar Credito:**
- cont_cxc.venta_pos_id ahora usa id interno de cont_venta_pos, no odoo_order_id

**Abono CxC no visible en Movimientos/Pagos:**
- create_cxc_abono ahora crea cont_pago ademas de cont_movimiento_tesoreria
- Flujo completo: abono -> tesoreria + pago + distribucion analitica

## Arquitectura
- Backend: FastAPI + PostgreSQL (schema finanzas2)
- Frontend: React + Shadcn UI
- Odoo: lectura via sync local

## Backlog

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea
- Gastos comunes pendientes de prorrateo
- Utilidad por linea standalone

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Valorizacion Inventario, Presupuesto vs Real
