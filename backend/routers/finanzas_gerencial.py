from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date, datetime
from database import get_pool
from dependencies import get_empresa_id

router = APIRouter()


@router.get("/flujo-caja-gerencial")
async def flujo_caja_gerencial(
    fecha_desde: date = Query(...),
    fecha_hasta: date = Query(...),
    agrupacion: str = Query("diario", regex="^(diario|semanal|mensual)$"),
    marca_id: Optional[int] = None,
    proyecto_id: Optional[int] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")

        date_trunc = {"diario": "day", "semanal": "week", "mensual": "month"}[agrupacion]

        # Ingresos: pagos oficiales de ventas confirmadas
        ingresos_query = f"""
            SELECT DATE_TRUNC('{date_trunc}', pa.created_at)::date as periodo,
                   COALESCE(SUM(pa.monto_aplicado), 0) as total
            FROM cont_pago_aplicacion pa
            WHERE pa.empresa_id = $1
              AND pa.created_at::date BETWEEN $2 AND $3
              AND pa.tipo_documento = 'venta_pos_odoo'
        """
        params_in = [empresa_id, fecha_desde, fecha_hasta]
        ingresos_rows = await conn.fetch(ingresos_query + " GROUP BY periodo ORDER BY periodo", *params_in)

        # Egresos: pagos de gastos + abonos CxP
        egresos_query = f"""
            SELECT DATE_TRUNC('{date_trunc}', fecha)::date as periodo,
                   COALESCE(SUM(monto_total), 0) as total
            FROM cont_pago
            WHERE empresa_id = $1
              AND tipo = 'egreso'
              AND fecha BETWEEN $2 AND $3
        """
        params_eg = [empresa_id, fecha_desde, fecha_hasta]
        egresos_rows = await conn.fetch(egresos_query + " GROUP BY periodo ORDER BY periodo", *params_eg)

        # Abonos CxP (payments on accounts payable)
        abonos_cxp_query = f"""
            SELECT DATE_TRUNC('{date_trunc}', a.fecha)::date as periodo,
                   COALESCE(SUM(a.monto), 0) as total
            FROM cont_cxp_abono a
            WHERE a.empresa_id = $1
              AND a.fecha BETWEEN $2 AND $3
            GROUP BY periodo ORDER BY periodo
        """
        abonos_cxp_rows = await conn.fetch(abonos_cxp_query, empresa_id, fecha_desde, fecha_hasta)

        # Cobranzas CxC (payments received on accounts receivable)
        cobranzas_query = f"""
            SELECT DATE_TRUNC('{date_trunc}', a.fecha)::date as periodo,
                   COALESCE(SUM(a.monto), 0) as total
            FROM cont_cxc_abono a
            WHERE a.empresa_id = $1
              AND a.fecha BETWEEN $2 AND $3
            GROUP BY periodo ORDER BY periodo
        """
        cobranzas_rows = await conn.fetch(cobranzas_query, empresa_id, fecha_desde, fecha_hasta)

        # Merge all into timeline
        periods = {}
        for r in ingresos_rows:
            p = r['periodo'].isoformat()
            periods.setdefault(p, {"ingresos": 0, "egresos": 0, "cobranzas": 0, "pagos_cxp": 0})
            periods[p]["ingresos"] += float(r['total'])
        for r in egresos_rows:
            p = r['periodo'].isoformat()
            periods.setdefault(p, {"ingresos": 0, "egresos": 0, "cobranzas": 0, "pagos_cxp": 0})
            periods[p]["egresos"] += float(r['total'])
        for r in abonos_cxp_rows:
            p = r['periodo'].isoformat()
            periods.setdefault(p, {"ingresos": 0, "egresos": 0, "cobranzas": 0, "pagos_cxp": 0})
            periods[p]["pagos_cxp"] += float(r['total'])
        for r in cobranzas_rows:
            p = r['periodo'].isoformat()
            periods.setdefault(p, {"ingresos": 0, "egresos": 0, "cobranzas": 0, "pagos_cxp": 0})
            periods[p]["cobranzas"] += float(r['total'])

        timeline = []
        saldo = 0
        for p in sorted(periods.keys()):
            d = periods[p]
            total_in = d["ingresos"] + d["cobranzas"]
            total_out = d["egresos"] + d["pagos_cxp"]
            saldo += total_in - total_out
            timeline.append({
                "periodo": p,
                "ingresos_ventas": d["ingresos"],
                "cobranzas_cxc": d["cobranzas"],
                "total_ingresos": total_in,
                "egresos_gastos": d["egresos"],
                "pagos_cxp": d["pagos_cxp"],
                "total_egresos": total_out,
                "flujo_neto": total_in - total_out,
                "saldo_acumulado": saldo,
            })

        total_ingresos = sum(t["total_ingresos"] for t in timeline)
        total_egresos = sum(t["total_egresos"] for t in timeline)

        return {
            "timeline": timeline,
            "totales": {
                "ingresos": total_ingresos,
                "egresos": total_egresos,
                "flujo_neto": total_ingresos - total_egresos,
            },
            "agrupacion": agrupacion,
            "fecha_desde": fecha_desde.isoformat(),
            "fecha_hasta": fecha_hasta.isoformat(),
        }


@router.get("/rentabilidad")
async def rentabilidad(
    fecha_desde: date = Query(...),
    fecha_hasta: date = Query(...),
    dimension: str = Query("marca", regex="^(marca|linea_negocio|centro_costo|proyecto)$"),
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")

        # Map dimension to table/column for join
        dim_config = {
            "marca": {"join_table": "cont_marca", "join_col": "marca_id", "name_col": "nombre"},
            "linea_negocio": {"join_table": "cont_linea_negocio", "join_col": "linea_negocio_id", "name_col": "nombre"},
            "centro_costo": {"join_table": "cont_centro_costo", "join_col": "centro_costo_id", "name_col": "nombre"},
            "proyecto": {"join_table": "cont_proyecto", "join_col": "proyecto_id", "name_col": "nombre"},
        }
        cfg = dim_config[dimension]

        # INGRESOS: from confirmed POS sales (line-item detail by marca)
        # This follows the rule: attribution from detail, never from header
        ingresos_rows = await conn.fetch(f"""
            SELECT
                COALESCE(m.{cfg['name_col']}, 'Sin Asignar') as dimension_name,
                COALESCE(SUM(l.price_subtotal), 0) as ingreso
            FROM odoo.v_pos_line_full l
            JOIN odoo.v_pos_order_enriched o ON o.odoo_order_id = l.order_id
            JOIN finanzas2.cont_venta_pos_estado e
                ON e.odoo_order_id = o.odoo_order_id AND e.empresa_id = $1
            LEFT JOIN finanzas2.{cfg['join_table']} m ON m.nombre = l.marca
            WHERE e.estado_local = 'confirmada'
              AND o.date_order BETWEEN $2 AND $3
            GROUP BY dimension_name
        """, empresa_id,
            datetime.combine(fecha_desde, datetime.min.time()),
            datetime.combine(fecha_hasta, datetime.max.time()))

        # GASTOS: from cont_gasto_linea with dimension
        gastos_rows = await conn.fetch(f"""
            SELECT
                COALESCE(m.{cfg['name_col']}, 'Sin Asignar') as dimension_name,
                COALESCE(SUM(gl.importe), 0) as gasto
            FROM cont_gasto g
            JOIN cont_gasto_linea gl ON g.id = gl.gasto_id
            LEFT JOIN {cfg['join_table']} m ON g.{cfg['join_col']} = m.id
            WHERE g.empresa_id = $1 AND g.fecha BETWEEN $2 AND $3
            GROUP BY dimension_name
        """, empresa_id, fecha_desde, fecha_hasta)

        # Merge
        data = {}
        for r in ingresos_rows:
            name = r['dimension_name']
            data.setdefault(name, {"ingreso": 0, "gasto": 0})
            data[name]["ingreso"] += float(r['ingreso'])
        for r in gastos_rows:
            name = r['dimension_name']
            data.setdefault(name, {"ingreso": 0, "gasto": 0})
            data[name]["gasto"] += float(r['gasto'])

        result = []
        for name, vals in sorted(data.items(), key=lambda x: x[1]["ingreso"], reverse=True):
            utilidad = vals["ingreso"] - vals["gasto"]
            margen = (utilidad / vals["ingreso"] * 100) if vals["ingreso"] > 0 else 0
            result.append({
                "dimension": name,
                "ingreso": vals["ingreso"],
                "gasto": vals["gasto"],
                "utilidad": utilidad,
                "margen_pct": round(margen, 1),
            })

        total_ingreso = sum(r["ingreso"] for r in result)
        total_gasto = sum(r["gasto"] for r in result)
        total_utilidad = total_ingreso - total_gasto
        total_margen = round((total_utilidad / total_ingreso * 100) if total_ingreso > 0 else 0, 1)

        return {
            "data": result,
            "totales": {
                "ingreso": total_ingreso,
                "gasto": total_gasto,
                "utilidad": total_utilidad,
                "margen_pct": total_margen,
            },
            "dimension": dimension,
            "fecha_desde": fecha_desde.isoformat(),
            "fecha_hasta": fecha_hasta.isoformat(),
        }
