from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import date, datetime, timedelta
from database import get_pool
from dependencies import get_empresa_id, safe_date_param
import logging
import math
import os
import httpx

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_odoo_config():
    url = os.environ.get('ODOO_MODULE_BASE_URL', '').rstrip('/')
    token = os.environ.get('ODOO_SYNC_TOKEN', '')
    return url, token


async def get_company_key(conn, empresa_id: int) -> Optional[str]:
    """Get odoo company_key for an empresa_id. Returns None if no mapping."""
    row = await conn.fetchrow(
        "SELECT company_key FROM finanzas2.cont_empresa_odoo_map WHERE empresa_id = $1",
        empresa_id)
    return row['company_key'] if row else None


# =====================
# CONFIG: Odoo Company Mapping
# =====================
@router.get("/config/odoo-company-map")
async def get_odoo_company_map(empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM finanzas2.cont_empresa_odoo_map WHERE empresa_id = $1", empresa_id)
        if not row:
            return {"empresa_id": empresa_id, "company_key": None}
        return dict(row)


@router.put("/config/odoo-company-map")
async def set_odoo_company_map(data: dict, empresa_id: int = Depends(get_empresa_id)):
    company_key = data.get('company_key')
    if not company_key:
        raise HTTPException(400, "company_key es requerido")
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO finanzas2.cont_empresa_odoo_map (empresa_id, company_key)
            VALUES ($1, $2)
            ON CONFLICT (empresa_id) DO UPDATE SET company_key = $2, updated_at = NOW()
        """, empresa_id, company_key)
        return {"empresa_id": empresa_id, "company_key": company_key}


# =====================
# VENTAS POS — REFRESH (proxy to Odoo module sync)
# =====================
@router.post("/ventas-pos/refresh")
async def refresh_ventas_pos(
    body: dict = None,
    empresa_id: int = Depends(get_empresa_id),
):
    """Trigger sync in the Odoo module, then return sync metrics."""
    odoo_url, odoo_token = _get_odoo_config()

    if not odoo_url:
        raise HTTPException(503, "ODOO_MODULE_BASE_URL no configurada. Configure la variable de entorno.")

    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

    if not company_key:
        raise HTTPException(400, detail={
            "error": "MISSING_ODOO_COMPANY_KEY",
            "message": "No hay mapeo empresa - company_key configurado."
        })

    desde = body.get('desde') if body else None
    hasta = body.get('hasta') if body else None

    payload = {"company_key": company_key}
    if desde:
        payload["desde"] = desde
    if hasta:
        payload["hasta"] = hasta

    url = f"{odoo_url}/api/sync/pos"
    headers = {"X-Internal-Token": odoo_token, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            result = resp.json()
            return {
                "ok": True,
                "message": result.get("message", "Sync completado"),
                "inserted": result.get("inserted_orders", result.get("inserted", 0)),
                "updated": result.get("updated_orders", result.get("updated", 0)),
                "last_sync_at": result.get("last_sync_at"),
                "company_key": company_key
            }
    except httpx.ConnectError:
        raise HTTPException(502, "No se pudo conectar con el modulo Odoo. Verifique ODOO_MODULE_BASE_URL.")
    except httpx.HTTPStatusError as e:
        detail = e.response.text[:500] if e.response else str(e)
        raise HTTPException(e.response.status_code if e.response else 502, f"Error del modulo Odoo: {detail}")
    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout al conectar con el modulo Odoo. El sync puede estar tomando mucho tiempo.")
    except Exception as e:
        logger.error(f"Error calling Odoo sync: {e}")
        raise HTTPException(502, f"Error inesperado al llamar al modulo Odoo: {str(e)}")


# =====================
# VENTAS POS — LIST
# =====================
@router.get("/ventas-pos")
async def list_ventas_pos(
    estado: Optional[str] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    search: Optional[str] = None,
    include_cancelled: bool = False,
    page: int = 1,
    page_size: int = 50,
    empresa_id: int = Depends(get_empresa_id),
):
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 200:
        page_size = 50

    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            return await _list_from_odoo(conn, empresa_id, company_key,
                                         estado, fecha_desde, fecha_hasta,
                                         search, include_cancelled, page, page_size)
        else:
            return {
                "error_code": "MISSING_ODOO_COMPANY_KEY",
                "message": "No hay mapeo empresa - company_key configurado. Configure el mapeo para poder ver ventas POS desde Odoo.",
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0
            }


async def _list_from_odoo(conn, empresa_id, company_key,
                           estado, fecha_desde, fecha_hasta, search, include_cancelled,
                           page, page_size):
    """Read orders from odoo.v_pos_order_enriched + local estado, with pagination."""
    conditions = ["o.company_key = $1"]
    params = [company_key]
    idx = 2

    if not include_cancelled:
        conditions.append("o.is_cancelled = FALSE")

    if fecha_desde:
        conditions.append(f"o.date_order >= ${idx}")
        params.append(datetime.combine(fecha_desde, datetime.min.time()))
        idx += 1
    if fecha_hasta:
        conditions.append(f"o.date_order <= ${idx}")
        params.append(datetime.combine(fecha_hasta, datetime.max.time()))
        idx += 1
    if search:
        conditions.append(f"(p.name ILIKE ${idx} OR u.name ILIKE ${idx})")
        params.append(f"%{search}%")
        idx += 1

    estado_filter = ""
    if estado:
        if estado == 'pendiente':
            estado_filter = f" AND COALESCE(e.estado_local, 'pendiente') = 'pendiente'"
        else:
            estado_filter = f" AND e.estado_local = ${idx}"
            params.append(estado)
            idx += 1

    from_clause = f"""
        FROM odoo.v_pos_order_enriched o
        LEFT JOIN odoo.res_partner p
            ON p.odoo_id = o.cuenta_partner_id AND p.company_key = 'GLOBAL'
        LEFT JOIN odoo.res_users u
            ON u.odoo_id = o.user_id AND u.company_key = 'GLOBAL'
        LEFT JOIN finanzas2.cont_venta_pos_estado e
            ON e.odoo_order_id = o.odoo_order_id AND e.empresa_id = {empresa_id}
        WHERE {' AND '.join(conditions)}
        {estado_filter}
    """

    # Count total + max date
    count_query = f"SELECT COUNT(*), MAX(o.date_order) {from_clause}"
    row_agg = await conn.fetchrow(count_query, *params)
    total = row_agg[0]
    max_date_order = row_agg[1]

    offset = (page - 1) * page_size

    query = f"""
        SELECT
            o.odoo_order_id,
            o.date_order,
            o.amount_total,
            o.state,
            o.is_cancelled,
            o.reserva,
            o.reserva_use_id,
            o.cuenta_partner_id,
            o.contacto_partner_id,
            o.user_id,
            p.name AS partner_name,
            u.name AS vendedor_name,
            COALESCE(e.estado_local, 'pendiente') AS estado_local,
            e.notas AS estado_notas,
            e.cxc_id,
            COALESCE(
                (SELECT SUM(vp.monto) FROM finanzas2.cont_venta_pos_pago vp
                 WHERE vp.odoo_order_id = o.odoo_order_id AND vp.empresa_id = {empresa_id}), 0
            ) AS pagos_asignados,
            COALESCE(
                (SELECT COUNT(*) FROM finanzas2.cont_venta_pos_pago vp
                 WHERE vp.odoo_order_id = o.odoo_order_id AND vp.empresa_id = {empresa_id}), 0
            ) AS num_pagos,
            COALESCE(
                (SELECT SUM(pa.monto_aplicado) FROM finanzas2.cont_pago_aplicacion pa
                 WHERE pa.tipo_documento = 'venta_pos_odoo' AND pa.documento_id = o.odoo_order_id
                   AND pa.empresa_id = {empresa_id}), 0
            ) AS pagos_oficiales,
            COALESCE(
                (SELECT COUNT(*) FROM finanzas2.cont_pago_aplicacion pa
                 WHERE pa.tipo_documento = 'venta_pos_odoo' AND pa.documento_id = o.odoo_order_id
                   AND pa.empresa_id = {empresa_id}), 0
            ) AS num_pagos_oficiales
        {from_clause}
        ORDER BY o.date_order DESC
        LIMIT {page_size} OFFSET {offset}
    """
    rows = await conn.fetch(query, *params)
    result = []
    for r in rows:
        result.append({
            "id": r['odoo_order_id'],
            "odoo_order_id": r['odoo_order_id'],
            "date_order": r['date_order'].isoformat() if r['date_order'] else None,
            "amount_total": float(r['amount_total'] or 0),
            "state": r['state'],
            "is_cancelled": r['is_cancelled'],
            "reserva": r['reserva'],
            "partner_name": r['partner_name'] or '-',
            "vendedor_name": r['vendedor_name'] or '-',
            "estado_local": r['estado_local'],
            "pagos_asignados": float(r['pagos_asignados']),
            "num_pagos": r['num_pagos'],
            "pagos_oficiales": float(r['pagos_oficiales']),
            "num_pagos_oficiales": r['num_pagos_oficiales'],
            "cxc_id": r['cxc_id'],
            # Compat fields for frontend
            "name": f"POS-{r['odoo_order_id']}",
            "tipo_comp": None,
            "num_comp": None,
            "company_name": None,
            "tienda_name": None,
            "x_pagos": None,
            "source": "odoo",
        })
    return {
        "data": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if page_size > 0 else 0,
        "max_date_order": max_date_order.isoformat() if max_date_order else None
    }


# =====================
# VENTAS POS — LINEAS (on-demand)
# =====================
@router.get("/ventas-pos/{order_id}/lineas")
async def get_lineas_venta_pos(order_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            rows = await conn.fetch("""
                SELECT
                    l.pos_order_line_id AS id,
                    l.product_id,
                    l.qty,
                    l.price_unit,
                    l.discount,
                    l.price_subtotal,
                    l.price_subtotal AS price_subtotal_incl,
                    l.barcode AS product_code,
                    COALESCE(l.barcode, '') AS product_name,
                    l.marca,
                    l.tipo,
                    l.talla,
                    l.color,
                    l.tela,
                    l.entalle,
                    l.list_price
                FROM odoo.v_pos_line_full l
                WHERE l.order_id = $1 AND l.company_key = $2
                ORDER BY l.pos_order_line_id ASC
            """, order_id, company_key)
            return [dict(r) for r in rows]
        else:
            # Fallback: legacy table
            await conn.execute("SET search_path TO finanzas2, public")
            rows = await conn.fetch("""
                SELECT id, product_name, product_code, qty, price_unit,
                       price_subtotal, price_subtotal_incl, discount, marca, tipo
                FROM finanzas2.cont_venta_pos_linea WHERE venta_pos_id = $1 ORDER BY id ASC
            """, order_id)
            return [dict(r) for r in rows]


# =====================
# VENTAS POS — CONFIRMAR / DESCARTAR / CREDITO
# =====================
@router.post("/ventas-pos/{order_id}/confirmar")
async def confirmar_venta_pos(order_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            # Verify order exists in odoo
            order = await conn.fetchrow(
                "SELECT amount_total FROM odoo.v_pos_order_enriched WHERE odoo_order_id=$1 AND company_key=$2",
                order_id, company_key)
            if not order:
                raise HTTPException(404, "Orden no encontrada en Odoo")
            estado = await conn.fetchrow(
                "SELECT estado_local FROM finanzas2.cont_venta_pos_estado WHERE odoo_order_id=$1 AND empresa_id=$2",
                order_id, empresa_id)
            if estado and estado['estado_local'] in ('confirmada', 'credito', 'descartada'):
                raise HTTPException(400, f"Venta ya tiene estado: {estado['estado_local']}")

            async with conn.transaction():
                await conn.execute("""
                    INSERT INTO finanzas2.cont_venta_pos_estado (empresa_id, odoo_order_id, estado_local, updated_at)
                    VALUES ($1, $2, 'confirmada', NOW())
                    ON CONFLICT (empresa_id, odoo_order_id)
                    DO UPDATE SET estado_local = 'confirmada', updated_at = NOW()
                """, empresa_id, order_id)

                # CAPA TESORERIA: Venta confirmada al contado -> movimiento de tesoreria
                amount = float(order['amount_total'] or 0)
                if amount > 0:
                    # Check if there are assigned pagos with cuenta_financiera
                    pagos = await conn.fetch(
                        "SELECT forma_pago, monto, cuenta_financiera_id FROM finanzas2.cont_venta_pos_pago WHERE odoo_order_id=$1 AND empresa_id=$2",
                        order_id, empresa_id)
                    from services.treasury_service import create_movimiento_tesoreria
                    if pagos:
                        for pago in pagos:
                            await create_movimiento_tesoreria(
                                conn, empresa_id, date.today(), 'ingreso', float(pago['monto']),
                                cuenta_financiera_id=pago['cuenta_financiera_id'],
                                forma_pago=pago['forma_pago'],
                                concepto=f"Venta POS #{order_id} confirmada",
                                origen_tipo='venta_pos_confirmada',
                                origen_id=order_id,
                            )
                    else:
                        # Single treasury entry for full amount
                        await create_movimiento_tesoreria(
                            conn, empresa_id, date.today(), 'ingreso', amount,
                            concepto=f"Venta POS #{order_id} confirmada",
                            origen_tipo='venta_pos_confirmada',
                            origen_id=order_id,
                        )

                    # Auto-create CxC if there's remaining balance (saldo_pendiente)
                    total_pagos = sum(float(p['monto']) for p in pagos) if pagos else 0
                    saldo_pendiente = amount - total_pagos
                    if saldo_pendiente > 0.01:
                        cxc = await conn.fetchrow("""
                            INSERT INTO finanzas2.cont_cxc
                            (empresa_id, venta_pos_id, monto_original, saldo_pendiente,
                             fecha_vencimiento, estado, tipo_origen, odoo_order_id)
                            VALUES ($1, $2, $3, $3, CURRENT_DATE + 30, 'pendiente', 'venta_pos_saldo', $2)
                            RETURNING id
                        """, empresa_id, order_id, saldo_pendiente)
                        await conn.execute("""
                            UPDATE finanzas2.cont_venta_pos_estado SET cxc_id = $1
                            WHERE odoo_order_id = $2 AND empresa_id = $3
                        """, cxc['id'], order_id, empresa_id)

            return {"message": "Venta confirmada"}
        else:
            # Fallback: legacy
            await conn.execute("SET search_path TO finanzas2, public")
            venta = await conn.fetchrow(
                "SELECT * FROM finanzas2.cont_venta_pos WHERE id=$1 AND empresa_id=$2",
                order_id, empresa_id)
            if not venta:
                raise HTTPException(404, "Venta not found")
            if venta['estado_local'] in ('confirmada', 'credito', 'descartada'):
                raise HTTPException(400, f"Venta already {venta['estado_local']}")
            await conn.execute(
                "UPDATE finanzas2.cont_venta_pos SET estado_local='confirmada' WHERE id=$1", order_id)
            return {"message": "Venta confirmada"}


@router.post("/ventas-pos/{order_id}/credito")
async def marcar_credito_venta_pos(
    order_id: int,
    fecha_vencimiento: Optional[date] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            order = await conn.fetchrow(
                "SELECT amount_total, cuenta_partner_id FROM odoo.v_pos_order_enriched WHERE odoo_order_id=$1 AND company_key=$2",
                order_id, company_key)
            if not order:
                raise HTTPException(404, "Orden no encontrada")

            # Check existing state
            estado = await conn.fetchrow(
                "SELECT estado_local FROM finanzas2.cont_venta_pos_estado WHERE odoo_order_id=$1 AND empresa_id=$2",
                order_id, empresa_id)
            if estado and estado['estado_local'] in ('confirmada', 'credito', 'descartada'):
                raise HTTPException(400, f"Venta ya tiene estado: {estado['estado_local']}")

            venc = fecha_vencimiento or (datetime.now().date() + timedelta(days=30))

            async with conn.transaction():
                # Auto-create CxC for full amount (obligation layer)
                cxc = await conn.fetchrow("""
                    INSERT INTO finanzas2.cont_cxc
                    (empresa_id, venta_pos_id, monto_original, saldo_pendiente,
                     fecha_vencimiento, estado, tipo_origen, odoo_order_id)
                    VALUES ($1, $2, $3, $3, $4, 'pendiente', 'venta_pos_credito', $2)
                    RETURNING id
                """, empresa_id, order_id, order['amount_total'], venc)

                await conn.execute("""
                    INSERT INTO finanzas2.cont_venta_pos_estado
                        (empresa_id, odoo_order_id, estado_local, cxc_id, updated_at)
                    VALUES ($1, $2, 'credito', $3, NOW())
                    ON CONFLICT (empresa_id, odoo_order_id)
                    DO UPDATE SET estado_local='credito', cxc_id=$3, updated_at=NOW()
                """, empresa_id, order_id, cxc['id'])

            # NOTE: No treasury movement for credit sales - cash hasn't moved
            return {"message": "Venta marcada como credito", "cxc_id": cxc['id']}
        else:
            # Fallback
            await conn.execute("SET search_path TO finanzas2, public")
            venta = await conn.fetchrow(
                "SELECT * FROM finanzas2.cont_venta_pos WHERE id=$1 AND empresa_id=$2",
                order_id, empresa_id)
            if not venta:
                raise HTTPException(404, "Venta not found")
            venc = fecha_vencimiento or (datetime.now().date() + timedelta(days=30))
            cxc = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_cxc
                (venta_pos_id, monto_original, saldo_pendiente, fecha_vencimiento, estado, empresa_id, tipo_origen)
                VALUES ($1, $2, $2, $3, 'pendiente', $4, 'venta_pos_credito')
                RETURNING id
            """, order_id, venta['amount_total'], venc, empresa_id)
            await conn.execute(
                "UPDATE finanzas2.cont_venta_pos SET estado_local='credito', cxc_id=$1, is_credit=TRUE WHERE id=$2",
                cxc['id'], order_id)
            return {"message": "Venta marcada como credito", "cxc_id": cxc['id']}


