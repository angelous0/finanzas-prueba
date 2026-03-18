"""POS Sync: Configuración Odoo, sincronización local y refresh."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import date, datetime
from database import get_pool
from dependencies import get_empresa_id
from routers.pos_common import get_company_key
import logging
import os
import httpx

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_odoo_config():
    url = os.environ.get('ODOO_MODULE_BASE_URL', '').rstrip('/')
    token = os.environ.get('ODOO_SYNC_TOKEN', '')
    return url, token


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
# VENTAS POS — SYNC TO LOCAL (copy from Odoo schema to local tables)
# =====================
@router.post("/ventas-pos/sync-local")
async def sync_to_local(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    """Copy POS data from Odoo schema to local finanzas2 tables."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        company_key = await get_company_key(conn, empresa_id)
        if not company_key:
            raise HTTPException(400, "Empresa no tiene company_key configurado")
        fd = datetime.combine(fecha_desde, datetime.min.time()) if fecha_desde else None
        fh = datetime.combine(fecha_hasta, datetime.max.time()) if fecha_hasta else None
        await _sync_odoo_to_local(conn, empresa_id, company_key, fd, fh)
        local_orders = await conn.fetchval(
            "SELECT COUNT(*) FROM finanzas2.cont_venta_pos WHERE empresa_id = $1", empresa_id)
        local_lines = await conn.fetchval(
            "SELECT COUNT(*) FROM finanzas2.cont_venta_pos_linea WHERE empresa_id = $1", empresa_id)
        return {"message": "Sync completado", "orders": local_orders, "lines": local_lines}


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
            # 1. Sync products first
            products_synced = {"product_template": 0, "product_product": 0}
            try:
                prod_resp = await client.post(
                    f"{odoo_url}/api/sync/products",
                    json={"company_key": company_key},
                    headers=headers)
                if prod_resp.status_code == 200:
                    prod_result = prod_resp.json()
                    products_synced = {
                        "product_template": prod_result.get("product_template", prod_result.get("templates", 0)),
                        "product_product": prod_result.get("product_product", prod_result.get("variants", 0))
                    }
                    logger.info(f"Product sync OK: {products_synced}")
            except Exception as prod_err:
                logger.warning(f"Product sync skipped: {prod_err}")

            # 2. Sync POS orders
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            result = resp.json()

            # Sync from Odoo schema to local finanzas2 tables
            try:
                fd_sync = datetime.combine(datetime.strptime(desde, '%Y-%m-%d').date(), datetime.min.time()) if desde else None
                fh_sync = datetime.combine(datetime.strptime(hasta, '%Y-%m-%d').date(), datetime.max.time()) if hasta else None
                async with pool.acquire() as conn2:
                    await _sync_odoo_to_local(conn2, empresa_id, company_key, fd_sync, fh_sync)
            except Exception as sync_err:
                logger.error(f"Error syncing to local tables: {sync_err}")

            return {
                "ok": True,
                "message": result.get("message", "Sync completado"),
                "inserted": result.get("inserted_orders", result.get("inserted", 0)),
                "updated": result.get("updated_orders", result.get("updated", 0)),
                "last_sync_at": result.get("last_sync_at"),
                "company_key": company_key,
                "products_synced": products_synced
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


async def _sync_odoo_to_local(conn, empresa_id: int, company_key: str, fecha_desde=None, fecha_hasta=None):
    """Copia datos de esquema odoo a tablas locales finanzas2 (cont_venta_pos + cont_venta_pos_linea).
    Incluye product_name desde product_template y linea_negocio_id."""
    from datetime import timezone as tz

    date_filter = ""
    date_params = [company_key]
    idx = 2
    if fecha_desde:
        if hasattr(fecha_desde, 'tzinfo') and fecha_desde.tzinfo is None:
            fecha_desde = fecha_desde.replace(tzinfo=tz.utc)
        date_filter += f" AND o.date_order >= ${idx}"
        date_params.append(fecha_desde)
        idx += 1
    if fecha_hasta:
        if hasattr(fecha_hasta, 'tzinfo') and fecha_hasta.tzinfo is None:
            fecha_hasta = fecha_hasta.replace(tzinfo=tz.utc)
        date_filter += f" AND o.date_order <= ${idx}"
        date_params.append(fecha_hasta)
        idx += 1

    # 1. Sync orders: odoo.v_pos_order_enriched -> cont_venta_pos
    orders = await conn.fetch(f"""
        SELECT o.odoo_order_id, o.date_order, o.amount_total, o.state,
               o.is_cancelled, o.reserva, o.user_id,
               o.vendedor_id, o.vendedor_name,
               o.tipo_comp, o.num_comp, o.x_pagos, o.company_id,
               o.company_name,
               p.name AS partner_name,
               sl.x_nombre AS tienda_name, po.location_id AS tienda_id
        FROM odoo.v_pos_order_enriched o
        LEFT JOIN odoo.res_partner p ON p.odoo_id = o.cuenta_partner_id AND p.company_key = 'GLOBAL'
        LEFT JOIN odoo.pos_order po ON po.odoo_id = o.odoo_order_id AND po.company_key = o.company_key
        LEFT JOIN odoo.stock_location sl ON sl.odoo_id = po.location_id AND sl.company_key = 'GLOBAL'
        WHERE o.company_key = $1 {date_filter}
    """, *date_params)

    for o in orders:
        date_order = o['date_order']
        if date_order and hasattr(date_order, 'replace'):
            date_order = date_order.replace(tzinfo=None)
        await conn.execute("""
            INSERT INTO finanzas2.cont_venta_pos
                (empresa_id, odoo_id, name, date_order, amount_total, state,
                 partner_name, vendedor_id, vendedor_name, is_cancel, reserva,
                 tienda_id, tienda_name, company_name,
                 tipo_comp, num_comp, x_pagos, company_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18)
            ON CONFLICT (empresa_id, odoo_id) DO UPDATE SET
                date_order = EXCLUDED.date_order,
                amount_total = EXCLUDED.amount_total,
                state = EXCLUDED.state,
                partner_name = EXCLUDED.partner_name,
                vendedor_id = EXCLUDED.vendedor_id,
                vendedor_name = EXCLUDED.vendedor_name,
                is_cancel = EXCLUDED.is_cancel,
                reserva = EXCLUDED.reserva,
                tienda_id = EXCLUDED.tienda_id,
                tienda_name = EXCLUDED.tienda_name,
                company_name = EXCLUDED.company_name,
                tipo_comp = EXCLUDED.tipo_comp,
                num_comp = EXCLUDED.num_comp,
                x_pagos = EXCLUDED.x_pagos,
                company_id = EXCLUDED.company_id
        """, empresa_id, o['odoo_order_id'], f"POS-{o['odoo_order_id']}",
            date_order, o['amount_total'], o['state'],
            o['partner_name'] or '-', o['vendedor_id'],
            o['vendedor_name'] or '-',
            o['is_cancelled'] or False, o['reserva'] or False,
            o['tienda_id'], o['tienda_name'], o['company_name'],
            o['tipo_comp'], o['num_comp'], o['x_pagos'], o['company_id'])

    if not orders:
        return

    # 2. Sync lines for the synced orders - batch SQL (efficient)
    order_ids = [o['odoo_order_id'] for o in orders]

    await conn.execute("""
        INSERT INTO finanzas2.cont_venta_pos_linea
            (empresa_id, venta_pos_id, odoo_line_id, product_id, product_name, product_code,
             qty, price_unit, price_subtotal, price_subtotal_incl, discount, marca, tipo,
             odoo_linea_negocio_id, odoo_linea_negocio_nombre)
        SELECT $1, v.id, l.pos_order_line_id, l.product_id,
               COALESCE(pt.name, l.barcode, '-'), l.barcode,
               l.qty, l.price_unit, l.price_subtotal, l.price_unit * l.qty,
               l.discount, l.marca, l.tipo,
               pt.linea_negocio_id, pt.linea_negocio
        FROM odoo.v_pos_line_full l
        JOIN finanzas2.cont_venta_pos v ON v.odoo_id = l.order_id AND v.empresa_id = $1
        LEFT JOIN odoo.product_template pt ON pt.odoo_id = l.product_tmpl_id
        WHERE l.company_key = $2 AND l.order_id = ANY($3)
        ON CONFLICT (empresa_id, odoo_line_id) DO UPDATE SET
            product_name = EXCLUDED.product_name,
            product_code = EXCLUDED.product_code,
            qty = EXCLUDED.qty,
            price_unit = EXCLUDED.price_unit,
            price_subtotal = EXCLUDED.price_subtotal,
            price_subtotal_incl = EXCLUDED.price_subtotal_incl,
            discount = EXCLUDED.discount,
            marca = EXCLUDED.marca,
            tipo = EXCLUDED.tipo,
            odoo_linea_negocio_id = EXCLUDED.odoo_linea_negocio_id,
            odoo_linea_negocio_nombre = EXCLUDED.odoo_linea_negocio_nombre
    """, empresa_id, company_key, order_ids)

    # 3. Update quantity_total from lines
    await conn.execute("""
        UPDATE finanzas2.cont_venta_pos v
        SET quantity_total = sub.total_qty
        FROM (
            SELECT venta_pos_id, SUM(qty) AS total_qty
            FROM finanzas2.cont_venta_pos_linea
            WHERE empresa_id = $1
            GROUP BY venta_pos_id
        ) sub
        WHERE v.id = sub.venta_pos_id AND v.empresa_id = $1
    """, empresa_id)

    logger.info(f"Synced {len(orders)} orders and their lines to local tables")
