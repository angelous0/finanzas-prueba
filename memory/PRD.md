# Finanzas 4.0 - PRD

## Problema
Sistema ERP gerencial para gestión financiera de empresa textil. PostgreSQL + FastAPI + React.

## Arquitectura
- Backend: FastAPI con asyncpg → PostgreSQL (schemas: finanzas2, produccion)
- Frontend: React con Shadcn/UI + Recharts
- Sin autenticación (acceso directo)
- Multi-empresa (empresa_id=7 Ambission Industries)

## Módulos Implementados

### Reportes Financieros — HUB CONSOLIDADO (7 tabs)
1. Balance General (point-in-time con fecha_corte)
2. Estado de Resultados (ventas, costos, margen, gastos)
3. **Flujo de Caja** (gráfico ComposedChart bars+line, agrupación diario/semanal/mensual, tabla detalle)
4. Inventario Valorizado (MP, PT, WIP)
5. **Rentabilidad x Línea** (5 sub-tabs: Dinero, Ventas, Cobranza, Línea x Marca, Gastos por Línea)
6. CxP Aging (antigüedad 5 buckets, resumen proveedor, barra visual)
7. CxC Aging (antigüedad 5 buckets)
- Excel export en Flujo, Rentabilidad, CxP Aging, CxC Aging

### Conciliación Bancaria
- Auto-matching 1:1 (referencia exacta + monto+fecha)
- Auto-matching N:1 y 1:N (múltiples movimientos combinados)
- UI side-by-side con sugerencias grupales
- Confirmar sugerencias en lote

### Órdenes de Compra
- Dropdown artículos enriquecido (Stock | Línea Negocio | Último Precio)
- Auto-poblado de unidad, precio unitario, código, descripción

### Facturas Proveedor
- Auto-llenado linea_negocio_id desde artículo
- CRUD completo con líneas de artículos y servicios
- Vinculación con ingresos de inventario, Canje de letras

### Otros Módulos
- Dashboard con KPIs
- Ventas POS (sync con Odoo)
- Gastos con categorías por línea
- Unidades Internas de Producción (corte, confección)
- Valorización Inventario (optimizada, batch queries)
- Líneas de Negocio (universales, modal vínculos FK)
- Tesorería, Cuentas Bancarias, CxP, CxC, Letras

## Limpieza Realizada (2026-04-10)
- Eliminadas 3 páginas standalone duplicadas (FlujoCaja, ReportesSimplificados, RentabilidadLinea)
- Eliminada carpeta legacy/ (20 archivos muertos)
- Sidebar limpiado (3 entradas duplicadas removidas)
- Reportes consolidados en hub único: /reportes-financieros

## Testing
- Iteration 41: Artículos OC (20/20 passed)
- Iteration 42: Conciliación N:M + LN autofill (26/26 passed)
- Iteration 43: 3 Reportes nuevos (30/30 passed)
- Iteration 44: Consolidación reportes (30/30 passed)

## Backlog
- P2: Split archivos grandes (compras.py, OrdenesCompra.jsx, ConciliacionBancaria.jsx)
- P2: Auditar módulo PagarFacturas
- P3: Presupuesto vs Real
- P3: Proyectos, Capital & ROI
