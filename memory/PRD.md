# Finanzas 4.0 - PRD

## Problema Original
Sistema de gestión financiera completo con FastAPI backend + React frontend + PostgreSQL.

## Arquitectura
- **Backend**: FastAPI monolítico (`server.py`) con `asyncpg` para PostgreSQL
- **Frontend**: React con React-Bootstrap, Axios, react-router-dom
- **Base de datos**: PostgreSQL, esquema `finanzas2`

## Funcionalidades Implementadas
- Dashboard, empresas, monedas, categorías, terceros
- Órdenes de compra, facturas proveedor, gastos, pagos, letras
- Ventas POS, planillas, adelantos, reportes financieros
- Correlativos atómicos, centro costo, línea negocio, fecha contable
- Campos SUNAT auto-calculados (base_gravada, igv_sunat, base_no_gravada)
- Export CompraAPP con voucher (Vou.Origen, Vou.Numero, Vou.Fecha)
- **Módulo Cuentas Contables**: tabla cont_cuenta (CRUD), cont_config_empresa (3 defaults), cuenta_gasto_id en categorías
- **Export CompraAPP con cuentas**: Cta Gastos (categoría > default), Cta IGV (si IGV>0), Cta x Pagar (si saldo>0)
- **Export CompraAPP 61 columnas fijas** (Feb 2026): Orden hardcodeado de 61 columnas SUNAT. Columnas definidas se llenan, el resto existe pero vacío (NULL). Fechas dd/mm/yyyy. Celdas vacías realmente NULL (no "0.00").

## BD Schema Clave
- `cont_cuenta`: id, empresa_id, codigo (UNIQUE), nombre, tipo, es_activa
- `cont_config_empresa`: empresa_id(PK), cta_gastos_default_id, cta_igv_default_id, cta_xpagar_default_id
- `cont_categoria.cuenta_gasto_id`: FK a cont_cuenta

## Columnas Definidas compraAPP (v1)
- 1-8: Vou.Origen(01), Vou.Numero, Vou.Fecha, Doc, Numero, Fec.Doc, Fec.Venc., Codigo
- 9: B.I.O.G y E. (A) = base_gravada
- 12: AD. NO GRAV. = base_no_gravada
- 13: I.S.C. = isc (vacío si 0)
- 14: IGV (A) = igv_sunat
- 19: Moneda = 'S' (PEN) / 'D' (USD)
- 20: TC = 1.00 (PEN) / tipo_cambio del documento (USD). USD sin TC bloquea export.
- 21: Glosa = notas || "{proveedor} {Doc}-{Numero}"
- 22: Cta Gastos (categoría > default)
- 23: Cta IGV (si IGV>0)
- 24: Cta O. Trib. (si ISC>0, usa default cta_otrib_default_id)
- 25: Cta x Pagar (facturas: si saldo>0; gastos: vacío si tiene pago)
- 26: C.Costo (lookup centro_costo desde líneas; 'MIX' si múltiples)
- 27: Presupuesto (lookup presupuesto desde líneas; 'MIX' si múltiples)

## BD Migraciones recientes
- `cont_config_empresa.cta_otrib_default_id` INT → cuenta otros tributos
- `cont_factura_proveedor_linea.presupuesto_id` INT → presupuesto por línea
- `cont_gasto_linea.presupuesto_id` INT → presupuesto por línea
- `cont_factura_proveedor.tipo_cambio` NUMERIC(18,8)
- `cont_gasto.tipo_cambio` NUMERIC(18,8)

## Seed Cuentas Perú
- Endpoint `POST /cuentas-contables/seed-peru` inserta 20 cuentas mínimas PCGE
- Idempotente (ON CONFLICT DO NOTHING)
- Auto-configura defaults: 6399=Cta Gastos, 4012=Cta IGV, 4212=Cta xPagar, 4099=Cta O.Trib
- Botón "Seed Plan Perú" en UI CuentasContables.jsx

## Contabilidad Doble Partida (Journal Entries)
- Tablas: `cont_asiento`, `cont_asiento_linea`, `cont_periodo_cerrado`
- `cont_cuenta_financiera.cuenta_contable_id` vincula bancos a cuentas contables
- Servicio posting (contabilidad.py): generar_asiento_fprov, generar_asiento_gasto, generar_asiento_pago
- Reglas FPROV: D=Gastos(base+noGrav)+IGV | H=CxP(total)
- Reglas GASTO: D=Gastos+IGV | H=Banco/Caja(contado) o CxP(crédito)
- Reglas PAGO: D=CxP | H=Banco/Caja
- Multi-moneda: moneda+tipo_cambio+debe_base/haber_base en PEN
- Estados: borrador→posteado→anulado
- Reportes: Mayor, Balance(ACTIVO/PASIVO/PATRIMONIO/IMPUESTO), P&L(INGRESO/GASTO/COSTO)
- Periodos cerrados bloquean posteo
- Frontend: /asientos con filtros y detalle expandible, botón generar desde facturas
- Testeado: 17/17 tests backend ✅

## Export compraAPP - Columnas 28-61 Completadas
- Cols 28-32: Retención/Detracción (r_doc, r_numero, r_fecha, d_numero, d_fecha) desde tabla cont_retencion_detalle
- Cols 33-34: RUC y R.Social desde cont_tercero (proveedor)
- Cols 35-36: Tipo persona y Tip.Doc.Iden (campos manuales en cont_tercero)
- Cols 38-40: Apellido1/2, Nombre (persona natural, campos manuales)
- Col 37: Medio de Pago desde pago aplicado
- Cols 42-55: P.* desde pago_aplicacion + pago_detalle (fecha, cta cob, medio, moneda, tc, monto, glosa)
- Cols 56-61: Retencion 0/1, PDB ndes, CodTasa, Ind.Ret, B.Imp, IGV desde cont_retencion_detalle
- Si factura tiene N pagos aplicados → se duplica la fila N veces (1 por pago)
- Si no hay pago → cols P.* vacías
- Si no hay retención → cols R.*/56-61 vacías

## Sprint Post-Contabilidad
- cont_retencion_detalle: CRUD endpoints GET/PUT (upsert por empresa+origen)
- cont_tercero: campos tipo_persona, tip_doc_iden, apellido1, apellido2, nombres
- cont_cuenta_financiera.cuenta_contable_id: link a cuenta contable
- POST /cuentas-financieras/mapear-cuentas-default: auto-mapeo BCP→1041, BBVA→1042, etc.
- Botón "Generar Asiento" en Gastos (igual que Facturas)
- Dropdown "Cuenta Contable" en form de Cuentas Bancarias

## Backlog
- P1: Refactorizar server.py usando APIRouter
- P2: Custom hook useFormSubmit
