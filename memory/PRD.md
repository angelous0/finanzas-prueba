# Finanzas 4.0 - PRD (Product Requirements Document)

## Problema Original
Sistema ERP financiero integrado con Odoo para gestion contable, ventas POS, gastos, facturacion y reportes gerenciales. Arquitectura de 3 capas financieras.

## Arquitectura de 3 Capas (Implementada)
1. **Capa Comercial**: Ventas POS (sync Odoo -> tablas locales), gastos, facturas proveedor
2. **Capa Obligacion**: CxC/CxP auto-generadas, abonos
3. **Capa Tesoreria**: `cont_movimiento_tesoreria` - fuente unica de verdad para movimientos reales
4. **Capa Analitica**: `cont_distribucion_analitica` - distribucion por linea de negocio (ingreso y cobro)

## Stack Tecnico
- Backend: FastAPI, Python, PostgreSQL (schema finanzas2 + produccion read-only)
- Frontend: React, Shadcn UI, Recharts
- Integracion: Odoo API (solo para sync, extractor escribe a tablas locales)

## Funcionalidades Implementadas
1. Dashboard + Dashboard Financiero (3 capas)
2. Ventas POS con sync Odoo -> tablas locales (cont_venta_pos + cont_venta_pos_linea)
3. CxC/CxP con aging, abonos, auto-tesoreria
4. Gastos con lineas, auto-CxP, auto-tesoreria
5. Facturas proveedor con articulos (FIFO cost auto-fill)
6. Ordenes de compra, Marcas, Proyectos, Lineas de Negocio, Centros de Costo
7. Tesoreria (movimientos reales, KPIs, filtros)
8. Flujo de Caja, Rentabilidad por marca, Presupuesto vs Real, ROI Proyectos
9. Valorizacion Inventario FIFO
10. Reportes Gerenciales + CFO Summary + CSV export
11. **Desacoplamiento Odoo en Finanzas** (completo):
    - `cont_linea_negocio` catalogo oficial con `odoo_linea_negocio_id` y `odoo_linea_negocio_nombre`
    - Mapping service: `odoo_linea_negocio_id` -> `cont_linea_negocio.id`
    - Fallback "SIN CLASIFICAR" para lineas sin mapeo
    - Reportes financieros leen de tablas locales (cero lecturas a esquema Odoo)
12. **Reorganizacion Linea de Negocio** (2026-03-12):
    - Sync Odoo -> local incluye product_name desde product_template y linea_negocio_id
    - Detalle POS: Producto (nombre) | Codigo | Cant | P.Unit | Subtotal | Marca | Linea de Negocio
    - Resumen por Linea de Negocio (prioritario, caja verde) + Resumen por Marca (secundario)
    - Catalogo Lineas de Negocio con campos Odoo + indicador mapeada/sin mapear
    - Al confirmar venta: 1 movimiento real de tesoreria + N distribuciones analiticas por LN
    - Ventas credito: CxC total + distribuciones analiticas (sin tesoreria)
    - Cobranzas parciales: 1 movimiento real de tesoreria + distribucion analitica prorrateada
    - Endpoint GET /api/ventas-pos/{id}/distribucion-analitica (vendido/cobrado/pendiente por LN)
    - Endpoint POST /api/ventas-pos/sync-local (sync desde esquema Odoo a tablas locales)
    - Listado POS desde tablas locales (cont_venta_pos + cont_venta_pos_estado)

## Jerarquia Dimensional
empresa > marca > linea_negocio > centro_costo > proyecto

## Tablas Clave
- `cont_venta_pos`: Copia local de ordenes POS (desacoplado de Odoo views)
- `cont_venta_pos_linea`: Copia local de lineas POS con product_name y odoo_linea_negocio_id
- `cont_venta_pos_estado`: Estado local (pendiente/confirmada/credito/descartada)
- `cont_distribucion_analitica`: Distribucion por linea de negocio (venta_pos_ingreso / cobranza_cxc)
- `cont_movimiento_tesoreria`: Movimientos reales de caja/banco
- `cont_linea_negocio`: Catalogo oficial con mapeo Odoo

## Backlog
- Transferencias entre cuentas como movimiento de tesoreria
- Calendario de vencimientos CxC/CxP
- Alertas automaticas de vencimiento
- Conciliacion bancaria
- Atribucion multi-marca desde lineas de detalle de venta
