# Finanzas 4.0 - PRD (Product Requirements Document)

## Problema Original
Sistema ERP financiero integrado con Odoo para gestion contable, ventas POS, gastos, facturacion y reportes gerenciales. Arquitectura de 3 capas financieras.

## Arquitectura de 3 Capas (Implementada)
1. **Capa Comercial**: Ventas POS (Odoo sync), gastos, facturas proveedor
2. **Capa Obligacion**: CxC/CxP auto-generadas, abonos
3. **Capa Tesoreria**: `cont_movimiento_tesoreria` - fuente unica de verdad

## Stack Tecnico
- Backend: FastAPI, Python, PostgreSQL (schema finanzas2 + produccion read-only)
- Frontend: React, Shadcn UI, Recharts
- Integracion: Odoo API (solo para sync de ventas POS, NO en modulos financieros)

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
13. Rentabilidad por Linea de Negocio (capital, ROI, payback, 2 vistas)
14. Valorizacion Inventario FIFO (desde produccion, lotes expandibles)
15. Reportes Gerenciales + CFO Summary + CSV export (inc. tesoreria)
16. **Desacoplamiento Odoo en Finanzas** (2026-03-12):
    - `cont_linea_negocio` como catalogo oficial con `odoo_linea_negocio_id` y `odoo_linea_negocio_nombre`
    - Mapping service: `odoo_linea_negocio_id` -> `cont_linea_negocio.id`
    - Fallback "SIN CLASIFICAR" para lineas sin mapeo
    - Reportes financieros leen de tablas locales (no de Odoo views)
    - `cont_venta_pos_linea` con columnas `odoo_linea_negocio_id`/`odoo_linea_negocio_nombre`
17. **Prorrateo de cobranzas parciales CxC** (2026-03-12):
    - Abonos en CxC vinculadas a ventas POS se prorratean por linea de negocio
    - Proporcion basada en `price_subtotal` de las lineas de la venta original
    - Multiples movimientos de tesoreria si la venta tiene multiples lineas de negocio

## Jerarquia Dimensional
empresa > marca > linea_negocio > centro_costo > proyecto

## Archivos Clave Desacoplamiento
- `backend/services/linea_mapping.py`: get_linea_negocio_map, resolve_linea, auto_register_lineas_from_odoo
- `backend/routers/cxc_cxp.py`: create_cxc_abono con prorrateo
- `backend/routers/dashboard_financiero.py`: Lee de cont_venta_pos + cont_venta_pos_linea
- `backend/routers/finanzas_gerencial.py`: Rentabilidad desde tablas locales
- `backend/routers/reportes_gerenciales.py`: Exportes y resumen desde tablas locales

## Backlog
- Transferencias entre cuentas como movimiento de tesoreria
- Calendario de vencimientos CxC/CxP
- Alertas automaticas de vencimiento
- Conciliacion bancaria
- Atribucion multi-marca desde lineas de detalle de venta
