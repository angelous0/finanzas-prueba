# FINANZAS GERENCIALES - Documento de Diseno

## 1. DIAGNOSTICO: QUE EXISTE Y QUE FALTA

### YA EXISTE (reusar)
| Concepto | Tabla | Estado |
|----------|-------|--------|
| Empresas legales | `cont_empresa` | OK |
| Lineas de negocio | `cont_linea_negocio` | OK, pero sin marcas separadas |
| Centros de costo | `cont_centro_costo` | OK |
| Cuentas financieras (caja/banco) | `cont_cuenta_financiera` | OK |
| Categorias de gasto | `cont_categoria` | OK |
| Terceros (proveedores/clientes) | `cont_tercero` | OK |
| Gastos | `cont_gasto` + `cont_gasto_linea` | OK, tiene linea_negocio_id, centro_costo_id |
| Facturas proveedor | `cont_factura_proveedor` | OK |
| Pagos | `cont_pago` + `cont_pago_detalle` + `cont_pago_aplicacion` | OK |
| CxC basico | `cont_cxc` | Minimo: solo monto, saldo, vencimiento |
| CxP basico | `cont_cxp` | Minimo: solo monto, saldo, vencimiento |
| Presupuestos | `cont_presupuesto` + `cont_presupuesto_linea` | OK, tiene centro_costo_id, linea_negocio_id |
| Estado financiero POS | `cont_venta_pos_estado` | OK: pendiente/confirmada/credito/descartada |
| Pagos POS | `cont_venta_pos_pago` | OK |
| Data POS Odoo | `odoo.v_pos_order_enriched` + `odoo.v_pos_line_full` | OK: tiene marca, tipo, costo |

### NO EXISTE (crear)
| Concepto | Tabla nueva | Prioridad |
|----------|-------------|-----------|
| Marcas como entidad | `cont_marca` | P0 |
| Proyectos/campanas | `cont_proyecto` | P1 |
| Abonos a CxC | `cont_cxc_abono` | P0 |
| Abonos a CxP | `cont_cxp_abono` | P0 |
| Movimientos de tesoreria unificados | `cont_mov_tesoreria` | P1 |

### DATOS REALES DE ODOO
- 9 marcas activas: AMBISSION, BOOSH, ELEMENT DENIM, ELEMENT PREMIUM, EP Studio, PSICOSIS, QEPO, REDDOOR, SPACE
- 15 tipos de producto: Polo, Pantalon, Casaca, Short, etc.
- 1,972 ventas multimarca (tickets con 2+ marcas) -> CONFIRMA la necesidad del diseno por detalle

---

## 2. MODELO DE DATOS

### 2.1 TABLAS MAESTRAS NUEVAS

```sql
-- MARCAS (nueva)
CREATE TABLE finanzas2.cont_marca (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES finanzas2.cont_empresa(id),
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20),
    odoo_marca_key VARCHAR(100),  -- mapeo a v_pos_line_full.marca
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Seed: AMBISSION, BOOSH, ELEMENT DENIM, ELEMENT PREMIUM, EP Studio, PSICOSIS, QEPO, REDDOOR, SPACE

-- PROYECTOS / CAMPANAS (nueva)
CREATE TABLE finanzas2.cont_proyecto (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES finanzas2.cont_empresa(id),
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(30),
    marca_id INT REFERENCES finanzas2.cont_marca(id),
    linea_negocio_id INT REFERENCES finanzas2.cont_linea_negocio(id),
    centro_costo_id INT REFERENCES finanzas2.cont_centro_costo(id),
    fecha_inicio DATE,
    fecha_fin DATE,
    presupuesto NUMERIC(14,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'activo',  -- activo, cerrado, cancelado
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 EXTENSION DE CXC (cuentas por cobrar)

La tabla `cont_cxc` actual es minima. Se extiende:

```sql
ALTER TABLE finanzas2.cont_cxc ADD COLUMN IF NOT EXISTS
    tipo_origen VARCHAR(30);          -- 'venta_pos_credito', 'manual', 'cuota', 'letra'
