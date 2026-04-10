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
3. Flujo de Caja (gráfico ComposedChart, agrupación diario/semanal/mensual, tabla detalle)
4. Inventario Valorizado (MP, PT, WIP)
5. Rentabilidad x Línea (5 sub-tabs: Dinero, Ventas, Cobranza, Línea x Marca, Gastos)
6. CxP Aging (antigüedad 5 buckets, resumen proveedor, barra visual)
7. CxC Aging (antigüedad 5 buckets)
- Excel export en Flujo, Rentabilidad, CxP Aging, CxC Aging

### Conciliación Bancaria
- Auto-matching 1:1, N:1, 1:N
- UI side-by-side con sugerencias grupales

### Órdenes de Compra
- Dropdown artículos enriquecido (Stock | Línea Negocio | Último Precio)

### Facturas Proveedor
- Auto-llenado linea_negocio_id desde artículo
- **UI limpia**: Tabla con 3 acciones visibles + menú "..." para acciones secundarias
- **Toolbar en modal Ver/Editar**: PDF, Registrar Pago, Vincular Ingresos, Ver Pagos, Canjear/Ver Letras
- PDF con fondo blanco (fix dark mode)

### Otros Módulos
- Dashboard, Ventas POS, Gastos, Unidades Internas, Valorización Inventario
- Líneas de Negocio, Tesorería, CxP, CxC, Letras

## Auditoría PagarFacturas
- Veredicto: NO es duplicado. Sirve flujo "tesorería batch" distinto a PagoModal
- Decisión: MANTENER como está

## Limpieza Realizada
- Eliminadas 3 páginas standalone duplicadas (FlujoCaja, ReportesSimplificados, RentabilidadLinea)
- Eliminada carpeta legacy/ (20 archivos muertos)
- Sidebar limpiado (3 entradas duplicadas removidas)

## Testing
- Iteration 41: Artículos OC (20/20)
- Iteration 42: Conciliación N:M + LN autofill (26/26)
- Iteration 43: 3 Reportes nuevos (30/30)
- Iteration 44: Consolidación reportes (30/30)
- Iteration 45: Facturas UI cleanup (18/18)

## Backlog
- P2: Split archivos grandes (compras.py, OrdenesCompra.jsx)
- P3: Presupuesto vs Real
- P3: Proyectos, Capital & ROI
