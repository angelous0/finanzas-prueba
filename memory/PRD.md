# Finanzas 4.0 - PRD (Simplificación)

## Problema Original
Simplificar el módulo de Finanzas Gerenciales para enfocarse en operaciones financieras core:
Ventas POS, Gastos, CxC, CxP, Tesorería y dimensiones analíticas clave.

## Principios Clave
1. **1 movimiento real de tesorería por cobro** + N distribuciones analíticas
2. **Distribución automática por línea de negocio** desde detalle POS (nunca manual)
3. **Gastos**: directo / común / no_asignado con prorrateo de comunes
4. **Dimensiones**: Línea de Negocio (eje principal), Marca, Centro de Costo, Categoría de Gasto

## Módulos Activos
- Dashboard Ejecutivo / Dashboard Financiero
- Ventas POS + CxC
- Gastos + Prorrateo + Factura Proveedor + CxP
- Tesorería + Cuentas Bancarias + Movimientos + Flujo de Caja
- Reportes Gerenciales
- Catálogos: Líneas de Negocio, Marcas, Centros de Costo, Categorías Gasto, Proveedores, Clientes, Empresas

## Módulos Pausados
- Proyectos, Capital & ROI, Valorización Inventario, Presupuesto vs Real, Contabilidad compleja

## Lo Implementado

### Fase 0 - Desacoplamiento Odoo (COMPLETADO - Feb 2026)
- Refactorización completa de endpoints financieros para leer tablas locales
- Sincronización local de datos Odoo (POST /api/ventas-pos/sync-local)
- Tabla cont_distribucion_analitica para separar tesorería de analítica

### Fase 1 - Backend Simplificación (COMPLETADO - Mar 2026)
- CRUD categorías de gasto (cont_categoria_gasto)
- Gastos con campos: categoria_gasto_id, tipo_asignacion, centro_costo_id, marca_id, linea_negocio_id
- Endpoints gastos devuelven nombres enriquecidos (JOINs)
- Prorrateo: pendientes, preview (3 métodos), ejecutar, historial
- Filtro prorrateo: solo tipo_asignacion='comun' o (no_asignado + linea_negocio_id IS NULL)

### Fase 2 - Frontend Simplificación (COMPLETADO - Mar 2026)
- Sidebar simplificado: 6 secciones (Principal, Ventas, Egresos, Tesorería, Reportes, Catálogos)
- Gastos.jsx actualizado con nuevos campos y tabla mejorada
- CategoriasGasto.jsx: CRUD completo inline
- ProrrateoGastos.jsx: tabs Pendientes/Historial, modal con 3 métodos de prorrateo

### Dashboard Ejecutivo (COMPLETADO - Mar 2026)
- Endpoint GET /api/dashboard/resumen-ejecutivo con todos los KPIs
- 3 alertas clickables: ventas pendientes, gastos sin prorratear, cobranza pendiente
- 4 KPI cards: Ingresos del Mes, Gastos del Mes, Resultado Neto, Cobranza Pendiente
- Tabla Utilidad por Línea: ingresos, gastos directos, utilidad antes/después prorrateo
- Cobranza Pendiente por Línea

## Próximas Tareas

### P2 - Reportes Simplificados (PENDIENTE)
1. Ventas pendientes por revisar
2. Ingresos confirmados por línea de negocio
3. Ingresos confirmados por marca
4. Cobranzas por línea
5. Pendiente por cobrar por línea
6. Gastos por categoría
7. Gastos por centro de costo
8. Utilidad por línea antes de prorrateo
9. Utilidad por línea después de prorrateo

## Esquema BD Clave
- **cont_gasto**: empresa_id, fecha, tipo_asignacion, categoria_gasto_id, centro_costo_id, marca_id, linea_negocio_id
- **cont_categoria_gasto**: id, codigo, nombre, descripcion, activo, empresa_id
- **cont_prorrateo_gasto**: id, gasto_id, linea_negocio_id, monto, porcentaje, metodo
- **cont_distribucion_analitica**: distribución analítica de ventas/cobros
- **cont_linea_negocio**: catálogo con mapeo odoo_linea_negocio_id
- **cont_venta_pos**: ventas POS sincronizadas con estado_local
- **cont_cxc**: cuentas por cobrar con saldo_pendiente

## Arquitectura
- Backend: FastAPI + PostgreSQL (schema finanzas2)
- Frontend: React + Shadcn UI
- Odoo: lectura vía sync local, no queries directos
