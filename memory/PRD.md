# Finanzas 4.0 - PRD (Product Requirements Document)

## Problema Original
Sistema ERP financiero integrado con Odoo para gestion contable, ventas POS, gastos, facturacion y reportes gerenciales. Arquitectura de 3 capas financieras.

## Arquitectura de 3+1 Capas
1. **Capa Comercial**: Ventas POS (sync Odoo -> tablas locales), gastos, facturas proveedor
2. **Capa Obligacion**: CxC/CxP auto-generadas, abonos
3. **Capa Tesoreria**: `cont_movimiento_tesoreria` - movimientos reales de caja/banco
4. **Capa Analitica**: `cont_distribucion_analitica` - distribucion por linea de negocio

## Stack Tecnico
- Backend: FastAPI, Python, PostgreSQL (schema finanzas2 + produccion read-only + odoo read-only)
- Frontend: React, Shadcn UI, Recharts

## Funcionalidades Implementadas
1. Dashboard + Dashboard Financiero
2. Ventas POS: sync Odoo -> tablas locales, detalle con nombre producto/marca/linea negocio
3. CxC/CxP con aging, abonos, auto-tesoreria
4. Gastos, Facturas proveedor (FIFO auto-fill), Ordenes de compra
5. Maestros: Marcas, Proyectos, Lineas de Negocio, Centros de Costo
6. Tesoreria, Flujo de Caja, Rentabilidad, Presupuesto vs Real, ROI
7. Valorizacion Inventario FIFO, Reportes Gerenciales
8. Desacoplamiento Odoo: tablas locales, mapping service, SIN CLASIFICAR
9. Distribucion analitica: 1 mov real tesoreria + N distribuciones por LN
10. Catalogo LN con dropdown de opciones Odoo (odoo.x_linea_negocio) + fallback manual

## Tablas Clave
- `cont_venta_pos` / `cont_venta_pos_linea`: Copia local POS con product_name, odoo_linea_negocio_id
- `cont_distribucion_analitica`: origen_tipo (venta_pos_ingreso/cobranza_cxc), linea_negocio_id, monto
- `cont_linea_negocio`: Catalogo oficial con odoo_linea_negocio_id/nombre

## Backlog
- Transferencias entre cuentas en tesoreria
- Calendario vencimientos CxC/CxP
- Conciliacion bancaria
- Dashboard salud mapeo (% mapeadas vs sin clasificar)
