from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from database import get_pool
from models import Planilla, PlanillaCreate
from dependencies import get_empresa_id, safe_date_param
from routers.pagos import generate_pago_number

router = APIRouter()


async def get_planilla(id: int, empresa_id: int = None) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        if empresa_id:
            row = await conn.fetchrow("SELECT * FROM finanzas2.cont_planilla WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        else:
            row = await conn.fetchrow("SELECT * FROM finanzas2.cont_planilla WHERE id = $1", id)
        if not row:
            raise HTTPException(404, "Planilla not found")
        planilla_dict = dict(row)
        detalles = await conn.fetch("""
            SELECT pd.*, t.nombre as empleado_nombre
            FROM finanzas2.cont_planilla_detalle pd
            LEFT JOIN finanzas2.cont_tercero t ON pd.empleado_id = t.id
            WHERE pd.planilla_id = $1
        """, id)
        planilla_dict['detalles'] = [dict(d) for d in detalles]
        return planilla_dict


@router.get("/planillas", response_model=List[Planilla])
async def list_planillas(empresa_id: Optional[int] = None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        if empresa_id is not None:
            rows = await conn.fetch("""
                SELECT DISTINCT p.* FROM finanzas2.cont_planilla p
                JOIN finanzas2.cont_planilla_detalle pd ON pd.planilla_id = p.id
                JOIN finanzas2.cont_tercero t ON pd.empleado_id = t.id
                WHERE t.empresa_id = $1
                ORDER BY p.periodo DESC
            """, empresa_id)
        else:
            rows = await conn.fetch("SELECT * FROM finanzas2.cont_planilla ORDER BY periodo DESC")
        result = []
        for row in rows:
            planilla_dict = dict(row)
            detalles = await conn.fetch("""
                SELECT pd.*, t.nombre as empleado_nombre
                FROM finanzas2.cont_planilla_detalle pd
                LEFT JOIN finanzas2.cont_tercero t ON pd.empleado_id = t.id
                WHERE pd.planilla_id = $1
            """, row['id'])
            planilla_dict['detalles'] = [dict(d) for d in detalles]
            result.append(planilla_dict)
        return result


@router.post("/planillas", response_model=Planilla)
async def create_planilla(data: PlanillaCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            total_bruto = sum(d.salario_base + d.bonificaciones for d in data.detalles)
            total_adelantos = sum(d.adelantos for d in data.detalles)
            total_descuentos = sum(d.otros_descuentos for d in data.detalles)
            total_neto = total_bruto - total_adelantos - total_descuentos
            row = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_planilla
                (periodo, fecha_inicio, fecha_fin, total_bruto, total_adelantos,
                 total_descuentos, total_neto, estado, empresa_id)
                VALUES ($1, TO_DATE($2, 'YYYY-MM-DD'), TO_DATE($3, 'YYYY-MM-DD'), $4, $5, $6, $7, 'borrador', $8)
                RETURNING *
            """, data.periodo, safe_date_param(data.fecha_inicio), safe_date_param(data.fecha_fin), total_bruto,
                total_adelantos, total_descuentos, total_neto, empresa_id)
            planilla_id = row['id']
            planilla_dict = dict(row)
            detalles_list = []
            for detalle in data.detalles:
                neto_pagar = detalle.salario_base + detalle.bonificaciones - detalle.adelantos - detalle.otros_descuentos
                detalle_row = await conn.fetchrow("""
                    INSERT INTO finanzas2.cont_planilla_detalle
                    (planilla_id, empleado_id, salario_base, bonificaciones, adelantos,
                     otros_descuentos, neto_pagar, empresa_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                """, planilla_id, detalle.empleado_id, detalle.salario_base, detalle.bonificaciones,
                    detalle.adelantos, detalle.otros_descuentos, neto_pagar, empresa_id)
                emp = await conn.fetchrow("SELECT nombre FROM finanzas2.cont_tercero WHERE id = $1 AND empresa_id = $2", detalle.empleado_id, empresa_id)
                detalle_dict = dict(detalle_row)
                detalle_dict['empleado_nombre'] = emp['nombre'] if emp else None
                detalles_list.append(detalle_dict)
            planilla_dict['detalles'] = detalles_list
            return planilla_dict


@router.get("/planillas/{id}", response_model=Planilla)
async def get_planilla_endpoint(id: int, empresa_id: int = Depends(get_empresa_id)):
    return await get_planilla(id, empresa_id)


@router.post("/planillas/{id}/pagar", response_model=Planilla)
async def pagar_planilla(id: int, cuenta_financiera_id: int = Query(...), empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            planilla = await conn.fetchrow("SELECT * FROM finanzas2.cont_planilla WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not planilla:
                raise HTTPException(404, "Planilla not found")
            if planilla['estado'] == 'pagada':
                raise HTTPException(400, "Planilla already paid")
            emp_info = await conn.fetchrow("""
                SELECT ed.centro_costo_id, ed.linea_negocio_id
                FROM finanzas2.cont_planilla_detalle pd
                JOIN finanzas2.cont_empleado_detalle ed ON pd.empleado_id = ed.tercero_id
                WHERE pd.planilla_id = $1 AND (ed.centro_costo_id IS NOT NULL OR ed.linea_negocio_id IS NOT NULL)
                LIMIT 1
            """, id)
            cc_id = emp_info['centro_costo_id'] if emp_info else None
            ln_id = emp_info['linea_negocio_id'] if emp_info else None
            pago_numero = await generate_pago_number(conn, 'egreso', empresa_id)
            pago = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_pago
                (numero, tipo, fecha, cuenta_financiera_id, monto_total, notas, centro_costo_id, linea_negocio_id, empresa_id)
                VALUES ($1, 'egreso', $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            """, pago_numero, datetime.now().date(), cuenta_financiera_id,
                planilla['total_neto'], f"Pago planilla {planilla['periodo']}", cc_id, ln_id, empresa_id)
            pago_id = pago['id']
            await conn.execute("""
                INSERT INTO finanzas2.cont_pago_detalle
                (pago_id, cuenta_financiera_id, medio_pago, monto, empresa_id)
                VALUES ($1, $2, 'transferencia', $3, $4)
            """, pago_id, cuenta_financiera_id, planilla['total_neto'], empresa_id)
            await conn.execute("UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = saldo_actual - $1 WHERE id = $2", planilla['total_neto'], cuenta_financiera_id)
            await conn.execute("""
                INSERT INTO finanzas2.cont_pago_aplicacion
                (pago_id, tipo_documento, documento_id, monto_aplicado, empresa_id)
                VALUES ($1, 'planilla', $2, $3, $4)
            """, pago_id, id, planilla['total_neto'], empresa_id)
            await conn.execute("""
                UPDATE finanzas2.cont_adelanto_empleado
                SET descontado = TRUE, planilla_id = $1
                WHERE empleado_id IN (SELECT empleado_id FROM finanzas2.cont_planilla_detalle WHERE planilla_id = $1)
                AND pagado = TRUE AND descontado = FALSE
            """, id)
            await conn.execute("UPDATE finanzas2.cont_planilla SET estado = 'pagada', pago_id = $1 WHERE id = $2", pago_id, id)
            return await get_planilla(id, empresa_id)


@router.delete("/planillas/{id}")
async def delete_planilla(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        existing = await conn.fetchrow("SELECT * FROM finanzas2.cont_planilla WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not existing:
            raise HTTPException(404, "Planilla no encontrada")
        if existing['estado'] == 'pagada':
            raise HTTPException(400, "No se puede eliminar una planilla pagada")
        await conn.execute("DELETE FROM finanzas2.cont_planilla_detalle WHERE planilla_id = $1", id)
        await conn.execute("DELETE FROM finanzas2.cont_planilla WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        return {"message": "Planilla eliminada"}
