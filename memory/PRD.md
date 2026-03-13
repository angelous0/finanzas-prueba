# Finanzas 4.0 - PRD (Simplificacion)

## Problema Original
Simplificar el modulo de Finanzas Gerenciales para enfocarse en operaciones financieras core:
Ventas POS, Gastos, CxC, CxP, Tesoreria y dimensiones analiticas clave.

## Principios Clave
1. **1 movimiento real de tesoreria por cobro** + N distribuciones analiticas
2. **Distribucion automatica por linea de negocio** desde detalle POS (nunca manual)
3. **Gastos**: directo / comun / no_asignado con prorrateo de comunes
4. **Dimensiones**: Linea de Negocio (eje principal), Marca, Centro de Costo, Categoria de Gasto

## Modulos CORE Activos (20 items en Sidebar)
| Seccion | Items |
|---------|-------|
| Principal | Dashboard |
| Ventas | Ventas POS, CxC |
| Egresos | Gastos, Prorrateo, Factura Proveedor, CxP |
| Tesoreria | Tesoreria, Cuentas Bancarias, Movimientos/Pagos, Flujo de Caja |
| Reportes | Reportes Simplificados, Valorizacion Inventario |
| Catalogos | Lineas de Negocio, Marcas, Centros de Costo, Categorias Gasto, Proveedores, Clientes, Empresas |

## Modulos Pausados/Legacy
- Proyectos, Capital & ROI, Valorizacion Inventario, Presupuesto vs Real
- Contabilidad completa (Asientos, Balance, EERR, Cuentas, Config)
- Planilla (Empleados, Adelantos, Planilla)

## Modulos REVISAR (pendiente decision usuario)
- Ordenes de Compra, Letras, PagarFacturas, Conciliacion Bancaria

## Lo Implementado

### Fase 0 - Desacoplamiento Odoo (COMPLETADO)
### Fase 1-2 - Simplificacion Backend+Frontend (COMPLETADO)
### Dashboard + Ventas POS + Reportes (COMPLETADO)
### Bug Fixes Criticos (COMPLETADO)
- P0 Tesoreria/Pagos invisibles → ambas rutas crean cont_movimiento_tesoreria + cont_pago
- Error al marcar Credito → venta_pos_id usa id interno
- Abono CxC no visible → cont_pago creado en abono
- Campos Odoo faltantes → tipo_comp, num_comp, x_pagos, company_name sincronizados
- Cantidad faltante → quantity_total calculada desde lineas

### Fase 1 Cleanup (COMPLETADO - Mar 2026)
- 19 rutas legacy eliminadas de App.js
- ~50 funciones muertas eliminadas de api.js
- PlaceholderPages limpiado (solo Clientes)
- Sidebar simplificado: 6 secciones, 20 items, sin duplicados
- Valorizacion Inventario agregada al Sidebar
- Dashboard Financiero y Reportes Gerenciales removidos de navegacion

## Arquitectura
- Backend: FastAPI + PostgreSQL (schema finanzas2)
- Frontend: React + Shadcn UI
- Odoo: lectura via sync local

## Backlog

### P0 - Fase 2 Cleanup (Backend)
- Desregistrar 8 routers legacy de server.py
- Decidir sobre modulos REVISAR (OC, Letras, Conciliacion)

### P1 - Fase 3 Refactoring
- Split ventas_pos.py (1190 lineas)
- Split FacturasProveedor.jsx (2575 lineas)
- Mover archivos legacy a carpetas /legacy/

### P1 - Reportes Faltantes
- Ventas por cruce linea x marca
- Gastos directos por linea
- Gastos comunes pendientes de prorrateo
- Utilidad por linea standalone

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
