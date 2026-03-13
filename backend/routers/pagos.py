from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import date, datetime
from database import get_pool
from models import Pago, PagoCreate, Letra, GenerarLetrasRequest
from dependencies import get_empresa_id, get_next_correlativo, safe_date_param
from services.treasury_service import create_movimiento_tesoreria
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


async def generate_pago_number(conn, tipo: str, empresa_id: int) -> str:
    year = datetime.now().year
    prefijo = f"PAG-{tipo[0].upper()}-{year}-"
    return await get_next_correlativo(conn, empresa_id, f'pago_{tipo}', prefijo)


async def get_pago(id: int) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            SELECT p.*, cf.nombre as cuenta_nombre, m.codigo as moneda_codigo
            FROM finanzas2.cont_pago p
            LEFT JOIN finanzas2.cont_cuenta_financiera cf ON p.cuenta_financiera_id = cf.id
            LEFT JOIN finanzas2.cont_moneda m ON p.moneda_id = m.id
            WHERE p.id = $1
        """, id)
        if not row:
            raise HTTPException(404, "Pago not found")
        pago_dict = dict(row)
        detalles = await conn.fetch("""
            SELECT pd.*, cf.nombre as cuenta_nombre
            FROM finanzas2.cont_pago_detalle pd
            LEFT JOIN finanzas2.cont_cuenta_financiera cf ON pd.cuenta_financiera_id = cf.id
            WHERE pd.pago_id = $1
        """, id)
        pago_dict['detalles'] = [dict(d) for d in detalles]
        aplicaciones = await conn.fetch("SELECT * FROM finanzas2.cont_pago_aplicacion WHERE pago_id = $1", id)
        pago_dict['aplicaciones'] = [dict(a) for a in aplicaciones]
        return pago_dict


@router.get("/pagos", response_model=List[Pago])
async def list_pagos(
    tipo: Optional[str] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    cuenta_financiera_id: Optional[int] = None,
    conciliado: Optional[bool] = None,
    centro_costo_id: Optional[int] = None,
    linea_negocio_id: Optional[int] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["p.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if tipo:
            conditions.append(f"p.tipo = ${idx}"); params.append(tipo); idx += 1
        if fecha_desde:
            conditions.append(f"p.fecha >= ${idx}"); params.append(fecha_desde); idx += 1
        if fecha_hasta:
            conditions.append(f"p.fecha <= ${idx}"); params.append(fecha_hasta); idx += 1
        if cuenta_financiera_id:
            conditions.append(f"p.cuenta_financiera_id = ${idx}"); params.append(cuenta_financiera_id); idx += 1
        if conciliado is not None:
            conditions.append(f"COALESCE(p.conciliado, false) = ${idx}"); params.append(conciliado); idx += 1
        if centro_costo_id:
            conditions.append(f"p.centro_costo_id = ${idx}"); params.append(centro_costo_id); idx += 1
        if linea_negocio_id:
            conditions.append(f"p.linea_negocio_id = ${idx}"); params.append(linea_negocio_id); idx += 1
        query = f"""
            SELECT p.*, cf.nombre as cuenta_nombre, m.codigo as moneda_codigo,
                   cc.nombre as centro_costo_nombre, ln.nombre as linea_negocio_nombre
            FROM finanzas2.cont_pago p
            LEFT JOIN finanzas2.cont_cuenta_financiera cf ON p.cuenta_financiera_id = cf.id
            LEFT JOIN finanzas2.cont_moneda m ON p.moneda_id = m.id
            LEFT JOIN finanzas2.cont_centro_costo cc ON p.centro_costo_id = cc.id
            LEFT JOIN finanzas2.cont_linea_negocio ln ON p.linea_negocio_id = ln.id
            WHERE {' AND '.join(conditions)}
            ORDER BY p.fecha DESC, p.id DESC
        """
        rows = await conn.fetch(query, *params)
        result = []
        for row in rows:
            pago_dict = dict(row)
            detalles = await conn.fetch("""
                SELECT pd.*, cf.nombre as cuenta_nombre
                FROM finanzas2.cont_pago_detalle pd
                LEFT JOIN finanzas2.cont_cuenta_financiera cf ON pd.cuenta_financiera_id = cf.id
                WHERE pd.pago_id = $1
            """, row['id'])
            pago_dict['detalles'] = [dict(d) for d in detalles]
            aplicaciones = await conn.fetch("SELECT * FROM finanzas2.cont_pago_aplicacion WHERE pago_id = $1", row['id'])
            pago_dict['aplicaciones'] = [dict(a) for a in aplicaciones]
            result.append(pago_dict)
        return result


@router.post("/pagos", response_model=Pago)
async def create_pago(data: PagoCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            for aplicacion in data.aplicaciones:
                if aplicacion.tipo_documento == 'factura':
                    doc = await conn.fetchrow("SELECT saldo_pendiente, total, estado FROM finanzas2.cont_factura_proveedor WHERE id = $1", aplicacion.documento_id)
                    if not doc:
                        raise HTTPException(404, f"Factura {aplicacion.documento_id} not found")
                    if doc['estado'] == 'canjeado':
                        raise HTTPException(400, "No se puede pagar una factura canjeada. Debe pagar las letras.")
                    if aplicacion.monto_aplicado > float(doc['saldo_pendiente']):
                        raise HTTPException(400, f"El monto ({aplicacion.monto_aplicado:.2f}) excede el saldo pendiente ({doc['saldo_pendiente']:.2f})")
                elif aplicacion.tipo_documento == 'letra':
                    doc = await conn.fetchrow("SELECT saldo_pendiente, monto, estado FROM finanzas2.cont_letra WHERE id = $1", aplicacion.documento_id)
                    if not doc:
                        raise HTTPException(404, f"Letra {aplicacion.documento_id} not found")
                    if doc['estado'] == 'pagada':
                        raise HTTPException(400, f"La letra ya esta pagada")
                    saldo = float(doc['saldo_pendiente'])
                    if abs(aplicacion.monto_aplicado - saldo) > 0.01:
                        raise HTTPException(400, f"El pago de una letra debe ser por el monto exacto ({saldo:.2f}). No se permiten pagos parciales.")
            numero = await generate_pago_number(conn, data.tipo, empresa_id)
            pago = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_pago
                (empresa_id, numero, tipo, fecha, cuenta_financiera_id, moneda_id, monto_total, referencia, notas)
                VALUES ($1, $2, $3, TO_DATE($4, 'YYYY-MM-DD'), $5, $6, $7, $8, $9)
                RETURNING *
            """, empresa_id, numero, data.tipo, safe_date_param(data.fecha), data.cuenta_financiera_id, data.moneda_id,
                data.monto_total, data.referencia, data.notas)
            pago_id = pago['id']
            for detalle in data.detalles:
                await conn.execute("""
                    INSERT INTO finanzas2.cont_pago_detalle
                    (empresa_id, pago_id, cuenta_financiera_id, medio_pago, monto, referencia)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, empresa_id, pago_id, detalle.cuenta_financiera_id, detalle.medio_pago,
                    detalle.monto, detalle.referencia)
                if data.tipo == 'egreso':
                    await conn.execute("UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = saldo_actual - $1 WHERE id = $2", detalle.monto, detalle.cuenta_financiera_id)
                else:
                    await conn.execute("UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = saldo_actual + $1 WHERE id = $2", detalle.monto, detalle.cuenta_financiera_id)
                # Crear movimiento de tesorería real
                origen_tipo = 'pago_egreso' if data.tipo == 'egreso' else 'pago_ingreso'
                await create_movimiento_tesoreria(
                    conn, empresa_id, date.today(), data.tipo,
                    float(detalle.monto),
                    cuenta_financiera_id=detalle.cuenta_financiera_id,
                    forma_pago=detalle.medio_pago,
                    concepto=data.notas or data.referencia or f"Pago {numero}",
                    origen_tipo=origen_tipo,
                    origen_id=pago_id,
                )
            for aplicacion in data.aplicaciones:
                await conn.execute("""
                    INSERT INTO finanzas2.cont_pago_aplicacion
                    (empresa_id, pago_id, tipo_documento, documento_id, monto_aplicado)
                    VALUES ($1, $2, $3, $4, $5)
                """, empresa_id, pago_id, aplicacion.tipo_documento, aplicacion.documento_id, aplicacion.monto_aplicado)
                if aplicacion.tipo_documento == 'factura':
                    await conn.execute("UPDATE finanzas2.cont_factura_proveedor SET saldo_pendiente = saldo_pendiente - $1 WHERE id = $2", aplicacion.monto_aplicado, aplicacion.documento_id)
                    fp = await conn.fetchrow("SELECT total, saldo_pendiente FROM finanzas2.cont_factura_proveedor WHERE id = $1", aplicacion.documento_id)
                    if fp['saldo_pendiente'] <= 0:
                        await conn.execute("UPDATE finanzas2.cont_factura_proveedor SET estado = 'pagado' WHERE id = $1", aplicacion.documento_id)
                        await conn.execute("UPDATE finanzas2.cont_cxp SET estado = 'pagado', saldo_pendiente = 0 WHERE factura_id = $1", aplicacion.documento_id)
                    else:
                        await conn.execute("UPDATE finanzas2.cont_factura_proveedor SET estado = 'parcial' WHERE id = $1", aplicacion.documento_id)
                        await conn.execute("UPDATE finanzas2.cont_cxp SET estado = 'parcial', saldo_pendiente = $2 WHERE factura_id = $1", aplicacion.documento_id, fp['saldo_pendiente'])
                elif aplicacion.tipo_documento == 'letra':
                    await conn.execute("UPDATE finanzas2.cont_letra SET saldo_pendiente = saldo_pendiente - $1 WHERE id = $2", aplicacion.monto_aplicado, aplicacion.documento_id)
                    letra = await conn.fetchrow("SELECT monto, saldo_pendiente, factura_id FROM finanzas2.cont_letra WHERE id = $1", aplicacion.documento_id)
                    if letra['saldo_pendiente'] <= 0:
                        await conn.execute("UPDATE finanzas2.cont_letra SET estado = 'pagada' WHERE id = $1", aplicacion.documento_id)
                    else:
                        await conn.execute("UPDATE finanzas2.cont_letra SET estado = 'parcial' WHERE id = $1", aplicacion.documento_id)
                    if letra['factura_id']:
                        total_letras_pendiente = await conn.fetchval("SELECT COALESCE(SUM(saldo_pendiente), 0) FROM finanzas2.cont_letra WHERE factura_id = $1", letra['factura_id'])
                        nuevo_saldo = float(total_letras_pendiente)
                        nuevo_estado = 'pagado' if nuevo_saldo <= 0 else 'parcial'
                        await conn.execute("UPDATE finanzas2.cont_cxp SET saldo_pendiente = $2, estado = $3 WHERE factura_id = $1", letra['factura_id'], nuevo_saldo, nuevo_estado)
                        await conn.execute("UPDATE finanzas2.cont_factura_proveedor SET saldo_pendiente = $2 WHERE id = $1", letra['factura_id'], nuevo_saldo)
                        # Distribución analítica: gasto por línea de negocio desde líneas de la factura
                        try:
                            lineas_fp = await conn.fetch("""
                                SELECT linea_negocio_id, importe FROM finanzas2.cont_factura_proveedor_linea
                                WHERE factura_id = $1 AND linea_negocio_id IS NOT NULL
                            """, letra['factura_id'])
                            if lineas_fp:
                                total_fp = sum(float(l['importe']) for l in lineas_fp)
                                if total_fp > 0:
                                    for linea in lineas_fp:
                                        proporcion = float(linea['importe']) / total_fp
                                        monto_dist = round(aplicacion.monto_aplicado * proporcion, 2)
                                        await conn.execute("""
                                            INSERT INTO finanzas2.cont_distribucion_analitica
                                            (empresa_id, fecha, monto, linea_negocio_id, origen_tipo, origen_id)
                                            VALUES ($1, $2, $3, $4, 'pago_letra', $5)
                                        """, empresa_id, date.today(), monto_dist, linea['linea_negocio_id'], pago_id)
                        except Exception as e:
                            logger.warning(f"Error creating analytical distribution for letra payment: {e}")
            row = await conn.fetchrow("""
                SELECT p.*, cf.nombre as cuenta_nombre, m.codigo as moneda_codigo
                FROM finanzas2.cont_pago p
                LEFT JOIN finanzas2.cont_cuenta_financiera cf ON p.cuenta_financiera_id = cf.id
                LEFT JOIN finanzas2.cont_moneda m ON p.moneda_id = m.id
                WHERE p.id = $1
            """, pago_id)
            if not row:
                raise HTTPException(404, "Pago not found after creation")
            pago_dict = dict(row)
            detalles = await conn.fetch("""
                SELECT pd.*, cf.nombre as cuenta_nombre
                FROM finanzas2.cont_pago_detalle pd
                LEFT JOIN finanzas2.cont_cuenta_financiera cf ON pd.cuenta_financiera_id = cf.id
                WHERE pd.pago_id = $1
            """, pago_id)
            pago_dict['detalles'] = [dict(d) for d in detalles]
            aplicaciones = await conn.fetch("SELECT * FROM finanzas2.cont_pago_aplicacion WHERE pago_id = $1", pago_id)
            pago_dict['aplicaciones'] = [dict(a) for a in aplicaciones]
            return pago_dict


@router.get("/pagos/{id}", response_model=Pago)
async def get_pago_endpoint(id: int, empresa_id: int = Depends(get_empresa_id)):
    return await get_pago(id)


@router.put("/pagos/{id}")
async def update_pago(id: int, data: dict, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        pago = await conn.fetchrow("SELECT * FROM finanzas2.cont_pago WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not pago:
            raise HTTPException(404, "Pago no encontrado")
        if pago['conciliado']:
            if 'referencia' in data:
                await conn.execute("UPDATE finanzas2.cont_pago SET referencia = $1, updated_at = NOW() WHERE id = $2", data.get('referencia'), id)
            return {"message": "Referencia actualizada (pago conciliado)"}
        update_fields = []
        values = []
        param_count = 1
        if 'fecha' in data:
            update_fields.append(f"fecha = TO_DATE(${param_count}, 'YYYY-MM-DD')")
            values.append(safe_date_param(data['fecha'])); param_count += 1
        if 'referencia' in data:
            update_fields.append(f"referencia = ${param_count}")
            values.append(data['referencia']); param_count += 1
        if 'notas' in data:
            update_fields.append(f"notas = ${param_count}")
            values.append(data['notas']); param_count += 1
        update_fields.append("updated_at = NOW()")
        if update_fields:
            values.append(id)
            query = f"UPDATE finanzas2.cont_pago SET {', '.join(update_fields)} WHERE id = ${param_count}"
            await conn.execute(query, *values)
        return {"message": "Pago actualizado exitosamente"}


@router.delete("/pagos/{id}")
async def delete_pago(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            pago = await conn.fetchrow("SELECT * FROM finanzas2.cont_pago WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not pago:
                raise HTTPException(404, "Pago not found")
            detalles = await conn.fetch("SELECT * FROM finanzas2.cont_pago_detalle WHERE pago_id = $1", id)
            for detalle in detalles:
                if pago['tipo'] == 'egreso':
                    await conn.execute("UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = saldo_actual + $1 WHERE id = $2", detalle['monto'], detalle['cuenta_financiera_id'])
                else:
                    await conn.execute("UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = saldo_actual - $1 WHERE id = $2", detalle['monto'], detalle['cuenta_financiera_id'])
            aplicaciones = await conn.fetch("SELECT * FROM finanzas2.cont_pago_aplicacion WHERE pago_id = $1", id)
            for aplicacion in aplicaciones:
                if aplicacion['tipo_documento'] == 'factura':
                    await conn.execute("UPDATE finanzas2.cont_factura_proveedor SET saldo_pendiente = saldo_pendiente + $1, estado = 'pendiente' WHERE id = $2", aplicacion['monto_aplicado'], aplicacion['documento_id'])
                    await conn.execute("UPDATE finanzas2.cont_cxp SET saldo_pendiente = saldo_pendiente + $1, estado = 'pendiente' WHERE factura_id = $2", aplicacion['monto_aplicado'], aplicacion['documento_id'])
                elif aplicacion['tipo_documento'] == 'letra':
                    await conn.execute("UPDATE finanzas2.cont_letra SET saldo_pendiente = saldo_pendiente + $1, estado = 'pendiente' WHERE id = $2", aplicacion['monto_aplicado'], aplicacion['documento_id'])
            await conn.execute("DELETE FROM finanzas2.cont_pago WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            return {"message": "Pago deleted and reversed"}


# =====================
# LETRAS
# =====================
@router.get("/letras", response_model=List[Letra])
async def list_letras(
    estado: Optional[str] = None,
    proveedor_id: Optional[int] = None,
    factura_id: Optional[int] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["l.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if estado:
            conditions.append(f"l.estado = ${idx}"); params.append(estado); idx += 1
        if proveedor_id:
            conditions.append(f"l.proveedor_id = ${idx}"); params.append(proveedor_id); idx += 1
        if factura_id:
            conditions.append(f"l.factura_id = ${idx}"); params.append(factura_id); idx += 1
        query = f"""
            SELECT l.*, t.nombre as proveedor_nombre, fp.numero as factura_numero
            FROM finanzas2.cont_letra l
            LEFT JOIN finanzas2.cont_tercero t ON l.proveedor_id = t.id
            LEFT JOIN finanzas2.cont_factura_proveedor fp ON l.factura_id = fp.id
            WHERE {' AND '.join(conditions)}
            ORDER BY l.fecha_vencimiento ASC
        """
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]


@router.post("/letras/generar", response_model=List[Letra])
async def generar_letras(data: GenerarLetrasRequest, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            factura = await conn.fetchrow("SELECT * FROM finanzas2.cont_factura_proveedor WHERE id = $1", data.factura_id)
            if not factura:
                raise HTTPException(404, "Factura not found")
            if factura['estado'] in ('pagado', 'anulada', 'canjeado'):
                raise HTTPException(400, "Cannot generate letras for this factura")
            existing = await conn.fetchval("SELECT COUNT(*) FROM finanzas2.cont_letra WHERE factura_id = $1", data.factura_id)
            if existing > 0:
                raise HTTPException(400, "Factura already has letras")
            letras = []
            if data.letras_personalizadas and len(data.letras_personalizadas) > 0:
                total_letras = sum(l.monto for l in data.letras_personalizadas)
                if abs(total_letras - float(factura['total'])) > 0.01:
                    raise HTTPException(400, f"El total de las letras ({total_letras:.2f}) debe ser igual al total de la factura ({factura['total']:.2f})")
                for i, letra_data in enumerate(data.letras_personalizadas):
                    numero = f"L-{factura['numero']}-{i+1:02d}"
                    from datetime import timedelta
                    letra = await conn.fetchrow("""
                        INSERT INTO finanzas2.cont_letra
                        (empresa_id, numero, factura_id, proveedor_id, monto, fecha_emision, fecha_vencimiento, estado, saldo_pendiente)
                        VALUES ($1, $2, $3, $4, $5, TO_DATE($6, 'YYYY-MM-DD'), TO_DATE($7, 'YYYY-MM-DD'), 'pendiente', $5)
                        RETURNING *
                    """, empresa_id, numero, data.factura_id, factura['proveedor_id'], letra_data.monto,
                        safe_date_param(datetime.now().date()), safe_date_param(letra_data.fecha_vencimiento))
                    letras.append(dict(letra))
            else:
                from datetime import timedelta
                monto_por_letra = data.monto_por_letra or (factura['total'] / data.cantidad_letras)
                fecha_base = factura['fecha_vencimiento'] or datetime.now().date()
                for i in range(data.cantidad_letras):
                    fecha_vencimiento = fecha_base + timedelta(days=data.dias_entre_letras * i)
                    numero = f"L-{factura['numero']}-{i+1:02d}"
                    letra = await conn.fetchrow("""
                        INSERT INTO finanzas2.cont_letra
                        (empresa_id, numero, factura_id, proveedor_id, monto, fecha_emision, fecha_vencimiento, estado, saldo_pendiente)
                        VALUES ($1, $2, $3, $4, $5, TO_DATE($6, 'YYYY-MM-DD'), TO_DATE($7, 'YYYY-MM-DD'), 'pendiente', $5)
                        RETURNING *
                    """, empresa_id, numero, data.factura_id, factura['proveedor_id'], monto_por_letra,
                        safe_date_param(datetime.now().date()), safe_date_param(fecha_vencimiento))
                    letras.append(dict(letra))
            await conn.execute("UPDATE finanzas2.cont_factura_proveedor SET estado = 'canjeado' WHERE id = $1", data.factura_id)
            await conn.execute("UPDATE finanzas2.cont_cxp SET estado = 'canjeado' WHERE factura_id = $1", data.factura_id)
            return letras


@router.delete("/letras/{id}")
async def delete_letra(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            letra = await conn.fetchrow("SELECT * FROM finanzas2.cont_letra WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not letra:
                raise HTTPException(404, "Letra not found")
            pagos = await conn.fetchval("SELECT COUNT(*) FROM finanzas2.cont_pago_aplicacion WHERE tipo_documento = 'letra' AND documento_id = $1", id)
            if pagos > 0:
                raise HTTPException(400, "Cannot delete letra with payments. Reverse payments first.")
            factura_id = letra['factura_id']
            await conn.execute("DELETE FROM finanzas2.cont_letra WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            remaining = await conn.fetchval("SELECT COUNT(*) FROM finanzas2.cont_letra WHERE factura_id = $1", factura_id)
            if remaining == 0:
                await conn.execute("UPDATE finanzas2.cont_factura_proveedor SET estado = 'pendiente' WHERE id = $1", factura_id)
                await conn.execute("UPDATE finanzas2.cont_cxp SET estado = 'pendiente' WHERE factura_id = $1", factura_id)
            return {"message": "Letra deleted"}
