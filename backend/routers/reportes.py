"""
Reportes Financieros Gerenciales (Mejorado)
- Balance General
- Estado de Ganancias y Perdidas (EGyP)
- Cash Flow / Flujo de Caja
- Inventario Valorizado
"""
from fastapi import APIRouter, Depends, Query
from datetime import date, datetime
from typing import Optional
from database import get_pool
from dependencies import get_empresa_id

router = APIRouter()


def _serialize(row):
    d = {}
    for k, v in dict(row).items():
        if isinstance(v, (date, datetime)):
            d[k] = v.isoformat()
        elif hasattr(v, 'as_tuple'):
            d[k] = float(v)
        else:
            d[k] = v
    return d


# =====================
# BALANCE GENERAL
# =====================
@router.get("/reportes/balance-general")
async def reporte_balance_general(
    empresa_id: int = Depends(get_empresa_id),
    linea_negocio_id: Optional[int] = Query(None)
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")

        # ACTIVOS
        # Caja y Bancos
        cuentas = await conn.fetch(
            "SELECT id, nombre, tipo, saldo_actual FROM finanzas2.cont_cuenta_financiera WHERE empresa_id = $1 AND activo = TRUE",
            empresa_id)
        caja_total = sum(float(c['saldo_actual']) for c in cuentas)

        # CxC
        cxc = float(await conn.fetchval(
            "SELECT COALESCE(SUM(saldo_pendiente), 0) FROM finanzas2.cont_cxc WHERE empresa_id = $1 AND estado NOT IN ('pagado', 'anulada')",
            empresa_id) or 0)

        # Inventario MP
        inv_mp_detail = await conn.fetch("""
            SELECT inv.categoria, SUM(i.cantidad_disponible) as cantidad,
                   SUM(i.cantidad_disponible * i.costo_unitario) as valor
            FROM produccion.prod_inventario_ingresos i
            JOIN produccion.prod_inventario inv ON i.item_id = inv.id
            WHERE i.empresa_id = $1 AND inv.categoria != 'PT' AND i.cantidad_disponible > 0
            GROUP BY inv.categoria ORDER BY inv.categoria
        """, empresa_id)
        inv_mp = sum(float(r['valor'] or 0) for r in inv_mp_detail)

        # Inventario PT
        inv_pt = float(await conn.fetchval("""
            SELECT COALESCE(SUM(i.cantidad_disponible * i.costo_unitario), 0)
            FROM produccion.prod_inventario_ingresos i
            JOIN produccion.prod_inventario inv ON i.item_id = inv.id
            WHERE i.empresa_id = $1 AND inv.categoria = 'PT' AND i.cantidad_disponible > 0
        """, empresa_id) or 0)

        # WIP
        wip_mp = float(await conn.fetchval("""
            SELECT COALESCE(SUM(s.costo_total), 0)
            FROM produccion.prod_inventario_salidas s
            JOIN produccion.prod_registros r ON s.registro_id = r.id
            WHERE s.empresa_id = $1 AND r.estado != 'Producto Terminado'
        """, empresa_id) or 0)
        wip_srv = float(await conn.fetchval("""
            SELECT COALESCE(SUM(fl.importe), 0)
            FROM finanzas2.cont_factura_proveedor_linea fl
            JOIN finanzas2.cont_factura_proveedor f ON fl.factura_id = f.id
            JOIN produccion.prod_registros r ON fl.modelo_corte_id::text = r.id::text
            WHERE f.empresa_id = $1 AND fl.tipo_linea = 'servicio'
            AND r.estado != 'Producto Terminado' AND f.estado != 'anulada'
        """, empresa_id) or 0)
        wip_total = wip_mp + wip_srv

        total_activos = caja_total + cxc + inv_mp + inv_pt + wip_total

        # PASIVOS
        cxp = float(await conn.fetchval(
            "SELECT COALESCE(SUM(saldo_pendiente), 0) FROM finanzas2.cont_cxp WHERE empresa_id = $1 AND estado NOT IN ('pagado', 'anulada')",
            empresa_id) or 0)
        letras = float(await conn.fetchval(
            "SELECT COALESCE(SUM(saldo_pendiente), 0) FROM finanzas2.cont_letra WHERE estado IN ('pendiente', 'parcial') AND empresa_id = $1",
            empresa_id) or 0)
        total_pasivos = cxp + letras

        patrimonio = total_activos - total_pasivos

        return {
            "activos": {
                "caja_bancos": {"cuentas": [_serialize(c) for c in cuentas], "total": caja_total},
                "cuentas_por_cobrar": cxc,
                "inventario_mp": {"detalle": [_serialize(r) for r in inv_mp_detail], "total": inv_mp},
                "inventario_pt": inv_pt,
                "wip": {"mp_consumida": wip_mp, "servicios": wip_srv, "total": wip_total},
                "total": total_activos
            },
            "pasivos": {
                "cuentas_por_pagar": cxp,
                "letras_por_pagar": letras,
                "total": total_pasivos
            },
            "patrimonio": patrimonio,
            "total_activos": total_activos,
            "total_pasivos": total_pasivos
        }


# =====================
# ESTADO DE RESULTADOS
# =====================
@router.get("/reportes/estado-resultados")
async def reporte_estado_resultados(
    empresa_id: int = Depends(get_empresa_id),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    linea_negocio_id: Optional[int] = Query(None)
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")

        f_desde = fecha_desde or date(2020, 1, 1)
        f_hasta = fecha_hasta or date.today()

        # VENTAS (solo confirmadas + credito)
        ventas = float(await conn.fetchval("""
            SELECT COALESCE(SUM(v.amount_total), 0)
            FROM finanzas2.cont_venta_pos v
            LEFT JOIN finanzas2.cont_venta_pos_estado e ON e.odoo_order_id = v.odoo_id AND e.empresa_id = v.empresa_id
            WHERE v.empresa_id = $1 AND v.date_order >= $2::timestamp AND v.date_order <= ($3::date + 1)::timestamp
            AND COALESCE(e.estado_local, 'pendiente') IN ('confirmada', 'credito')
        """, empresa_id, f_desde, f_hasta) or 0)

        # Ventas por linea (solo confirmadas + credito)
        ventas_linea = await conn.fetch("""
            SELECT ln.nombre as linea, COALESCE(SUM(v.amount_total), 0) as total
            FROM finanzas2.cont_venta_pos v
            LEFT JOIN finanzas2.cont_venta_pos_estado e ON e.odoo_order_id = v.odoo_id AND e.empresa_id = v.empresa_id
            LEFT JOIN finanzas2.cont_linea_negocio ln ON v.tienda_id::text = ln.id::text
            WHERE v.empresa_id = $1 AND v.date_order >= $2::timestamp AND v.date_order <= ($3::date + 1)::timestamp
            AND COALESCE(e.estado_local, 'pendiente') IN ('confirmada', 'credito')
            GROUP BY ln.nombre ORDER BY total DESC
        """, empresa_id, f_desde, f_hasta)

        # COSTO DE VENTA
        costo_mp = float(await conn.fetchval("""
            SELECT COALESCE(SUM(costo_total), 0)
            FROM produccion.prod_inventario_salidas
            WHERE empresa_id = $1 AND fecha >= $2::timestamp AND fecha <= ($3::date + 1)::timestamp
        """, empresa_id, f_desde, f_hasta) or 0)
        costo_srv = float(await conn.fetchval("""
            SELECT COALESCE(SUM(fl.importe), 0)
            FROM finanzas2.cont_factura_proveedor_linea fl
            JOIN finanzas2.cont_factura_proveedor f ON fl.factura_id = f.id
            WHERE f.empresa_id = $1 AND fl.tipo_linea = 'servicio'
            AND f.fecha_factura >= $2 AND f.fecha_factura <= $3
            AND f.estado != 'anulada'
        """, empresa_id, f_desde, f_hasta) or 0)
        costo_venta_total = costo_mp + costo_srv
        margen_bruto = ventas - costo_venta_total

        # GASTOS OPERATIVOS
        gastos_total = float(await conn.fetchval("""
            SELECT COALESCE(SUM(total), 0) FROM finanzas2.cont_gasto
            WHERE empresa_id = $1 AND fecha >= $2 AND fecha <= $3
        """, empresa_id, f_desde, f_hasta) or 0)

        gastos_cat = await conn.fetch("""
            SELECT COALESCE(c.nombre, 'Sin Categoria') as categoria, SUM(gd.importe) as monto
            FROM finanzas2.cont_gasto_linea gd
            JOIN finanzas2.cont_gasto g ON gd.gasto_id = g.id
            LEFT JOIN finanzas2.cont_categoria c ON gd.categoria_id = c.id
            WHERE g.empresa_id = $1 AND g.fecha >= $2 AND g.fecha <= $3
            GROUP BY c.nombre ORDER BY monto DESC
        """, empresa_id, f_desde, f_hasta)

        utilidad_operativa = margen_bruto - gastos_total

        return {
            "periodo": {"desde": f_desde.isoformat(), "hasta": f_hasta.isoformat()},
            "ventas": {"total": ventas, "por_linea": [_serialize(r) for r in ventas_linea]},
            "costo_venta": {"mp_consumida": costo_mp, "servicios": costo_srv, "total": costo_venta_total},
            "margen_bruto": margen_bruto,
            "gastos_operativos": {"total": gastos_total, "por_categoria": [_serialize(r) for r in gastos_cat]},
            "utilidad_operativa": utilidad_operativa,
            "utilidad_neta": utilidad_operativa
        }


# =====================
# CASH FLOW
# =====================
@router.get("/reportes/flujo-caja")
async def reporte_flujo_caja(
    empresa_id: int = Depends(get_empresa_id),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    linea_negocio_id: Optional[int] = Query(None)
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")

        f_desde = fecha_desde or date(2020, 1, 1)
        f_hasta = fecha_hasta or date.today()

        # INGRESOS REALES
        cobros_ventas = float(await conn.fetchval("""
            SELECT COALESCE(SUM(monto), 0) FROM finanzas2.cont_venta_pos_pago
            WHERE empresa_id = $1 AND fecha_pago >= $2 AND fecha_pago <= $3
        """, empresa_id, f_desde, f_hasta) or 0)

        ing_tesoreria = float(await conn.fetchval("""
            SELECT COALESCE(SUM(monto), 0) FROM finanzas2.cont_movimiento_tesoreria
            WHERE empresa_id = $1 AND tipo = 'ingreso' AND fecha >= $2 AND fecha <= $3
        """, empresa_id, f_desde, f_hasta) or 0)

        pagos_ingreso = float(await conn.fetchval("""
            SELECT COALESCE(SUM(monto_total), 0) FROM finanzas2.cont_pago
            WHERE empresa_id = $1 AND tipo = 'ingreso' AND fecha >= $2 AND fecha <= $3
        """, empresa_id, f_desde, f_hasta) or 0)

        total_ingresos = cobros_ventas + ing_tesoreria + pagos_ingreso

        # Detalle ingresos
        ing_detalle = await conn.fetch("""
            SELECT concepto, SUM(monto) as total FROM finanzas2.cont_movimiento_tesoreria
            WHERE empresa_id = $1 AND tipo = 'ingreso' AND fecha >= $2 AND fecha <= $3
            GROUP BY concepto ORDER BY total DESC
        """, empresa_id, f_desde, f_hasta)

        # EGRESOS REALES
        eg_tesoreria = float(await conn.fetchval("""
            SELECT COALESCE(SUM(monto), 0) FROM finanzas2.cont_movimiento_tesoreria
            WHERE empresa_id = $1 AND tipo = 'egreso' AND fecha >= $2 AND fecha <= $3
        """, empresa_id, f_desde, f_hasta) or 0)

        pagos_egreso = float(await conn.fetchval("""
            SELECT COALESCE(SUM(monto_total), 0) FROM finanzas2.cont_pago
            WHERE empresa_id = $1 AND tipo = 'egreso' AND fecha >= $2 AND fecha <= $3
        """, empresa_id, f_desde, f_hasta) or 0)

        total_egresos = eg_tesoreria + pagos_egreso

        # Detalle egresos
        eg_detalle = await conn.fetch("""
            SELECT concepto, SUM(monto) as total FROM finanzas2.cont_movimiento_tesoreria
            WHERE empresa_id = $1 AND tipo = 'egreso' AND fecha >= $2 AND fecha <= $3
            GROUP BY concepto ORDER BY total DESC
        """, empresa_id, f_desde, f_hasta)

        # Saldos actuales
        saldos = await conn.fetch(
            "SELECT nombre, tipo, saldo_actual FROM finanzas2.cont_cuenta_financiera WHERE empresa_id = $1 AND activo = TRUE ORDER BY nombre",
            empresa_id)

        return {
            "periodo": {"desde": f_desde.isoformat(), "hasta": f_hasta.isoformat()},
            "ingresos": {
                "cobros_ventas": cobros_ventas,
                "tesoreria": ing_tesoreria,
                "pagos_recibidos": pagos_ingreso,
                "total": total_ingresos,
                "detalle": [_serialize(r) for r in ing_detalle]
            },
            "egresos": {
                "tesoreria": eg_tesoreria,
                "pagos_proveedores": pagos_egreso,
                "total": total_egresos,
                "detalle": [_serialize(r) for r in eg_detalle]
            },
            "flujo_neto": total_ingresos - total_egresos,
            "saldos_cuentas": [_serialize(r) for r in saldos]
        }


# =====================
# INVENTARIO VALORIZADO
# =====================
@router.get("/reportes/inventario-valorizado")
async def reporte_inventario_valorizado(
    empresa_id: int = Depends(get_empresa_id),
    linea_negocio_id: Optional[int] = Query(None)
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")

        # MP detail
        mp_items = await conn.fetch("""
            SELECT inv.nombre, inv.codigo, inv.categoria, inv.unidad_medida,
                   SUM(i.cantidad_disponible) as stock,
                   CASE WHEN SUM(i.cantidad_disponible) > 0
                        THEN SUM(i.cantidad_disponible * i.costo_unitario) / SUM(i.cantidad_disponible)
                        ELSE 0 END as costo_promedio,
                   SUM(i.cantidad_disponible * i.costo_unitario) as valor_total
            FROM produccion.prod_inventario_ingresos i
            JOIN produccion.prod_inventario inv ON i.item_id = inv.id
            WHERE i.empresa_id = $1 AND inv.categoria != 'PT' AND i.cantidad_disponible > 0
            GROUP BY inv.nombre, inv.codigo, inv.categoria, inv.unidad_medida
            ORDER BY inv.categoria, inv.nombre
        """, empresa_id)

        # PT detail
        pt_items = await conn.fetch("""
            SELECT inv.nombre, inv.codigo, inv.unidad_medida,
                   SUM(i.cantidad_disponible) as stock,
                   CASE WHEN SUM(i.cantidad_disponible) > 0
                        THEN SUM(i.cantidad_disponible * i.costo_unitario) / SUM(i.cantidad_disponible)
                        ELSE 0 END as costo_promedio,
                   SUM(i.cantidad_disponible * i.costo_unitario) as valor_total
            FROM produccion.prod_inventario_ingresos i
            JOIN produccion.prod_inventario inv ON i.item_id = inv.id
            WHERE i.empresa_id = $1 AND inv.categoria = 'PT' AND i.cantidad_disponible > 0
            GROUP BY inv.nombre, inv.codigo, inv.unidad_medida
            ORDER BY inv.nombre
        """, empresa_id)

        # WIP MP
        wip_mp = await conn.fetch("""
            SELECT r.inventario_nombre, r.tipo_componente,
                   SUM(r.cantidad_consumida) as consumido,
                   SUM(r.cantidad_consumida * COALESCE(i.costo_unitario, 0)) as valor
            FROM produccion.prod_registro_requerimiento_mp r
            LEFT JOIN produccion.prod_inventario_ingresos i ON r.item_id = i.item_id AND i.empresa_id = $1
            WHERE r.empresa_id = $1 AND r.cantidad_consumida > 0
            GROUP BY r.inventario_nombre, r.tipo_componente
        """, empresa_id)

        # WIP Services
        wip_srv = await conn.fetch("""
            SELECT descripcion, SUM(monto) as monto
            FROM produccion.prod_registro_costos_servicio WHERE empresa_id = $1
            GROUP BY descripcion
        """, empresa_id)

        mp_total = sum(float(r['valor_total'] or 0) for r in mp_items)
        pt_total = sum(float(r['valor_total'] or 0) for r in pt_items)
        wip_mp_total = sum(float(r['valor'] or 0) for r in wip_mp)
        wip_srv_total = sum(float(r['monto'] or 0) for r in wip_srv)

        return {
            "materia_prima": {"items": [_serialize(r) for r in mp_items], "total": mp_total},
            "producto_terminado": {"items": [_serialize(r) for r in pt_items], "total": pt_total},
            "wip": {
                "mp_consumida": [_serialize(r) for r in wip_mp], "total_mp": wip_mp_total,
                "servicios": [_serialize(r) for r in wip_srv], "total_srv": wip_srv_total,
                "total": wip_mp_total + wip_srv_total
            },
            "gran_total": mp_total + pt_total + wip_mp_total + wip_srv_total
        }
