# Finanzas 4.0 - PRD (Product Requirements Document)

## Problema Original
Sistema ERP financiero integrado con Odoo para la gestion contable, ventas POS, gastos, facturacion de proveedores y reportes gerenciales. El usuario (Senior ERP/Finance Architect) solicito una refactorizacion completa del modulo "Finanzas Gerenciales" para implementar una arquitectura financiera de 3 capas:

1. **Capa Comercial**: Que se vendio, compro o gasto (devengado)
2. **Capa de Obligacion**: Que esta pendiente de cobro (CxC) o pago (CxP)
3. **Capa de Caja Real / Tesoreria**: Que dinero realmente se movio (fuente unica de verdad)

## Arquitectura de 3 Capas (Implementada)

### Capa 1: Comercial
- Ventas POS desde Odoo (confirmadas, credito, descartadas)
- Gastos registrados
- Facturas de proveedores

### Capa 2: Obligaciones
- CxC generadas automaticamente al marcar venta como credito
- CxC generadas automaticamente si venta confirmada tiene saldo pendiente
- CxP generadas automaticamente al crear gastos sin pago
- Abonos CxC / CxP para liquidar obligaciones

### Capa 3: Tesoreria (Fuente Unica de Verdad)
- `cont_movimiento_tesoreria`: tabla central de todos los movimientos reales de caja
- Todo abono CxC → crea movimiento tesoreria (ingreso, origen: cobranza_cxc)
- Todo abono CxP → crea movimiento tesoreria (egreso, origen: pago_cxp)
- Venta confirmada al contado → crea movimiento tesoreria (ingreso, origen: venta_pos_confirmada)
- Gasto pagado → crea movimiento tesoreria (egreso, origen: gasto_directo)
- Movimientos manuales permitidos (transferencias, ajustes)

## Stack Tecnico
- **Backend:** FastAPI, Python, PostgreSQL (schema finanzas2)
- **Frontend:** React, Shadcn UI, Recharts
- **Integracion:** Odoo API (api.odoo.ambissionindustries.cloud)

## Funcionalidades Implementadas (Completas)
1. Dashboard principal + Dashboard Financiero con 3 capas
2. Ventas POS (sync Odoo, confirmar, credito, descartar, pagos)
3. CxC/CxP con aging, abonos, y auto-generacion tesoreria
4. Gastos con lineas, categorias, y auto-generacion CxP/tesoreria
5. Facturas proveedor
6. Ordenes de compra
7. Marcas, Proyectos, Lineas de Negocio, Centros de Costo
8. Asientos contables
9. Adelantos
10. Flujo de Caja (desde tesoreria)
11. Rentabilidad por marca
12. Presupuesto vs Real
13. ROI Proyectos
14. Reportes Gerenciales con resumen ejecutivo CFO
15. **NUEVA: Pagina Tesoreria** - Movimientos reales, KPIs, filtros, desglose por origen
16. Exportacion CSV (CxC, CxP, Flujo Caja, Rentabilidad, Gastos, Tesoreria)

## Jerarquia Dimensional
empresa > marca > linea_negocio > centro_costo > proyecto

## Backlog (P1/P2)
- Transferencias entre cuentas como movimiento de tesoreria
- Calendario de vencimientos CxC/CxP
- Alertas automaticas de vencimiento
- Conciliacion bancaria integrada con tesoreria
- Atribucion multi-marca desde lineas de detalle de venta
