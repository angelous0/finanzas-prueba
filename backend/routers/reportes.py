from fastapi import APIRouter, Depends, Query
from datetime import date, datetime
from database import get_pool
from dependencies import get_empresa_id

router = APIRouter()


@router.get("/reportes/flujo-caja")
async def reporte_flujo_caja(
    fecha_desde: date = Query(...),
    fecha_hasta: date = Query(...),
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        rows = await conn.fetch("""
            SELECT p.fecha, p.tipo, p.monto_total, p.notas, cf.nombre as cuenta
            FROM finanzas2.cont_pago p
            LEFT JOIN finanzas2.cont_cuenta_financiera cf ON p.cuenta_financiera_id = cf.id
            WHERE p.fecha BETWEEN $1 AND $2 AND p.empresa_id = $3
            ORDER BY p.fecha ASC
        """, fecha_desde, fecha_hasta, empresa_id)
        resultado = []
        saldo_acumulado = 0
        for row in rows:
            if row['tipo'] == 'ingreso':
                saldo_acumulado += float(row['monto_total'])
            else:
                saldo_acumulado -= float(row['monto_total'])
            resultado.append({
                "fecha": row['fecha'].isoformat(),
                "concepto": row['notas'] or row['cuenta'],
                "tipo": row['tipo'],
                "monto": float(row['monto_total']),
                "saldo_acumulado": saldo_acumulado
            })
        return resultado


@router.get("/reportes/estado-resultados")
async def reporte_estado_resultados(
    fecha_desde: date = Query(...),
    fecha_hasta: date = Query(...),
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        ingresos = await conn.fetchval("""
            SELECT COALESCE(SUM(amount_total), 0)
            FROM finanzas2.cont_venta_pos
            WHERE date_order BETWEEN $1 AND $2 AND estado_local = 'confirmada' AND empresa_id = $3
        """, datetime.combine(fecha_desde, datetime.min.time()),
            datetime.combine(fecha_hasta, datetime.max.time()), empresa_id) or 0
        egresos_data = await conn.fetch("""
            SELECT c.nombre as categoria, COALESCE(SUM(gl.importe), 0) as monto
            FROM finanzas2.cont_gasto g
            JOIN finanzas2.cont_gasto_linea gl ON g.id = gl.gasto_id
            LEFT JOIN finanzas2.cont_categoria c ON gl.categoria_id = c.id
            WHERE g.fecha BETWEEN $1 AND $2 AND g.empresa_id = $3
            GROUP BY c.nombre
        """, fecha_desde, fecha_hasta, empresa_id)
        total_egresos = sum(float(e['monto']) for e in egresos_data)
        return {
            "ingresos": [{"categoria": "Ventas", "tipo": "ingreso", "monto": float(ingresos)}],
            "egresos": [{"categoria": e['categoria'] or "Sin categoria", "tipo": "egreso", "monto": float(e['monto'])} for e in egresos_data],
            "total_ingresos": float(ingresos),
            "total_egresos": total_egresos,
            "resultado_neto": float(ingresos) - total_egresos
        }


@router.get("/reportes/balance-general")
async def reporte_balance_general(empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        activos_bancos = await conn.fetch("""
            SELECT nombre, saldo_actual FROM finanzas2.cont_cuenta_financiera WHERE activo = TRUE AND empresa_id = $1
        """, empresa_id)
        total_activos = sum(float(a['saldo_actual']) for a in activos_bancos)
        total_cxp = await conn.fetchval("""
            SELECT COALESCE(SUM(saldo_pendiente), 0) FROM finanzas2.cont_cxp WHERE estado NOT IN ('pagado', 'anulada') AND empresa_id = $1
        """, empresa_id) or 0
        total_letras = await conn.fetchval("""
            SELECT COALESCE(SUM(saldo_pendiente), 0) FROM finanzas2.cont_letra WHERE estado IN ('pendiente', 'parcial') AND empresa_id = $1
        """, empresa_id) or 0
        total_pasivos = float(total_cxp) + float(total_letras)
        patrimonio = total_activos - total_pasivos
        return {
            "activos": [{"cuenta": a['nombre'], "tipo": "activo", "monto": float(a['saldo_actual'])} for a in activos_bancos],
            "pasivos": [
                {"cuenta": "Cuentas por Pagar", "tipo": "pasivo", "monto": float(total_cxp)},
                {"cuenta": "Letras por Pagar", "tipo": "pasivo", "monto": float(total_letras)}
            ],
            "total_activos": total_activos,
            "total_pasivos": total_pasivos,
            "patrimonio": patrimonio
        }
