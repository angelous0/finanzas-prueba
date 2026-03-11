# Finanzas 4.0 - PRD (Product Requirements Document)

## Problema Original
Sistema ERP financiero integrado con Odoo para gestion contable, ventas POS, gastos, facturacion y reportes gerenciales. Arquitectura de 3 capas financieras.

## Arquitectura de 3 Capas (Implementada)
1. **Capa Comercial**: Ventas POS (Odoo), gastos, facturas proveedor
2. **Capa Obligacion**: CxC/CxP auto-generadas, abonos
3. **Capa Tesoreria**: `cont_movimiento_tesoreria` - fuente unica de verdad

## Stack Tecnico
- Backend: FastAPI, Python, PostgreSQL (schema finanzas2 + produccion read-only)
- Frontend: React, Shadcn UI, Recharts
- Integracion: Odoo API

## Funcionalidades Implementadas
1. Dashboard + Dashboard Financiero (3 capas)
2. Ventas POS (sync Odoo, confirmar/credito/descartar, auto-CxC, auto-tesoreria)
3. CxC/CxP con aging, abonos, auto-tesoreria
4. Gastos con lineas, auto-CxP, auto-tesoreria
5. Facturas proveedor con articulos (FIFO cost auto-fill)
6. Ordenes de compra
7. Marcas, Proyectos, Lineas de Negocio, Centros de Costo
8. Asientos contables, Adelantos
9. Tesoreria (movimientos reales, KPIs, filtros)
10. Flujo de Caja (desde tesoreria)
11. Rentabilidad por marca
12. Presupuesto vs Real, ROI Proyectos
13. **Rentabilidad por Linea de Negocio** (capital, ROI, payback, 2 vistas)
14. **Valorizacion Inventario FIFO** (desde produccion, lotes expandibles)
15. Reportes Gerenciales + CFO Summary + CSV export (inc. tesoreria)

## Modulos Nuevos (2026-03-11)

### Rentabilidad por Linea de Negocio
- Tabla `cont_capital_linea_negocio`: capital_inicial, aportes, retiros
- Vista 1 - Rendimiento Economico: ingresos, costos, gastos, utilidad, ROI
- Vista 2 - Recuperacion de Caja: cobrado, pagado, flujo neto, saldo por recuperar, payback

### Valorizacion Inventario FIFO
- Lee de `produccion.prod_inventario` + `prod_inventario_ingresos`
- Calcula costo FIFO unitario por lotes disponibles
- Tabla expandible con detalle de lotes
- FIFO cost auto-fill en facturas proveedor

## Jerarquia Dimensional
empresa > marca > linea_negocio > centro_costo > proyecto

## Backlog
- Transferencias entre cuentas como movimiento de tesoreria
- Calendario de vencimientos CxC/CxP
- Alertas automaticas de vencimiento
- Conciliacion bancaria
- Atribucion multi-marca desde lineas de detalle de venta