ALTER TABLE finanzas2.cont_cxc ADD COLUMN IF NOT EXISTS
    documento_referencia VARCHAR(100); -- numero de documento origen
ALTER TABLE finanzas2.cont_cxc ADD COLUMN IF NOT EXISTS
    odoo_order_id INT;                -- link a venta POS si aplica
ALTER TABLE finanzas2.cont_cxc ADD COLUMN IF NOT EXISTS
    marca_id INT;                     -- para CxC de marca especifica
ALTER TABLE finanzas2.cont_cxc ADD COLUMN IF NOT EXISTS
    linea_negocio_id INT;
ALTER TABLE finanzas2.cont_cxc ADD COLUMN IF NOT EXISTS
    centro_costo_id INT;
ALTER TABLE finanzas2.cont_cxc ADD COLUMN IF NOT EXISTS
    proyecto_id INT;
ALTER TABLE finanzas2.cont_cxc ADD COLUMN IF NOT EXISTS
    dias_atraso INT DEFAULT 0;

-- ABONOS A CXC (nueva)
CREATE TABLE finanzas2.cont_cxc_abono (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL,
    cxc_id INT NOT NULL REFERENCES finanzas2.cont_cxc(id),
    fecha DATE NOT NULL,
    monto NUMERIC(14,2) NOT NULL,
    cuenta_financiera_id INT REFERENCES finanzas2.cont_cuenta_financiera(id),
    forma_pago VARCHAR(30),  -- efectivo, transferencia, yape, plin, etc.
    referencia VARCHAR(200),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.3 EXTENSION DE CXP (cuentas por pagar)

```sql
ALTER TABLE finanzas2.cont_cxp ADD COLUMN IF NOT EXISTS
    tipo_origen VARCHAR(30);          -- 'compra', 'servicio', 'alquiler', 'planilla', 'gasto'
ALTER TABLE finanzas2.cont_cxp ADD COLUMN IF NOT EXISTS
    documento_referencia VARCHAR(100);
ALTER TABLE finanzas2.cont_cxp ADD COLUMN IF NOT EXISTS
    marca_id INT;
ALTER TABLE finanzas2.cont_cxp ADD COLUMN IF NOT EXISTS
    linea_negocio_id INT;
ALTER TABLE finanzas2.cont_cxp ADD COLUMN IF NOT EXISTS
    centro_costo_id INT;
ALTER TABLE finanzas2.cont_cxp ADD COLUMN IF NOT EXISTS
    proyecto_id INT;
ALTER TABLE finanzas2.cont_cxp ADD COLUMN IF NOT EXISTS
    dias_vencido INT DEFAULT 0;
ALTER TABLE finanzas2.cont_cxp ADD COLUMN IF NOT EXISTS
    categoria_id INT;

-- ABONOS A CXP (nueva)
CREATE TABLE finanzas2.cont_cxp_abono (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL,
    cxp_id INT NOT NULL REFERENCES finanzas2.cont_cxp(id),
    fecha DATE NOT NULL,
    monto NUMERIC(14,2) NOT NULL,
    cuenta_financiera_id INT REFERENCES finanzas2.cont_cuenta_financiera(id),
    forma_pago VARCHAR(30),
    referencia VARCHAR(200),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.4 EXTENSION DE PRESUPUESTO

```sql
ALTER TABLE finanzas2.cont_presupuesto_linea ADD COLUMN IF NOT EXISTS
    marca_id INT;
ALTER TABLE finanzas2.cont_presupuesto_linea ADD COLUMN IF NOT EXISTS
    proyecto_id INT;
ALTER TABLE finanzas2.cont_presupuesto_linea ADD COLUMN IF NOT EXISTS
    tipo VARCHAR(20) DEFAULT 'gasto';  -- 'ingreso', 'gasto'
```

### 2.5 EXTENSION DE GASTOS Y PAGOS

```sql
ALTER TABLE finanzas2.cont_gasto ADD COLUMN IF NOT EXISTS marca_id INT;
ALTER TABLE finanzas2.cont_gasto ADD COLUMN IF NOT EXISTS proyecto_id INT;
ALTER TABLE finanzas2.cont_pago ADD COLUMN IF NOT EXISTS marca_id INT;
ALTER TABLE finanzas2.cont_pago ADD COLUMN IF NOT EXISTS proyecto_id INT;
```

---

## 3. VISTAS SQL PARA ANALISIS GERENCIAL

### 3.1 INGRESOS CONFIRMADOS POR MARCA/LINEA (desde detalle POS)

```sql
-- vw_ingresos_confirmados_detalle
-- REGLA: Solo ventas con estado_local = 'confirmada'
-- REGLA: Distribucion por marca desde v_pos_line_full, NO desde cabecera
CREATE VIEW finanzas2.vw_ingresos_confirmados AS
SELECT
    e.empresa_id,
    e.odoo_order_id,
    o.date_order,
    l.marca,
    l.tipo,
    SUM(l.price_subtotal) AS ingreso_marca,
    SUM(l.qty * COALESCE(l.list_price - l.price_unit, 0)) AS descuento_marca,
    SUM(l.qty) AS unidades,
    COUNT(DISTINCT l.product_id) AS productos_distintos
FROM finanzas2.cont_venta_pos_estado e
JOIN odoo.v_pos_order_enriched o ON o.odoo_order_id = e.odoo_order_id
JOIN odoo.v_pos_line_full l ON l.order_id = e.odoo_order_id AND l.company_key = o.company_key
WHERE e.estado_local = 'confirmada'
GROUP BY e.empresa_id, e.odoo_order_id, o.date_order, l.marca, l.tipo;
```

### 3.2 CUENTAS POR COBRAR POR MARCA (ventas a credito)

```sql
-- Ventas a credito distribuidas por marca
CREATE VIEW finanzas2.vw_cxc_por_marca AS
SELECT
    e.empresa_id,
    e.odoo_order_id,
    o.date_order,
    l.marca,
    SUM(l.price_subtotal) AS monto_credito_marca,
    c.saldo_pendiente AS saldo_total_documento,
    c.estado AS estado_cxc,
    c.fecha_vencimiento
FROM finanzas2.cont_venta_pos_estado e
JOIN odoo.v_pos_order_enriched o ON o.odoo_order_id = e.odoo_order_id
JOIN odoo.v_pos_line_full l ON l.order_id = e.odoo_order_id AND l.company_key = o.company_key
LEFT JOIN finanzas2.cont_cxc c ON c.odoo_order_id = e.odoo_order_id AND c.empresa_id = e.empresa_id
WHERE e.estado_local = 'credito'
GROUP BY e.empresa_id, e.odoo_order_id, o.date_order, l.marca, c.saldo_pendiente, c.estado, c.fecha_vencimiento;
```

### 3.3 CAJA REAL

```sql
-- Saldo real: cuentas financieras
CREATE VIEW finanzas2.vw_caja_real AS
SELECT
    cf.empresa_id,
    cf.id AS cuenta_id,
    cf.nombre,
    cf.tipo,  -- 'caja' o 'banco'
    cf.banco,
    cf.saldo_actual,
    cf.moneda_id
FROM finanzas2.cont_cuenta_financiera cf
WHERE cf.activo = TRUE;
```

### 3.4 FLUJO DE CAJA

```sql
-- Flujo: pagos realizados (egresos) + pagos POS confirmados (ingresos)
-- Se calcula dinamicamente por periodo
```

### 3.5 RENTABILIDAD POR MARCA

```sql
-- Utilidad = Ingresos confirmados (marca) - Gastos asignados (marca)
-- Ingresos: desde vw_ingresos_confirmados
-- Gastos: desde cont_gasto WHERE marca_id = X
-- Margen: utilidad / ingresos * 100
```

---

## 4. REGLAS DE NEGOCIO

### 4.1 FLUJO POS -> FINANZAS

```
[Odoo POS] --sync--> [odoo.v_pos_order_enriched + v_pos_line_full]
                              |
                    [Pantalla Ventas POS]
                              |
                    [Usuario confirma estado]
                              |
              +---------------+---------------+
              |               |               |
         CONFIRMADA       CREDITO        DESCARTADA
              |               |               |
         Ingreso real    Genera CxC       No impacta
         Impacta caja    No impacta       nada
         por marca       caja real
         (desde detalle) (desde detalle)
```

### 4.2 REGLA MULTIMARCA
```
Venta POS-146584: S/ 2,671.25
  - BOOSH: S/ 800.00 (30%)
  - ELEMENT PREMIUM: S/ 1,871.25 (70%)

Al confirmar:
  - Ingreso BOOSH: S/ 800.00
  - Ingreso ELEMENT: S/ 1,871.25
  NUNCA: Ingreso "Ambission": S/ 2,671.25 (INCORRECTO)
```

### 4.3 ESTADOS FINANCIEROS

| Estado | Ingreso | Caja | CxC | KPIs |
|--------|---------|------|-----|------|
| pendiente | NO | NO | NO | Solo referencia comercial |
| confirmada | SI | SI (si cobrada) | NO | SI |
| credito | NO | NO | SI | Solo CxC |
| descartada | NO | NO | NO | NO |

### 4.4 SEPARACION OBLIGACION vs PAGO

```
Compra/Gasto registrado -> Genera CxP (obligacion)
Pago ejecutado -> Reduce CxP + Reduce caja
NUNCA mezclar: registrar compra NO reduce caja automaticamente
```

---

## 5. PANTALLAS DEL MODULO

### 5.1 DASHBOARD FINANCIERO (pantalla principal)

```
+-----------------------------------------------+
| FILTROS: [Empresa] [Marca] [Linea] [CC]       |
|          [Proyecto] [Periodo] [Tienda]         |
+-----------------------------------------------+
| KPIs FILA 1: TESORERIA                        |
| [Caja] [Bancos] [Total Disponible] [Flujo Net]|
+-----------------------------------------------+
| KPIs FILA 2: INGRESOS                         |
| [Confirmados Hoy] [Semana] [Mes] [Pendientes] |
+-----------------------------------------------+
| KPIs FILA 3: OBLIGACIONES                     |
| [CxC Total] [CxP Total] [Gastos Mes] [Egresos]|
+-----------------------------------------------+
| GRAFICOS:                                      |
| [Flujo caja 30d]  [Ingresos x marca pie]      |
| [CxC aging]       [Presupuesto vs real]        |
+-----------------------------------------------+
| TABLAS:                                        |
| [Top 5 CxC vencidas]  [Top 5 CxP por vencer]  |
| [Rentabilidad x marca] [ROI x proyecto]        |
+-----------------------------------------------+
```

### 5.2 TESORERIA
- Listado de cuentas con saldos
- Movimientos por cuenta (ingresos/egresos)
- Transferencias entre cuentas
- Conciliacion bancaria (ya existe)

### 5.3 BANDEJA DE VALIDACION FINANCIERA POS
- Ya existe en Ventas POS
- Se mantiene: confirmar, credito, descartar
- Se agrega: vista de "pendientes por confirmar" como alerta en dashboard

### 5.4 CUENTAS POR COBRAR
- Listado con aging (0-30, 31-60, 61-90, 90+)
- Detalle por cliente
- Registro de abonos
- Calendario de vencimientos
- Alertas de vencidas

### 5.5 CUENTAS POR PAGAR
- Listado con aging
- Detalle por proveedor
- Registro de pagos parciales
- Cronograma de pagos
- Alertas de vencimiento

### 5.6 GASTOS (ya existe, se extiende)
- Agregar filtro/campo marca_id, proyecto_id
- Mantener todo lo existente

### 5.7 FLUJO DE CAJA
- Vista diaria/semanal/mensual
- Grafico de barras (ingresos vs egresos)
- Tabla detallada de movimientos

### 5.8 RENTABILIDAD
- Por empresa
- Por marca (desde detalle POS)
- Por linea de negocio
- Por centro de costo
- Por proyecto
- Tabla: ingreso, costo, gasto, utilidad, margen %

### 5.9 ROI / INVERSION
- Por proyecto/campana
- Capital invertido vs retorno acumulado
- ROI % y payback estimado

### 5.10 PRESUPUESTO VS REAL
- Ya existe base, se extiende con marca_id, proyecto_id
- Comparacion visual con barras y desviacion

### 5.11 REPORTES
- Exportables a Excel
- Todos con filtros por jerarquia analitica

---

## 6. PLAN DE IMPLEMENTACION POR FASES

### FASE 1: FUNDACIONES (P0)
1. Crear tabla `cont_marca` + seed de marcas Odoo
2. Crear tabla `cont_proyecto`
3. Extender `cont_cxc` con campos analiticos
4. Crear `cont_cxc_abono`
5. Extender `cont_cxp` con campos analiticos
6. Crear `cont_cxp_abono`
7. Agregar `marca_id`, `proyecto_id` a `cont_gasto`, `cont_pago`
8. Extender `cont_presupuesto_linea` con `marca_id`, `proyecto_id`, `tipo`
9. Endpoints CRUD para marcas y proyectos
10. UI basica de maestros: Marcas, Proyectos

### FASE 2: DASHBOARD FINANCIERO (P0)
1. Endpoint `/api/dashboard-financiero` con KPIs agregados
2. Vista SQL `vw_ingresos_confirmados` (por marca, desde detalle POS)
3. Vista SQL `vw_caja_real`
4. Pantalla Dashboard con KPIs, filtros y graficos

### FASE 3: CXC + CXP MEJORADAS (P0)
1. Reescribir CxC con aging, abonos, alertas
2. Reescribir CxP con aging, pagos parciales, alertas
3. Auto-crear CxC cuando venta POS pasa a "credito"
4. Endpoints de abonos

### FASE 4: FLUJO DE CAJA (P1)
1. Endpoint `/api/flujo-caja` con agregacion diaria/semanal/mensual
2. Pantalla con grafico y tabla

### FASE 5: RENTABILIDAD (P1)
1. Vista `vw_rentabilidad_marca` (ingreso POS confirmado - gastos asignados)
2. Endpoint `/api/rentabilidad`
3. Pantalla con tabla y filtros por marca/linea/CC/proyecto

### FASE 6: ROI + PRESUPUESTO VS REAL (P2)
1. Logica ROI por proyecto
2. Extension de presupuesto con marca y proyecto
3. Pantallas comparativas

### FASE 7: REPORTES GERENCIALES (P2)
1. 18 reportes exportables
2. Resumen ejecutivo CFO

---

## 7. JERARQUIA ANALITICA - COMO SE APLICA

| Movimiento | empresa_id | marca_id | linea_negocio_id | centro_costo_id | proyecto_id |
|------------|-----------|----------|------------------|-----------------|-------------|
| Venta POS confirmada | SI (auto) | SI (desde detalle) | SI (desde tipo) | SI (tienda) | Opcional |
| Venta POS credito->CxC | SI | SI (desde detalle) | SI | SI | Opcional |
| Gasto | SI | Opcional | Opcional | Opcional | Opcional |
| Factura proveedor | SI | Opcional | Opcional | Opcional | Opcional |
| Pago | SI | Opcional | Opcional | Opcional | Opcional |
| Presupuesto | SI | Opcional | Opcional | Opcional | Opcional |

---

## 8. FRASE CLAVE DEL DISENO

> "El reconocimiento financiero se decide en la cabecera;
>  la atribucion economica se calcula en el detalle."

Esto significa:
- `cont_venta_pos_estado.estado_local` = decision financiera (cabecera)
- `odoo.v_pos_line_full.marca/tipo/price_subtotal` = distribucion economica (detalle)
- Los KPIs SIEMPRE agregan desde detalle, NUNCA desde el total de cabecera para analisis por marca