@router.post("/ventas-pos/{order_id}/descartar")
async def descartar_venta_pos(order_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            await conn.execute("""
                INSERT INTO finanzas2.cont_venta_pos_estado
                    (empresa_id, odoo_order_id, estado_local, updated_at)
                VALUES ($1, $2, 'descartada', NOW())
                ON CONFLICT (empresa_id, odoo_order_id)
                DO UPDATE SET estado_local='descartada', updated_at=NOW()
            """, empresa_id, order_id)
            return {"message": "Venta descartada"}
        else:
            await conn.execute("SET search_path TO finanzas2, public")
            await conn.execute(
                "UPDATE finanzas2.cont_venta_pos SET estado_local='descartada', is_cancel=TRUE WHERE id=$1",
                order_id)
            return {"message": "Venta descartada"}


@router.post("/ventas-pos/{order_id}/desconfirmar")
async def desconfirmar_venta_pos(order_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            estado = await conn.fetchrow(
                "SELECT estado_local FROM finanzas2.cont_venta_pos_estado WHERE odoo_order_id=$1 AND empresa_id=$2",
                order_id, empresa_id)
            if not estado or estado['estado_local'] != 'confirmada':
                raise HTTPException(400, f"La venta debe estar confirmada para desconfirmarla")

            # Reverse official pagos
            pagos_oficiales = await conn.fetch("""
                SELECT p.id as pago_id, pd.medio_pago, pd.monto, pd.referencia,
                       p.fecha, pd.cuenta_financiera_id, p.notas
                FROM finanzas2.cont_pago_aplicacion pa
                JOIN finanzas2.cont_pago p ON p.id = pa.pago_id
                LEFT JOIN finanzas2.cont_pago_detalle pd ON pd.pago_id = p.id
                WHERE pa.tipo_documento = 'venta_pos_odoo' AND pa.documento_id = $1 AND pa.empresa_id = $2
            """, order_id, empresa_id)

            # Restore pagos to venta_pos_pago
            await conn.execute(
                "DELETE FROM finanzas2.cont_venta_pos_pago WHERE odoo_order_id=$1 AND empresa_id=$2",
                order_id, empresa_id)
            if pagos_oficiales:
                for pago in pagos_oficiales:
                    await conn.execute("""
                        INSERT INTO finanzas2.cont_venta_pos_pago
                        (odoo_order_id, forma_pago, cuenta_financiera_id, monto, referencia,
                         fecha_pago, observaciones, empresa_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """, order_id, pago['medio_pago'], pago['cuenta_financiera_id'],
                        pago['monto'], pago['referencia'], pago['fecha'],
                        pago['notas'] or 'Pago restaurado desde confirmacion', empresa_id)
                pago_ids = list(set(p['pago_id'] for p in pagos_oficiales))
                for pid in pago_ids:
                    await conn.execute("DELETE FROM finanzas2.cont_pago WHERE id=$1", pid)

            await conn.execute("""
                UPDATE finanzas2.cont_venta_pos_estado
                SET estado_local='pendiente', updated_at=NOW()
                WHERE odoo_order_id=$1 AND empresa_id=$2
            """, order_id, empresa_id)

            # CAPA TESORERIA: Remove treasury movements for this sale
            from services.treasury_service import delete_movimientos_by_origen
            await delete_movimientos_by_origen(conn, empresa_id, 'venta_pos_confirmada', order_id)

            return {
                "message": "Venta desconfirmada exitosamente",
                "pagos_restaurados": len(pagos_oficiales),
                "nuevo_estado": "pendiente"
            }
        else:
            # Fallback: legacy desconfirmar
            await conn.execute("SET search_path TO finanzas2, public")
            async with conn.transaction():
                venta = await conn.fetchrow(
                    "SELECT * FROM finanzas2.cont_venta_pos WHERE id=$1 AND empresa_id=$2",
                    order_id, empresa_id)
                if not venta:
                    raise HTTPException(404, "Venta not found")
                if venta['estado_local'] != 'confirmada':
                    raise HTTPException(400, f"Estado actual: {venta['estado_local']}")
                pagos_oficiales = await conn.fetch("""
                    SELECT p.id as pago_id, pd.medio_pago, pd.monto, pd.referencia,
                           p.fecha, pd.cuenta_financiera_id, p.notas
                    FROM finanzas2.cont_pago_aplicacion pa
                    JOIN finanzas2.cont_pago p ON p.id = pa.pago_id
                    LEFT JOIN finanzas2.cont_pago_detalle pd ON pd.pago_id = p.id
                    WHERE pa.tipo_documento = 'venta_pos' AND pa.documento_id = $1
                """, order_id)
                await conn.execute(
                    "DELETE FROM finanzas2.cont_venta_pos_pago WHERE venta_pos_id=$1", order_id)
                if pagos_oficiales:
                    for pago in pagos_oficiales:
                        await conn.execute("""
                            INSERT INTO finanzas2.cont_venta_pos_pago
                            (venta_pos_id, forma_pago, cuenta_financiera_id, monto, referencia,
                             fecha_pago, observaciones, empresa_id)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        """, order_id, pago['medio_pago'], pago['cuenta_financiera_id'],
                            pago['monto'], pago['referencia'], pago['fecha'],
                            pago['notas'] or 'Pago restaurado', empresa_id)
                    pago_ids = list(set(p['pago_id'] for p in pagos_oficiales))
                    for pid in pago_ids:
                        await conn.execute("DELETE FROM finanzas2.cont_pago WHERE id=$1", pid)
                await conn.execute(
                    "UPDATE finanzas2.cont_venta_pos SET estado_local='pendiente' WHERE id=$1", order_id)
                return {"message": "Venta desconfirmada", "pagos_restaurados": len(pagos_oficiales)}


# =====================
# VENTAS POS — PAGOS
# =====================
@router.get("/ventas-pos/{order_id}/pagos")
async def get_pagos_venta_pos(order_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            pagos = await conn.fetch("""
                SELECT id, odoo_order_id as venta_pos_id, forma_pago, monto, referencia,
                       fecha_pago, observaciones, created_at
                FROM finanzas2.cont_venta_pos_pago
                WHERE odoo_order_id = $1 AND empresa_id = $2
                ORDER BY created_at DESC
            """, order_id, empresa_id)
            return [dict(p) for p in pagos]
        else:
            await conn.execute("SET search_path TO finanzas2, public")
            pagos = await conn.fetch("""
                SELECT id, venta_pos_id, forma_pago, monto, referencia, fecha_pago, observaciones, created_at
                FROM finanzas2.cont_venta_pos_pago WHERE venta_pos_id = $1 ORDER BY created_at DESC
            """, order_id)
            return [dict(p) for p in pagos]


@router.get("/ventas-pos/{order_id}/pagos-oficiales")
async def get_pagos_oficiales_venta_pos(order_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)
        tipo_doc = 'venta_pos_odoo' if company_key else 'venta_pos'

        pagos = await conn.fetch(f"""
            SELECT p.id, p.numero, p.fecha, pd.medio_pago as forma_pago, pd.monto,
                   pd.referencia, p.notas as observaciones, cf.nombre as cuenta_nombre
            FROM finanzas2.cont_pago_aplicacion pa
            JOIN finanzas2.cont_pago p ON p.id = pa.pago_id
            LEFT JOIN finanzas2.cont_pago_detalle pd ON pd.pago_id = p.id
            LEFT JOIN finanzas2.cont_cuenta_financiera cf ON cf.id = pd.cuenta_financiera_id
            WHERE pa.tipo_documento = $1 AND pa.documento_id = $2 AND pa.empresa_id = $3
            ORDER BY p.fecha DESC, p.id DESC
        """, tipo_doc, order_id, empresa_id)
        return [dict(p) for p in pagos]


@router.post("/ventas-pos/{order_id}/pagos")
async def add_pago_venta_pos(order_id: int, pago: dict, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            order = await conn.fetchrow(
                "SELECT amount_total FROM odoo.v_pos_order_enriched WHERE odoo_order_id=$1 AND company_key=$2",
                order_id, company_key)
            if not order:
                raise HTTPException(404, "Orden no encontrada")

            estado = await conn.fetchrow(
                "SELECT estado_local FROM finanzas2.cont_venta_pos_estado WHERE odoo_order_id=$1 AND empresa_id=$2",
                order_id, empresa_id)
            if estado and estado['estado_local'] != 'pendiente':
                raise HTTPException(400, f"Venta ya tiene estado: {estado['estado_local']}")

            await conn.execute("""
                INSERT INTO finanzas2.cont_venta_pos_pago
                (odoo_order_id, forma_pago, cuenta_financiera_id, monto, referencia,
                 fecha_pago, observaciones, empresa_id)
                VALUES ($1, $2, $3, $4, $5, TO_DATE($6, 'YYYY-MM-DD'), $7, $8)
            """, order_id, pago.get('forma_pago'), int(pago.get('cuenta_financiera_id')),
                pago.get('monto'), pago.get('referencia'),
                pago.get('fecha_pago'), pago.get('observaciones'), empresa_id)

            total_pagos = await conn.fetchval(
                "SELECT COALESCE(SUM(monto), 0) FROM finanzas2.cont_venta_pos_pago WHERE odoo_order_id=$1 AND empresa_id=$2",
                order_id, empresa_id)
            amount_total = float(order['amount_total'])

            if abs(float(total_pagos) - amount_total) < 0.01:
                # Auto-confirm and create official pagos
                await conn.execute("""
                    INSERT INTO finanzas2.cont_venta_pos_estado
                        (empresa_id, odoo_order_id, estado_local, updated_at)
                    VALUES ($1, $2, 'confirmada', NOW())
                    ON CONFLICT (empresa_id, odoo_order_id)
                    DO UPDATE SET estado_local='confirmada', updated_at=NOW()
                """, empresa_id, order_id)

                pagos_venta = await conn.fetch(
                    "SELECT * FROM finanzas2.cont_venta_pos_pago WHERE odoo_order_id=$1 AND empresa_id=$2",
                    order_id, empresa_id)
                for pago_item in pagos_venta:
                    last_pago = await conn.fetchval(
                        "SELECT numero FROM finanzas2.cont_pago WHERE tipo='ingreso' AND empresa_id=$1 ORDER BY id DESC LIMIT 1",
                        empresa_id)
                    if last_pago and '-' in last_pago:
                        parts = last_pago.split('-')
                        num = int(parts[-1]) + 1 if len(parts) >= 3 else 1
                    else:
                        num = 1
                    numero_pago = f"PAG-I-{datetime.now().year}-{num:05d}"
                    pago_result = await conn.fetchrow("""
                        INSERT INTO finanzas2.cont_pago
                        (numero, tipo, fecha, cuenta_financiera_id, moneda_id, monto_total,
                         referencia, notas, empresa_id)
                        VALUES ($1, 'ingreso', $2::date, $3, 1, $4, $5, $6, $7)
                        RETURNING id
                    """, numero_pago, pago_item['fecha_pago'], pago_item['cuenta_financiera_id'],
                        pago_item['monto'], pago_item['referencia'],
                        f"Pago venta POS Odoo #{order_id} - {pago_item['observaciones'] or ''}",
                        empresa_id)
                    pago_id = pago_result['id']
                    await conn.execute("""
                        INSERT INTO finanzas2.cont_pago_detalle
                        (pago_id, cuenta_financiera_id, medio_pago, monto, referencia, empresa_id)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    """, pago_id, pago_item['cuenta_financiera_id'], pago_item['forma_pago'],
                        pago_item['monto'], pago_item['referencia'], empresa_id)
                    await conn.execute("""
                        INSERT INTO finanzas2.cont_pago_aplicacion
                        (pago_id, tipo_documento, documento_id, monto_aplicado, empresa_id)
                        VALUES ($1, 'venta_pos_odoo', $2, $3, $4)
                    """, pago_id, order_id, pago_item['monto'], empresa_id)

                return {
                    "message": "Pago agregado y venta confirmada automaticamente",
                    "total_pagos": float(total_pagos),
                    "auto_confirmed": True,
                    "pagos_registrados": len(pagos_venta)
                }

            return {
                "message": "Pago agregado",
                "total_pagos": float(total_pagos),
                "faltante": amount_total - float(total_pagos),
                "auto_confirmed": False
            }
        else:
            # Fallback: legacy flow
            await conn.execute("SET search_path TO finanzas2, public")
            async with conn.transaction():
                venta = await conn.fetchrow(
                    "SELECT * FROM finanzas2.cont_venta_pos WHERE id=$1 AND empresa_id=$2",
                    order_id, empresa_id)
                if not venta:
                    raise HTTPException(404, "Venta not found")
                if venta['estado_local'] != 'pendiente':
                    raise HTTPException(400, f"Venta already {venta['estado_local']}")
                await conn.execute("""
                    INSERT INTO finanzas2.cont_venta_pos_pago
                    (venta_pos_id, forma_pago, cuenta_financiera_id, monto, referencia,
                     fecha_pago, observaciones, empresa_id)
                    VALUES ($1, $2, $3, $4, $5, TO_DATE($6, 'YYYY-MM-DD'), $7, $8)
                """, order_id, pago.get('forma_pago'), int(pago.get('cuenta_financiera_id')),
                    pago.get('monto'), pago.get('referencia'),
                    pago.get('fecha_pago'), pago.get('observaciones'), empresa_id)
                total_pagos = await conn.fetchval(
                    "SELECT COALESCE(SUM(monto), 0) FROM finanzas2.cont_venta_pos_pago WHERE venta_pos_id=$1",
                    order_id)
                amount_total = float(venta['amount_total'])
                if abs(float(total_pagos) - amount_total) < 0.01:
                    await conn.execute(
                        "UPDATE finanzas2.cont_venta_pos SET estado_local='confirmada' WHERE id=$1", order_id)
                    pagos_venta = await conn.fetch(
                        "SELECT * FROM finanzas2.cont_venta_pos_pago WHERE venta_pos_id=$1", order_id)
                    for pago_item in pagos_venta:
                        last_pago = await conn.fetchval(
                            "SELECT numero FROM finanzas2.cont_pago WHERE tipo='ingreso' ORDER BY id DESC LIMIT 1")
                        if last_pago and '-' in last_pago:
                            parts = last_pago.split('-')
                            num = int(parts[-1]) + 1 if len(parts) >= 3 else 1
                        else:
                            num = 1
                        numero_pago = f"PAG-I-{datetime.now().year}-{num:05d}"
                        pago_result = await conn.fetchrow("""
                            INSERT INTO finanzas2.cont_pago
                            (numero, tipo, fecha, cuenta_financiera_id, moneda_id, monto_total,
                             referencia, notas, empresa_id)
                            VALUES ($1, 'ingreso', $2::date, $3, 1, $4, $5, $6, $7)
                            RETURNING id
                        """, numero_pago, pago_item['fecha_pago'],
                            pago_item['cuenta_financiera_id'],
                            pago_item['monto'], pago_item['referencia'],
                            f"Pago venta POS {venta['name']} - {pago_item['observaciones'] or ''}",
                            empresa_id)
                        pago_id = pago_result['id']
                        await conn.execute("""
                            INSERT INTO finanzas2.cont_pago_detalle
                            (pago_id, cuenta_financiera_id, medio_pago, monto, referencia, empresa_id)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        """, pago_id, pago_item['cuenta_financiera_id'],
                            pago_item['forma_pago'], pago_item['monto'],
                            pago_item['referencia'], empresa_id)
                        await conn.execute("""
                            INSERT INTO finanzas2.cont_pago_aplicacion
                            (pago_id, tipo_documento, documento_id, monto_aplicado, empresa_id)
                            VALUES ($1, 'venta_pos', $2, $3, $4)
                        """, pago_id, order_id, pago_item['monto'], empresa_id)
                    return {
                        "message": "Pago agregado y venta confirmada automaticamente",
                        "total_pagos": float(total_pagos), "auto_confirmed": True,
                        "pagos_registrados": len(pagos_venta)
                    }
                return {
                    "message": "Pago agregado",
                    "total_pagos": float(total_pagos),
                    "faltante": amount_total - float(total_pagos),
                    "auto_confirmed": False
                }


@router.put("/ventas-pos/{order_id}/pagos/{pago_id}")
async def update_pago_venta_pos(order_id: int, pago_id: int, pago: dict, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            await conn.execute("""
                UPDATE finanzas2.cont_venta_pos_pago
                SET forma_pago=$1, cuenta_financiera_id=$2, monto=$3, referencia=$4,
                    fecha_pago=TO_DATE($5, 'YYYY-MM-DD'), observaciones=$6
                WHERE id=$7 AND odoo_order_id=$8 AND empresa_id=$9
            """, pago['forma_pago'], pago.get('cuenta_financiera_id'),
                pago['monto'], pago.get('referencia'),
                pago.get('fecha_pago'), pago.get('observaciones'),
                pago_id, order_id, empresa_id)
        else:
            await conn.execute("""
                UPDATE finanzas2.cont_venta_pos_pago
                SET forma_pago=$1, cuenta_financiera_id=$2, monto=$3, referencia=$4,
                    fecha_pago=TO_DATE($5, 'YYYY-MM-DD'), observaciones=$6
                WHERE id=$7 AND venta_pos_id=$8
            """, pago['forma_pago'], pago.get('cuenta_financiera_id'),
                pago['monto'], pago.get('referencia'),
                pago.get('fecha_pago'), pago.get('observaciones'),
                pago_id, order_id)
        return {"message": "Pago actualizado correctamente"}


@router.delete("/ventas-pos/{order_id}/pagos/{pago_id}")
async def delete_pago_venta_pos(order_id: int, pago_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)

        if company_key:
            await conn.execute(
                "DELETE FROM finanzas2.cont_venta_pos_pago WHERE id=$1 AND odoo_order_id=$2 AND empresa_id=$3",
                pago_id, order_id, empresa_id)
        else:
            await conn.execute(
                "DELETE FROM finanzas2.cont_venta_pos_pago WHERE id=$1 AND venta_pos_id=$2",
                pago_id, order_id)
        return {"message": "Pago eliminado"}
