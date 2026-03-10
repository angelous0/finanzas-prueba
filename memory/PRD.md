# Finanzas 4.0 - PRD

## Problema Original
Sistema de gestion financiera empresarial full-stack (React + FastAPI + PostgreSQL) para empresas peruanas. Incluye: compras, facturas, pagos, letras, gastos, planillas, ventas POS, conciliacion bancaria, contabilidad, reportes y exportacion SUNAT.

## Arquitectura

### Backend (Refactored - Mar 2026)
```
/app/backend/
  server.py              # Orchestrator (~175 lines) - CORS, startup/shutdown, router includes
  dependencies.py        # Shared: get_empresa_id, get_next_correlativo, safe_date_param
  models.py              # Pydantic models
  database.py            # PostgreSQL pool + schema init
  contabilidad.py        # Accounting business logic
  odoo_service.py        # (DEPRECATED) Odoo POS integration - kept temporarily for backward compat
  routers/
    core.py              # health, root (2 endpoints)
    dashboard.py         # KPIs (1 endpoint)
    empresas.py          # CRUD empresas (4 endpoints)
    maestros.py          # monedas, categorias, centros_costo, lineas_negocio (15 endpoints)
    cuentas_financieras.py  # CRUD + kardex + recalcular (7 endpoints)
    terceros.py          # terceros + proveedores + clientes + empleados (10 endpoints)
    articulos.py         # articulos + inventario + modelos (5 endpoints)
    compras.py           # ordenes de compra + facturas proveedor (14 endpoints)
    pagos.py             # pagos + letras (8 endpoints)
    gastos.py            # gastos + adelantos (9 endpoints)
    planillas.py         # planillas (5 endpoints)
    ventas_pos.py        # ventas POS from odoo schema + pagos POS + config mapping (14 endpoints)
    cxc_cxp.py           # cuentas por cobrar/pagar (2 endpoints)
    presupuestos.py      # presupuestos (5 endpoints)
    banco.py             # conciliacion bancaria (9 endpoints)
    reportes.py          # reportes financieros (3 endpoints)
    contabilidad.py      # cuentas contables + config + asientos + periodos (20 endpoints)
    export.py            # export CompraAPP Excel (1 endpoint)
```

### Frontend
- React with Tailwind CSS + Shadcn/UI
- 31 sidebar navigation items
- All API calls via REACT_APP_BACKEND_URL

### Database
- PostgreSQL (asyncpg) at 72.60.241.216:9090/datos
- Schemas: finanzas2 (app data), odoo (pre-synced Odoo views)
- Key tables: cont_empresa, cont_factura_proveedor, cont_pago, cont_gasto, cont_venta_pos, cont_asiento, cont_empresa_odoo_map, cont_venta_pos_estado
- Key views (odoo schema): v_pos_order_enriched, v_pos_line_full

## What's Been Implemented
- [x] Full backend refactoring from monolithic 5760-line server.py to 18 domain routers (Mar 2026)
- [x] All 132+ API endpoints preserved and working
- [x] Frontend fully compatible with refactored backend
- [x] Testing: 100% pass rate (33 backend tests + 8 frontend page tests)
- [x] Shared dependencies module (get_empresa_id, get_next_correlativo, safe_date_param)
- [x] POS Data Source Change: Backend reads from odoo schema (v_pos_order_enriched, v_pos_line_full) (Mar 2026)
- [x] Company mapping table (cont_empresa_odoo_map) + GET/PUT /config/odoo-company-map endpoints
- [x] Local state table (cont_venta_pos_estado) for estado_local, notas per order
- [x] MISSING_ODOO_COMPANY_KEY error + frontend config screen
- [x] Mandatory pagination on GET /ventas-pos (page, page_size params, ordered by date_order DESC)
- [x] On-demand product line fetching: GET /ventas-pos/{order_id}/lineas
- [x] Frontend VentasPOS.jsx fully adapted to new paginated API
- [x] Sync buttons removed from frontend UI (backend sync endpoint kept read-only)
- [x] Testing: 100% pass rate (13 backend + all frontend tests for POS module)

- [x] Boton "Actualizar" en Ventas POS que re-ejecuta fetch con filtros actuales + campo max_date_order en respuesta API (Mar 2026)
- [x] POST /api/ventas-pos/refresh: proxy endpoint que dispara sync en modulo Odoo externo via POST {ODOO_MODULE_BASE_URL}/api/sync/pos (Mar 2026)

## Backlog
- P1: Delete /app/odoo_service.py after confirming all functionality stable
- P1: Formally remove POST /ventas-pos/sync endpoint after VentasPOS.jsx is stable in production
- P2: UI/endpoints for managing company mappings (/config/odoo-company-map management page)
- P2: Add OpenAPI tags to routers for better Swagger docs
- P3: Add unit tests per router module
- P3: Custom hook useFormSubmit in frontend
