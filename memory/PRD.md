# Finanzas 4.0 - PRD

## Problema Original
Simplificar el modulo de Finanzas Gerenciales para enfocarse en operaciones financieras core.

## Principios Clave
1. 1 movimiento real de tesoreria por cobro + N distribuciones analiticas
2. Distribucion automatica por linea de negocio desde detalle POS
3. Gastos: directo / comun / no_asignado con prorrateo de comunes
4. Dimensiones: Linea de Negocio, Marca, Centro de Costo, Categoria de Gasto

## Modulos CORE Activos (24 items en Sidebar)
| Seccion | Items |
|---------|-------|
| Principal | Dashboard |
| Ventas | Ventas POS, CxC |
| Egresos | Gastos, Prorrateo, Factura Proveedor, OC, CxP, Letras |
| Tesoreria | Tesoreria, Cuentas Bancarias, Movimientos/Pagos, Flujo de Caja, Conciliacion Bancaria, Historial Conciliaciones |
| Reportes | Reportes Financieros, Reportes, Rentabilidad x Linea, Libro Analitico, Valorizacion Inventario |
| Produccion Interna | Unidades Internas, Cargos Internos, Gastos Unidad, Reporte Gerencial |
| Catalogos | Lineas Negocio, Marcas, Centros Costo, Categorias, Proveedores, Clientes, Empresas |

## Auto-Matching Conciliacion Bancaria - COMPLETADO (2026-03-19)
- Backend: GET /api/conciliacion/sugerencias + POST /api/conciliacion/confirmar-sugerencias
- Reglas: Referencia Exacta (alta) y Monto+Fecha ±3 dias (media)
- Frontend: Banner, lista de pares, highlight verde, boton confirmar
- Testing: 14/14 backend + 9/9 frontend

## Unidades Internas de Produccion - COMPLETADO (2026-03-20)
### Descripcion
Modulo gerencial para tratar servicios internos de produccion como unidades de negocio. Mide si conviene seguir haciendo un proceso interno o tercerizar.

### Tablas nuevas (finanzas2)
- `fin_unidad_interna` - Catalogo de unidades (Corte, Costura, Acabado)
- `fin_cargo_interno` - Cargos auto-generados desde movimientos de produccion (UNIQUE movimiento_id)
- `fin_gasto_unidad_interna` - Gastos reales por unidad (registro_id y movimiento_id opcionales)

### Cambios a tablas existentes
- `produccion.prod_personas_produccion`: Agregado `tipo_persona` (INTERNO/EXTERNO) y `unidad_interna_id`

### Backend: /app/backend/routers/unidades_internas.py
- CRUD unidades internas
- GET/PUT personas produccion (tipo persona)
- GET cargos internos + POST generar (desde produccion)
- CRUD gastos unidad interna
- GET reporte gerencial (vista_empresa + vista_unidades + resumen)

### Frontend: 4 paginas nuevas
- `/unidades-internas` - CRUD unidades + tab personas INTERNO/EXTERNO
- `/cargos-internos` - Vista cargos generados + boton "Generar Cargos"
- `/gastos-unidad-interna` - Registro gastos reales por unidad
- `/reporte-unidades-internas` - Reporte gerencial con 2 vistas

### Logica
- Persona INTERNA genera cargo = ingreso para la unidad + costo para empresa
- Gastos reales se cargan a la unidad
- Resultado = Ingresos Internos - Gastos Reales
- Vista Empresa: solo costo consolidado, sin detalle de gastos
- Vista Unidad: P&L detallado con costo promedio

### Testing: 29/29 backend + 8/8 frontend = ALL PASSED

## Backlog

### P1 - Conciliacion N:1 y 1:N
- Permitir vincular multiples movimientos del sistema a uno del banco y viceversa

### P1 - Agregar Linea de Negocio a Factura Proveedor
- Campo linea_negocio_id en cont_factura_proveedor_linea

### P1 - Split archivos grandes
- Gastos.jsx, VentasPOS.jsx, compras.py, gastos.py

### P2 - Reportes Faltantes
- Completar reportes simplificados restantes

### P2 - Modulos Futuros
- Proyectos, Capital & ROI, Presupuesto vs Real
