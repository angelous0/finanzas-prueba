from fastapi import APIRouter, Depends
from typing import List
from datetime import datetime, timedelta

from database import get_pool
from app.schemas import DashboardKPIs
from app.core.dependencies import get_empresa_id

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/kpis", response_model=DashboardKPIs)
async def get_dashboard_kpis(empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")

        total_cxp = await conn.fetchval("""
            SELECT COALESCE(SUM(saldo_pendiente), 0)
            FROM finanzas2.cont_cxp WHERE estado NOT IN ('pagado', 'anulada') AND empresa_id = $1
        """, empresa_id) or 0

        total_cxc = await conn.fetchval("""
            SELECT COALESCE(SUM(saldo_pendiente), 0)
            FROM finanzas2.cont_cxc WHERE estado NOT IN ('pagado', 'anulada') AND empresa_id = $1
        """, empresa_id) or 0

        total_letras = await conn.fetchval("""
            SELECT COALESCE(SUM(saldo_pendiente), 0)
            FROM finanzas2.cont_letra WHERE estado IN ('pendiente', 'parcial') AND empresa_id = $1
        """, empresa_id) or 0

        saldo_bancos = await conn.fetchval("""
            SELECT COALESCE(SUM(saldo_actual), 0)
            FROM finanzas2.cont_cuenta_financiera WHERE activo = TRUE AND empresa_id = $1
        """, empresa_id) or 0

        inicio_mes = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ventas_mes = await conn.fetchval("""
            SELECT COALESCE(SUM(amount_total), 0)
            FROM finanzas2.cont_venta_pos
            WHERE date_order >= $1 AND estado_local = 'confirmada' AND empresa_id = $2
        """, inicio_mes, empresa_id) or 0

        gastos_mes = await conn.fetchval("""
            SELECT COALESCE(SUM(total), 0)
            FROM finanzas2.cont_gasto WHERE fecha >= $1 AND empresa_id = $2
        """, inicio_mes.date(), empresa_id) or 0

        facturas_pendientes = await conn.fetchval("""
            SELECT COUNT(*) FROM finanzas2.cont_factura_proveedor
            WHERE estado IN ('pendiente', 'parcial') AND empresa_id = $1
        """, empresa_id) or 0

        fecha_limite = datetime.now().date() + timedelta(days=7)
        letras_por_vencer = await conn.fetchval("""
            SELECT COUNT(*) FROM finanzas2.cont_letra
            WHERE estado IN ('pendiente', 'parcial') AND fecha_vencimiento <= $1 AND empresa_id = $2
        """, fecha_limite, empresa_id) or 0

        return DashboardKPIs(
            total_cxp=float(total_cxp),
            total_cxc=float(total_cxc),
            total_letras_pendientes=float(total_letras),
            saldo_bancos=float(saldo_bancos),
            ventas_mes=float(ventas_mes),
            gastos_mes=float(gastos_mes),
            facturas_pendientes=facturas_pendientes,
            letras_por_vencer=letras_por_vencer,
        )
