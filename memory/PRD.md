# Finanzas 4.0 - PRD

## Problema Original
Sistema de gestion financiera empresarial full-stack (React + FastAPI + PostgreSQL) para empresas peruanas textiles/multimarca.

## Arquitectura
- Backend: FastAPI con routers modulares en /app/backend/routers/
- Frontend: React con Tailwind CSS + Shadcn/UI
- Database: PostgreSQL (asyncpg) schemas: finanzas2, odoo
- Odoo Integration: POST {ODOO_MODULE_BASE_URL}/api/sync/pos

## What's Been Implemented

### Backend Refactoring (Mar 2026)
- [x] Migrated from monolithic server.py to 20 domain routers

### POS Data Source (Mar 2026)
- [x] Reads from odoo schema (v_pos_order_enriched, v_pos_line_full)
- [x] Paginated GET /api/ventas-pos with max_date_order
- [x] On-demand GET /api/ventas-pos/{id}/lineas
- [x] MISSING_ODOO_COMPANY_KEY config screen
- [x] POST /api/ventas-pos/refresh triggers Odoo sync
- [x] Connected to real Odoo module at api.odoo.ambissionindustries.cloud

### Gastos (Mar 2026)
- [x] IGV Incluido toggle (same as Facturas)

### Cleanup (Mar 2026)
- [x] Deleted odoo_service.py, _list_from_legacy, POST /ventas-pos/sync, unused imports
- [x] Fixed timezone double conversion in formatDateTime

### Finanzas Gerenciales - Fase 1 Fundaciones (Mar 2026)
- [x] cont_marca table + seed 9 brands from Odoo (AMBISSION, BOOSH, ELEMENT DENIM, ELEMENT PREMIUM, EP Studio, PSICOSIS, QEPO, REDDOOR, SPACE)
- [x] cont_proyecto table (campanas, colecciones, producciones)
- [x] cont_cxc_abono table (abonos a cuentas por cobrar)
- [x] cont_cxp_abono table (abonos a cuentas por pagar)
- [x] Extended cont_venta_pos_estado: monto_cobrado, saldo_pendiente, estado_cobranza
- [x] Extended cont_cxc: tipo_origen, odoo_order_id, marca_id, proyecto_id, dias_atraso
- [x] Extended cont_cxp: tipo_origen, marca_id, proyecto_id, dias_vencido, categoria_id
- [x] Extended cont_gasto: marca_id, proyecto_id
- [x] Extended cont_pago: marca_id, proyecto_id
- [x] Extended cont_presupuesto_linea: marca_id, proyecto_id, tipo
- [x] CRUD endpoints: /api/marcas, /api/proyectos
- [x] Frontend pages: Marcas.jsx, Proyectos.jsx
- [x] Sidebar entries under CATALOGOS

## In Progress: Finanzas Gerenciales

### Fase 1 DONE
- [x] All foundational tables and migrations
- [x] CRUD Marcas, Proyectos

### Fase 2: Dashboard Financiero (P0)
- [x] Endpoint /api/dashboard-financiero with all KPIs
- [x] Dashboard screen: KPIs (Tesoreria, Devengado, Obligaciones), Filtros, Graficos, Tablas
- [x] Filtros: empresa, marca, linea, CC, proyecto, periodo
- [x] Ingresos por Marca (pie chart), CxC Aging (bar chart)
- [x] Top 5 CxC vencidas, Top 5 CxP por vencer
- [x] Ventas POS resumen por estado
- [x] Fixed: CxP enum 'pagado' vs 'pagada', tercero_nombre JOIN

### Fase 3: CxC + CxP Mejoradas (P0)
- [x] Rewrite CxC: aging buckets, abonos, KPIs, manual creation, expandable detail rows
- [x] Rewrite CxP: aging buckets, pagos parciales, KPIs, manual creation, expandable detail rows
- [x] Endpoints: /api/cxc/resumen, /api/cxp/resumen (aging totals)
- [x] Endpoints: POST /api/cxc, POST /api/cxp (manual creation)
- [x] Endpoints: GET/POST /api/cxc/{id}/abonos, /api/cxp/{id}/abonos
- [x] Abono validation: monto>0, monto<=saldo_pendiente
- [x] Auto-update estado on abono: parcial->cobrada/pagado

### Fase 4: Flujo de Caja Gerencial (P1)
- [x] Endpoint /api/flujo-caja-gerencial with grouping (diario/semanal/mensual)
- [x] Aggregation: ventas, cobranzas, gastos, pagos CxP
- [x] FlujoCaja.jsx rewritten: ComposedChart, detail table, KPIs

### Fase 5: Rentabilidad (P1)
- [x] Endpoint /api/rentabilidad by dimension (marca/linea/CC/proyecto)
- [x] Income from POS line-item detail per design rule
- [x] Rentabilidad.jsx: BarChart, KPIs, margen badges

### Fase 6: ROI + Presupuesto vs Real (P2)
- [x] Endpoint /api/presupuesto-vs-real (by category and month, with execution bars)
- [x] Endpoint /api/roi-proyectos (investment tracking by project)
- [x] PresupuestoVsReal.jsx: 4 KPIs, bar chart por mes, table con progress bars
- [x] RoiProyectos.jsx: 4 KPIs, horizontal bar chart, table con ROI % badges
- [x] Sidebar: 4 items in Finanzas Gerenciales section

### Fase 7: Reportes Gerenciales (P2)

## Key Design Rules
1. "El reconocimiento financiero se decide en la cabecera; la atribucion economica se calcula en el detalle"
2. Separar confirmada de cobrada: estado_local + estado_cobranza
3. CxC auto-create: credito OR saldo_pendiente > 0
4. Marca SIEMPRE desde detalle POS, NUNCA desde cabecera
5. Dashboard: Devengado (ingresos confirmados) vs Flujo Caja (cobranzas reales)
6. Rentabilidad preparada para: ingreso - costo_venta - gastos (inicialmente ingreso - gastos)
7. Jerarquia analitica: empresa > marca > linea_negocio > centro_costo > proyecto
