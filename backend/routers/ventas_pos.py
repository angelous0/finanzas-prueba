from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta
from database import get_pool
from models import VentaPOS
from dependencies import get_empresa_id, safe_date_param
from odoo_service import OdooService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/ventas-pos", response_model=List[VentaPOS])
async def list_ventas_pos(
    estado: Optional[str] = None,
    company_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    search: Optional[str] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["v.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if estado:
            conditions.append(f"estado_local = ${idx}"); params.append(estado); idx += 1
        if company_id:
            conditions.append(f"company_id = ${idx}"); params.append(company_id); idx += 1
        if fecha_desde:
            conditions.append(f"date_order >= ${idx}")
            params.append(datetime.combine(fecha_desde, datetime.min.time()) + timedelta(hours=5)); idx += 1
        if fecha_hasta:
            conditions.append(f"date_order <= ${idx}")
            params.append(datetime.combine(fecha_hasta, datetime.max.time()) + timedelta(hours=5)); idx += 1
        if search:
            search_pattern = f"%{search}%"
            conditions.append(f"(num_comp ILIKE ${idx} OR partner_name ILIKE ${idx} OR name ILIKE ${idx})")
            params.append(search_pattern); idx += 1
        query = f"""
            SELECT v.*,
                   COALESCE((SELECT SUM(p.monto) FROM finanzas2.cont_venta_pos_pago p WHERE p.venta_pos_id = v.id), 0) as pagos_asignados,
                   COALESCE((SELECT COUNT(*) FROM finanzas2.cont_venta_pos_pago p WHERE p.venta_pos_id = v.id), 0) as num_pagos,
                   COALESCE((SELECT SUM(pa.monto_aplicado)
                            FROM finanzas2.cont_pago_aplicacion pa
                            WHERE pa.tipo_documento = 'venta_pos' AND pa.documento_id = v.id), 0) as pagos_oficiales,
                   COALESCE((SELECT COUNT(*)
                            FROM finanzas2.cont_pago_aplicacion pa
                            WHERE pa.tipo_documento = 'venta_pos' AND pa.documento_id = v.id), 0) as num_pagos_oficiales
            FROM finanzas2.cont_venta_pos v
            WHERE {' AND '.join(conditions)}
            ORDER BY v.date_order DESC
        """
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]


@router.post("/ventas-pos/sync")
async def sync_ventas_pos(company: str = "ambission", days_back: int = 30, empresa_id: int = Depends(get_empresa_id)):
    try:
        odoo = OdooService(company=company)
        if not odoo.authenticate():
            raise HTTPException(401, f"Could not authenticate with Odoo ({company})")
        orders = odoo.get_pos_orders(days_back=days_back)
        if not orders:
            return {"message": "No orders found", "synced": 0}
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute("SET search_path TO finanzas2, public")
            synced = 0
            for order in orders:
                try:
                    odoo_id = order.get('id')
                    date_order_str = order.get('date_order')
                    if date_order_str and isinstance(date_order_str, str):
                        date_order = datetime.strptime(date_order_str, '%Y-%m-%d %H:%M:%S')
                    else:
                        date_order = date_order_str
                    name = order.get('name')
                    tipo_comp = order.get('tipo_comp')
                    num_comp = order.get('num_comp')
                    partner_id = order['partner_id'][0] if isinstance(order.get('partner_id'), list) else order.get('partner_id')
                    partner_name = order['partner_id'][1] if isinstance(order.get('partner_id'), list) else None
                    tienda_id = order['x_tienda'][0] if isinstance(order.get('x_tienda'), list) else None
                    tienda_name = order['x_tienda'][1] if isinstance(order.get('x_tienda'), list) else order.get('x_tienda')
                    vendedor_id = order['vendedor_id'][0] if isinstance(order.get('vendedor_id'), list) else order.get('vendedor_id')
                    vendedor_name = order['vendedor_id'][1] if isinstance(order.get('vendedor_id'), list) else None
                    company_id_val = order['company_id'][0] if isinstance(order.get('company_id'), list) else order.get('company_id')
                    company_name = order['company_id'][1] if isinstance(order.get('company_id'), list) else None
                    x_pagos = order.get('x_pagos')
                    if x_pagos == False or x_pagos == 'False':
                        x_pagos = None
                    quantity_total = order.get('quantity_pos_order')
                    amount_total = order.get('amount_total')
                    state = order.get('state')
                    reserva_pendiente = order.get('x_reserva_pendiente', 0)
                    reserva_facturada = order.get('x_reserva_facturada', 0)
                    is_cancel = order.get('is_cancel', False)
                    order_cancel_raw = order.get('order_cancel')
                    if order_cancel_raw == False or order_cancel_raw == 'False':
                        order_cancel = None
                    elif isinstance(order_cancel_raw, list) and len(order_cancel_raw) > 1:
                        order_cancel = order_cancel_raw[1]
                    else:
                        order_cancel = order_cancel_raw
                    reserva = order.get('reserva', False)
                    is_credit = order.get('is_credit', False)
                    reserva_use_id_raw = order.get('reserva_use_id')
                    if reserva_use_id_raw == False or reserva_use_id_raw == 'False':
                        reserva_use_id = None
                    elif isinstance(reserva_use_id_raw, list) and len(reserva_use_id_raw) > 0:
                        reserva_use_id = reserva_use_id_raw[0]
                    else:
                        reserva_use_id = reserva_use_id_raw
                    existing = await conn.fetchrow("SELECT id, estado_local FROM finanzas2.cont_venta_pos WHERE odoo_id = $1", odoo_id)
                    if existing:
                        existing_estado = existing['estado_local']
                        if existing_estado in ['confirmada', 'credito', 'descartada']:
                            continue
                    if existing:
                        await conn.execute("""
                            UPDATE finanzas2.cont_venta_pos SET
                                date_order=$2, name=$3, tipo_comp=$4, num_comp=$5, partner_id=$6, partner_name=$7,
                                tienda_id=$8, tienda_name=$9, vendedor_id=$10, vendedor_name=$11, company_id=$12,
                                company_name=$13, x_pagos=$14, quantity_total=$15, amount_total=$16, state=$17,
                                reserva_pendiente=$18, reserva_facturada=$19, is_cancel=$20, order_cancel=$21,
                                reserva=$22, is_credit=$23, reserva_use_id=$24, synced_at=NOW()
                            WHERE odoo_id = $1
                        """, odoo_id, date_order, name, tipo_comp, num_comp,
                            partner_id, partner_name, tienda_id, tienda_name,
                            vendedor_id, vendedor_name, company_id_val, company_name,
                            x_pagos, quantity_total, amount_total, state,
                            reserva_pendiente, reserva_facturada, is_cancel,
                            order_cancel, reserva, is_credit, reserva_use_id)
                    else:
                        await conn.execute("""
                            INSERT INTO finanzas2.cont_venta_pos
                            (odoo_id, date_order, name, tipo_comp, num_comp, partner_id, partner_name,
                             tienda_id, tienda_name, vendedor_id, vendedor_name, company_id, company_name,
                             x_pagos, quantity_total, amount_total, state, reserva_pendiente, reserva_facturada,
                             is_cancel, order_cancel, reserva, is_credit, reserva_use_id, synced_at, empresa_id)
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,NOW(),$25)
                        """, odoo_id, date_order, name, tipo_comp, num_comp,
                            partner_id, partner_name, tienda_id, tienda_name,
                            vendedor_id, vendedor_name, company_id_val, company_name,
                            x_pagos, quantity_total, amount_total, state,
                            reserva_pendiente, reserva_facturada, is_cancel,
                            order_cancel, reserva, is_credit, reserva_use_id, empresa_id)
                    try:
                        local_venta = await conn.fetchrow("SELECT id FROM finanzas2.cont_venta_pos WHERE odoo_id = $1", odoo_id)
                        if local_venta:
                            venta_pos_id = local_venta['id']
                            await conn.execute("DELETE FROM finanzas2.cont_venta_pos_linea WHERE venta_pos_id = $1", venta_pos_id)
                            lines = odoo.get_order_lines(odoo_id)
                            for line in lines:
                                product_name = line['product_id'][1] if isinstance(line.get('product_id'), list) else 'Producto'
                                product_id_val = line['product_id'][0] if isinstance(line.get('product_id'), list) else line.get('product_id')
                                await conn.execute("""
                                    INSERT INTO finanzas2.cont_venta_pos_linea
                                    (venta_pos_id, odoo_line_id, product_id, product_name, product_code,
                                     qty, price_unit, price_subtotal, price_subtotal_incl, discount,
                                     marca, tipo, empresa_id)
                                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                                """, venta_pos_id, line.get('id'), product_id_val, product_name,
                                    line.get('product_code', ''), line.get('qty', 0),
                                    line.get('price_unit', 0), line.get('price_subtotal', 0),
                                    line.get('price_subtotal_incl', 0), line.get('discount', 0),
                                    line.get('marca', ''), line.get('tipo', ''), empresa_id)
                    except Exception as line_error:
                        logger.error(f"Error syncing lines for order {odoo_id}: {line_error}")
                    synced += 1
                except Exception as row_error:
                    logger.error(f"Error processing order {order.get('id')}: {row_error}")
                    continue
        return {"message": f"Synced {synced} orders from {company}", "synced": synced}
    except Exception as e:
        logger.error(f"Error syncing from Odoo: {e}")
        raise HTTPException(500, f"Error syncing: {str(e)}")


@router.post("/ventas-pos/{id}/confirmar")
async def confirmar_venta_pos(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        venta = await conn.fetchrow("SELECT * FROM finanzas2.cont_venta_pos WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not venta:
            raise HTTPException(404, "Venta not found")
        if venta['estado_local'] in ['confirmada', 'credito', 'descartada']:
            raise HTTPException(400, f"Venta already {venta['estado_local']}")
        await conn.execute("UPDATE finanzas2.cont_venta_pos SET estado_local = 'confirmada' WHERE id = $1", id)
        return {"message": "Venta confirmada"}


@router.post("/ventas-pos/{id}/credito")
async def marcar_credito_venta_pos(id: int, fecha_vencimiento: Optional[date] = None, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            venta = await conn.fetchrow("SELECT * FROM finanzas2.cont_venta_pos WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not venta:
                raise HTTPException(404, "Venta not found")
            cxc = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_cxc
                (venta_pos_id, monto_original, saldo_pendiente, fecha_vencimiento, estado, empresa_id)
                VALUES ($1, $2, $2, TO_DATE($3, 'YYYY-MM-DD'), 'pendiente', $4)
                RETURNING id
            """, id, venta['amount_total'], safe_date_param(fecha_vencimiento or (datetime.now().date() + timedelta(days=30))), empresa_id)
            await conn.execute("UPDATE finanzas2.cont_venta_pos SET estado_local = 'credito', cxc_id = $1, is_credit = TRUE WHERE id = $2", cxc['id'], id)
            return {"message": "Venta marcada como credito", "cxc_id": cxc['id']}


@router.post("/ventas-pos/{id}/descartar")
async def descartar_venta_pos(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        await conn.execute("UPDATE finanzas2.cont_venta_pos SET estado_local = 'descartada', is_cancel = TRUE WHERE id = $1", id)
        return {"message": "Venta descartada"}


@router.post("/ventas-pos/{id}/desconfirmar")
async def desconfirmar_venta_pos(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            venta = await conn.fetchrow("SELECT * FROM finanzas2.cont_venta_pos WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not venta:
                raise HTTPException(404, "Venta not found")
            if venta['estado_local'] != 'confirmada':
                raise HTTPException(400, f"La venta debe estar confirmada para desconfirmarla. Estado actual: {venta['estado_local']}")
            pagos_oficiales = await conn.fetch("""
                SELECT p.id as pago_id, pd.medio_pago, pd.monto, pd.referencia,
                       p.fecha, pd.cuenta_financiera_id, p.notas
                FROM finanzas2.cont_pago_aplicacion pa
                JOIN finanzas2.cont_pago p ON p.id = pa.pago_id
                LEFT JOIN finanzas2.cont_pago_detalle pd ON pd.pago_id = p.id
                WHERE pa.tipo_documento = 'venta_pos' AND pa.documento_id = $1
            """, id)
            await conn.execute("DELETE FROM finanzas2.cont_venta_pos_pago WHERE venta_pos_id = $1", id)
            if pagos_oficiales:
                for pago in pagos_oficiales:
                    await conn.execute("""
                        INSERT INTO finanzas2.cont_venta_pos_pago
                        (venta_pos_id, forma_pago, cuenta_financiera_id, monto, referencia, fecha_pago, observaciones, empresa_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """, id, pago['medio_pago'], pago['cuenta_financiera_id'],
                        pago['monto'], pago['referencia'], pago['fecha'],
                        pago['notas'] or 'Pago restaurado desde confirmacion', empresa_id)
                pago_ids = list(set(p['pago_id'] for p in pagos_oficiales))
                for pago_id in pago_ids:
                    await conn.execute("DELETE FROM finanzas2.cont_pago WHERE id = $1", pago_id)
            await conn.execute("UPDATE finanzas2.cont_venta_pos SET estado_local = 'pendiente' WHERE id = $1", id)
            return {"message": "Venta desconfirmada exitosamente", "pagos_restaurados": len(pagos_oficiales), "nuevo_estado": "pendiente"}


@router.get("/ventas-pos/{id}/pagos")
async def get_pagos_venta_pos(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        pagos = await conn.fetch("""
            SELECT id, venta_pos_id, forma_pago, monto, referencia, fecha_pago, observaciones, created_at
            FROM finanzas2.cont_venta_pos_pago WHERE venta_pos_id = $1 ORDER BY created_at DESC
        """, id)
        return [dict(p) for p in pagos]


@router.get("/ventas-pos/{id}/pagos-oficiales")
async def get_pagos_oficiales_venta_pos(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        pagos = await conn.fetch("""
            SELECT p.id, p.numero, p.fecha, pd.medio_pago as forma_pago, pd.monto,
                   pd.referencia, p.notas as observaciones, cf.nombre as cuenta_nombre
            FROM finanzas2.cont_pago_aplicacion pa
            JOIN finanzas2.cont_pago p ON p.id = pa.pago_id
            LEFT JOIN finanzas2.cont_pago_detalle pd ON pd.pago_id = p.id
            LEFT JOIN finanzas2.cont_cuenta_financiera cf ON cf.id = pd.cuenta_financiera_id
            WHERE pa.tipo_documento = 'venta_pos' AND pa.documento_id = $1
            ORDER BY p.fecha DESC, p.id DESC
        """, id)
        return [dict(p) for p in pagos]


@router.get("/ventas-pos/{id}/lineas")
async def get_lineas_venta_pos(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        lineas = await conn.fetch("""
            SELECT id, product_name, product_code, qty, price_unit, price_subtotal, price_subtotal_incl, discount, marca, tipo
            FROM finanzas2.cont_venta_pos_linea WHERE venta_pos_id = $1 ORDER BY id ASC
        """, id)
        return [dict(l) for l in lineas]


@router.post("/ventas-pos/{id}/pagos")
async def add_pago_venta_pos(id: int, pago: dict, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            venta = await conn.fetchrow("SELECT * FROM finanzas2.cont_venta_pos WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not venta:
                raise HTTPException(404, "Venta not found")
            if venta['estado_local'] != 'pendiente':
                raise HTTPException(400, f"Venta already {venta['estado_local']}")
            await conn.execute("""
                INSERT INTO finanzas2.cont_venta_pos_pago
                (venta_pos_id, forma_pago, cuenta_financiera_id, monto, referencia, fecha_pago, observaciones, empresa_id)
                VALUES ($1, $2, $3, $4, $5, TO_DATE($6, 'YYYY-MM-DD'), $7, $8)
            """, id, pago.get('forma_pago'), int(pago.get('cuenta_financiera_id')), pago.get('monto'),
                pago.get('referencia'), pago.get('fecha_pago'), pago.get('observaciones'), empresa_id)
            total_pagos = await conn.fetchval("SELECT COALESCE(SUM(monto), 0) FROM finanzas2.cont_venta_pos_pago WHERE venta_pos_id = $1", id)
            amount_total = float(venta['amount_total'])
            if abs(float(total_pagos) - amount_total) < 0.01:
                await conn.execute("UPDATE finanzas2.cont_venta_pos SET estado_local = 'confirmada' WHERE id = $1", id)
                pagos_venta = await conn.fetch("SELECT * FROM finanzas2.cont_venta_pos_pago WHERE venta_pos_id = $1", id)
                for pago_item in pagos_venta:
                    last_pago = await conn.fetchval("SELECT numero FROM finanzas2.cont_pago WHERE tipo = 'ingreso' ORDER BY id DESC LIMIT 1")
                    if last_pago and '-' in last_pago:
                        parts = last_pago.split('-')
                        num = int(parts[-1]) + 1 if len(parts) >= 3 else 1
                    else:
                        num = 1
                    numero_pago = f"PAG-I-{datetime.now().year}-{num:05d}"
                    pago_result = await conn.fetchrow("""
                        INSERT INTO finanzas2.cont_pago
                        (numero, tipo, fecha, cuenta_financiera_id, moneda_id, monto_total, referencia, notas, empresa_id)
                        VALUES ($1, 'ingreso', $2::date, $3, 1, $4, $5, $6, $7)
                        RETURNING id
                    """, numero_pago, pago_item['fecha_pago'], pago_item['cuenta_financiera_id'],
                        pago_item['monto'], pago_item['referencia'],
                        f"Pago de venta POS {venta['name']} - {pago_item['observaciones'] or ''}", empresa_id)
                    pago_id_new = pago_result['id']
                    await conn.execute("""
                        INSERT INTO finanzas2.cont_pago_detalle
                        (pago_id, cuenta_financiera_id, medio_pago, monto, referencia, empresa_id)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    """, pago_id_new, pago_item['cuenta_financiera_id'], pago_item['forma_pago'],
                        pago_item['monto'], pago_item['referencia'], empresa_id)
                    await conn.execute("""
                        INSERT INTO finanzas2.cont_pago_aplicacion
                        (pago_id, tipo_documento, documento_id, monto_aplicado, empresa_id)
                        VALUES ($1, 'venta_pos', $2, $3, $4)
                    """, pago_id_new, id, pago_item['monto'], empresa_id)
                return {"message": "Pago agregado y venta confirmada automaticamente", "total_pagos": float(total_pagos), "auto_confirmed": True, "pagos_registrados": len(pagos_venta)}
            return {"message": "Pago agregado", "total_pagos": float(total_pagos), "faltante": amount_total - float(total_pagos), "auto_confirmed": False}


@router.put("/ventas-pos/{venta_id}/pagos/{pago_id}")
async def update_pago_venta_pos(venta_id: int, pago_id: int, pago: dict, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        try:
            await conn.execute("""
                UPDATE finanzas2.cont_venta_pos_pago
                SET forma_pago=$1, cuenta_financiera_id=$2, monto=$3, referencia=$4, fecha_pago=TO_DATE($5, 'YYYY-MM-DD'), observaciones=$6
                WHERE id = $7 AND venta_pos_id = $8
            """, pago['forma_pago'], pago.get('cuenta_financiera_id'),
                pago['monto'], pago.get('referencia'),
                pago.get('fecha_pago'), pago.get('observaciones'), pago_id, venta_id)
            return {"message": "Pago actualizado correctamente"}
        except Exception as e:
            logger.error(f"Error updating payment: {e}")
            raise HTTPException(500, f"Error al actualizar pago: {str(e)}")


@router.delete("/ventas-pos/{venta_id}/pagos/{pago_id}")
async def delete_pago_venta_pos(venta_id: int, pago_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        await conn.execute("DELETE FROM finanzas2.cont_venta_pos_pago WHERE id = $1 AND venta_pos_id = $2", pago_id, venta_id)
        return {"message": "Pago eliminado"}
