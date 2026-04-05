# Finanzas 4.0 - PRD

## Problema
Sistema ERP gerencial para gestión financiera de empresa textil. PostgreSQL + FastAPI + React.

## Arquitectura
- Backend: FastAPI con asyncpg → PostgreSQL (schemas: finanzas2, produccion)
- Frontend: React con Shadcn/UI
- Sin autenticación (acceso directo)
- Multi-empresa (empresa_id=7 Ambission Industries)

## Módulos Implementados

### Reportes Financieros (7 tabs)
1. Balance General (point-in-time con fecha_corte)
2. Estado de Resultados (ventas, costos, margen, gastos)
3. Flujo de Caja (ingresos/egresos reales)
4. Inventario Valorizado (MP, PT, WIP)
5. **Rentabilidad por Línea de Negocio** (ventas/costos/margen por LN) - 2026-04-05
6. **CxP Aging** (antigüedad cuentas por pagar, 5 buckets, por proveedor) - 2026-04-05
7. **CxC Aging** (antigüedad cuentas por cobrar, 5 buckets) - 2026-04-05

### Conciliación Bancaria
- Auto-matching 1:1 (referencia exacta + monto+fecha)
- **Auto-matching N:1 y 1:N** (múltiples movimientos combinados) - 2026-04-05
- UI side-by-side con sugerencias grupales
- Confirmar sugerencias en lote

### Órdenes de Compra
- **Dropdown artículos enriquecido** (Stock | Línea Negocio | Último Precio) - 2026-04-05
- Auto-poblado de unidad, precio unitario, código, descripción

### Facturas Proveedor
- **Auto-llenado linea_negocio_id desde artículo** - 2026-04-05
- CRUD completo con líneas de artículos y servicios
- Vinculación con ingresos de inventario
- Canje de letras

### Otros Módulos
- Dashboard con KPIs
- Ventas POS (sync con Odoo)
- Gastos con categorías por línea
- Unidades Internas de Producción (corte, confección)
- Valorización Inventario (optimizada, batch queries)
- Líneas de Negocio (universales, modal vínculos FK)
- Tesorería, Cuentas Bancarias, CxP, CxC, Letras

## Endpoints Clave (nuevos esta sesión)
- GET /api/reportes/rentabilidad-linea
- GET /api/reportes/cxp-aging
- GET /api/reportes/cxc-aging
- GET /api/conciliacion/sugerencias (actualizado N:M)
- POST /api/conciliacion/confirmar-sugerencias (actualizado arrays)
- GET /api/articulos-oc (nuevo, enriquecido)

## Testing
- Iteration 41: Artículos OC (20/20 passed)
- Iteration 42: Conciliación N:M + LN autofill (26/26 passed)
- Iteration 43: 3 Reportes nuevos (30/30 passed)

## Backlog

### P2 - Pendiente
- Split archivos grandes (compras.py 826 líneas, OrdenesCompra.jsx 1275 líneas)
- Auditar módulo PagarFacturas
- Presupuesto vs Real
- Proyectos, Capital & ROI
