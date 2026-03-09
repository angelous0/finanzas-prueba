from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import date, datetime
from database import get_pool
from models import Gasto, GastoCreate, Adelanto, AdelantoCreate
from dependencies import get_empresa_id, safe_date_param
from routers.pagos import generate_pago_number

router = APIRouter()


# =====================
# GASTOS
# =====================
@router.get("/gastos", response_model=List[Gasto])
async def list_gastos(
    categoria_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["g.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if categoria_id:
            conditions.append(f"gl.categoria_id = ${idx}"); params.append(categoria_id); idx += 1
        if fecha_desde:
            conditions.append(f"g.fecha >= ${idx}"); params.append(fecha_desde); idx += 1
        if fecha_hasta:
            conditions.append(f"g.fecha <= ${idx}"); params.append(fecha_hasta); idx += 1
        query = f"""
            SELECT DISTINCT ON (g.id)
                   g.*, m.codigo as moneda_codigo, m.simbolo as moneda_simbolo,
                   t.nombre as proveedor_nombre
            FROM finanzas2.cont_gasto g
            LEFT JOIN finanzas2.cont_gasto_linea gl ON g.id = gl.gasto_id
            LEFT JOIN finanzas2.cont_moneda m ON g.moneda_id = m.id
            LEFT JOIN finanzas2.cont_tercero t ON g.proveedor_id = t.id
            WHERE {' AND '.join(conditions)}
            ORDER BY g.id, g.fecha DESC
        """
        rows = await conn.fetch(query, *params)
        result = []
        for row in rows:
            gasto_dict = dict(row)
            lineas = await conn.fetch("""
                SELECT gl.*, c.nombre as categoria_nombre,
                       ln.nombre as linea_negocio_nombre, cc.nombre as centro_costo_nombre
                FROM finanzas2.cont_gasto_linea gl
                LEFT JOIN finanzas2.cont_categoria c ON gl.categoria_id = c.id
                LEFT JOIN finanzas2.cont_linea_negocio ln ON gl.linea_negocio_id = ln.id
                LEFT JOIN finanzas2.cont_centro_costo cc ON gl.centro_costo_id = cc.id
                WHERE gl.gasto_id = $1
            """, row['id'])
            gasto_dict['lineas'] = [dict(l) for l in lineas]
            result.append(gasto_dict)
        return result


@router.post("/gastos", response_model=Gasto)
async def create_gasto(data: GastoCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            subtotal = sum(l.importe for l in data.lineas)
            igv = sum(l.importe * 0.18 for l in data.lineas if l.igv_aplica)
            total = subtotal + igv
            base_gravada = sum(l.importe for l in data.lineas if l.igv_aplica)
            igv_sunat = round(base_gravada * 0.18, 2)
            base_no_gravada = sum(l.importe for l in data.lineas if not l.igv_aplica)
            isc_val = data.isc or 0.0
            fecha_contable = data.fecha_contable or data.fecha
            row = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_gasto
                (empresa_id, numero, fecha, fecha_contable, beneficiario_nombre, proveedor_id, moneda_id, subtotal, igv, total,
                 tipo_documento, numero_documento, notas, tipo_comprobante_sunat, base_gravada, igv_sunat, base_no_gravada, isc, tipo_cambio)
                VALUES ($1, $2, TO_DATE($3, 'YYYY-MM-DD'), TO_DATE($4, 'YYYY-MM-DD'), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING *
            """, empresa_id, data.numero, safe_date_param(data.fecha), safe_date_param(fecha_contable), data.beneficiario_nombre,
                data.proveedor_id, data.moneda_id, subtotal, igv, total,
                data.tipo_documento, data.numero_documento, data.notas,
                data.tipo_comprobante_sunat, base_gravada, igv_sunat, base_no_gravada, isc_val, data.tipo_cambio)
            gasto_id = row['id']
            for linea in data.lineas:
                await conn.execute("""
                    INSERT INTO finanzas2.cont_gasto_linea
                    (empresa_id, gasto_id, categoria_id, descripcion, importe, igv_aplica, linea_negocio_id, centro_costo_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, empresa_id, gasto_id, linea.categoria_id, linea.descripcion, linea.importe, linea.igv_aplica,
                    linea.linea_negocio_id, linea.centro_costo_id)
            pago_id = None
            if data.pagado and data.cuenta_financiera_id:
                centro_costo_id_val = data.lineas[0].centro_costo_id if data.lineas and data.lineas[0].centro_costo_id else None
                linea_negocio_id_val = data.lineas[0].linea_negocio_id if data.lineas and data.lineas[0].linea_negocio_id else None
                pago_numero = await generate_pago_number(conn, 'egreso', empresa_id)
                pago = await conn.fetchrow("""
                    INSERT INTO finanzas2.cont_pago
                    (empresa_id, numero, tipo, fecha, cuenta_financiera_id, moneda_id, monto_total, referencia, notas, centro_costo_id, linea_negocio_id)
                    VALUES ($1, $2, 'egreso', TO_DATE($3, 'YYYY-MM-DD'), $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                """, empresa_id, pago_numero, safe_date_param(data.fecha), data.cuenta_financiera_id,
                    data.moneda_id, total, data.numero_documento or data.numero, data.notas, centro_costo_id_val, linea_negocio_id_val)
                pago_id = pago['id']
                await conn.execute("""
                    INSERT INTO finanzas2.cont_pago_detalle
                    (empresa_id, pago_id, cuenta_financiera_id, medio_pago, monto)
                    VALUES ($1, $2, $3, $4, $5)
                """, empresa_id, pago_id, data.cuenta_financiera_id, data.medio_pago or 'transferencia', total)
                await conn.execute("UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = saldo_actual - $1 WHERE id = $2", total, data.cuenta_financiera_id)
                await conn.execute("""
                    INSERT INTO finanzas2.cont_pago_aplicacion
                    (empresa_id, pago_id, tipo_documento, documento_id, monto_aplicado)
                    VALUES ($1, $2, 'gasto', $3, $4)
                """, empresa_id, pago_id, gasto_id, total)
                await conn.execute("UPDATE finanzas2.cont_gasto SET pago_id = $1 WHERE id = $2", pago_id, gasto_id)
            gasto_dict = dict(row)
            gasto_dict['pago_id'] = pago_id
            lineas = await conn.fetch("""
                SELECT gl.*, c.nombre as categoria_nombre,
                       ln.nombre as linea_negocio_nombre, cc.nombre as centro_costo_nombre
                FROM finanzas2.cont_gasto_linea gl
                LEFT JOIN finanzas2.cont_categoria c ON gl.categoria_id = c.id
                LEFT JOIN finanzas2.cont_linea_negocio ln ON gl.linea_negocio_id = ln.id
                LEFT JOIN finanzas2.cont_centro_costo cc ON gl.centro_costo_id = cc.id
                WHERE gl.gasto_id = $1
            """, gasto_id)
            gasto_dict['lineas'] = [dict(l) for l in lineas]
            return gasto_dict


@router.get("/gastos/{id}", response_model=Gasto)
async def get_gasto(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            SELECT g.*, m.codigo as moneda_codigo, m.simbolo as moneda_simbolo,
                   t.nombre as proveedor_nombre
            FROM finanzas2.cont_gasto g
            LEFT JOIN finanzas2.cont_moneda m ON g.moneda_id = m.id
            LEFT JOIN finanzas2.cont_tercero t ON g.proveedor_id = t.id
            WHERE g.id = $1 AND g.empresa_id = $2
        """, id, empresa_id)
        if not row:
            raise HTTPException(404, "Gasto not found")
        gasto_dict = dict(row)
        lineas = await conn.fetch("""
            SELECT gl.*, c.nombre as categoria_nombre
            FROM finanzas2.cont_gasto_linea gl
            LEFT JOIN finanzas2.cont_categoria c ON gl.categoria_id = c.id
            WHERE gl.gasto_id = $1
        """, id)
        gasto_dict['lineas'] = [dict(l) for l in lineas]
        return gasto_dict


@router.delete("/gastos/{id}")
async def delete_gasto(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            gasto = await conn.fetchrow("SELECT * FROM finanzas2.cont_gasto WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not gasto:
                raise HTTPException(404, "Gasto not found")
            if gasto['pago_id']:
                raise HTTPException(400, "No se puede eliminar un gasto pagado. Primero elimine el pago.")
            await conn.execute("DELETE FROM finanzas2.cont_gasto WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            return {"message": "Gasto deleted"}


# =====================
# ADELANTOS
# =====================
@router.get("/adelantos", response_model=List[Adelanto])
async def list_adelantos(
    empleado_id: Optional[int] = None,
    pagado: Optional[bool] = None,
    descontado: Optional[bool] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["a.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if empleado_id:
            conditions.append(f"a.empleado_id = ${idx}"); params.append(empleado_id); idx += 1
        if pagado is not None:
            conditions.append(f"a.pagado = ${idx}"); params.append(pagado); idx += 1
        if descontado is not None:
            conditions.append(f"a.descontado = ${idx}"); params.append(descontado); idx += 1
        query = f"""
            SELECT a.*, t.nombre as empleado_nombre
            FROM finanzas2.cont_adelanto_empleado a
            LEFT JOIN finanzas2.cont_tercero t ON a.empleado_id = t.id
            WHERE {' AND '.join(conditions)}
            ORDER BY a.fecha DESC
        """
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]


@router.post("/adelantos", response_model=Adelanto)
async def create_adelanto(data: AdelantoCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            pago_id = None
            if data.pagar and data.cuenta_financiera_id:
                emp_info = await conn.fetchrow("""
                    SELECT centro_costo_id, linea_negocio_id
                    FROM finanzas2.cont_empleado_detalle WHERE tercero_id = $1
                """, data.empleado_id)
                cc_id = emp_info['centro_costo_id'] if emp_info else None
                ln_id = emp_info['linea_negocio_id'] if emp_info else None
                pago_numero = await generate_pago_number(conn, 'egreso', empresa_id)
                pago = await conn.fetchrow("""
                    INSERT INTO finanzas2.cont_pago
                    (numero, tipo, fecha, cuenta_financiera_id, monto_total, notas, centro_costo_id, linea_negocio_id, empresa_id)
                    VALUES ($1, 'egreso', TO_DATE($2, 'YYYY-MM-DD'), $3, $4, $5, $6, $7, $8)
                    RETURNING id
                """, pago_numero, safe_date_param(data.fecha), data.cuenta_financiera_id, data.monto,
                    "Adelanto a empleado", cc_id, ln_id, empresa_id)
                pago_id = pago['id']
                await conn.execute("""
                    INSERT INTO finanzas2.cont_pago_detalle
                    (pago_id, cuenta_financiera_id, medio_pago, monto, empresa_id)
                    VALUES ($1, $2, $3, $4, $5)
                """, pago_id, data.cuenta_financiera_id, data.medio_pago, data.monto, empresa_id)
                await conn.execute("""
                    UPDATE finanzas2.cont_cuenta_financiera
                    SET saldo_actual = saldo_actual - $1 WHERE id = $2
                """, data.monto, data.cuenta_financiera_id)
            row = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_adelanto_empleado
                (empleado_id, fecha, monto, motivo, pagado, pago_id, empresa_id)
                VALUES ($1, TO_DATE($2, 'YYYY-MM-DD'), $3, $4, $5, $6, $7)
                RETURNING *
            """, data.empleado_id, safe_date_param(data.fecha), data.monto, data.motivo,
                data.pagar, pago_id, empresa_id)
            if pago_id:
                await conn.execute("""
                    INSERT INTO finanzas2.cont_pago_aplicacion
                    (pago_id, tipo_documento, documento_id, monto_aplicado, empresa_id)
                    VALUES ($1, 'adelanto', $2, $3, $4)
                """, pago_id, row['id'], data.monto, empresa_id)
            emp = await conn.fetchrow("SELECT nombre FROM finanzas2.cont_tercero WHERE id = $1 AND empresa_id = $2", data.empleado_id, empresa_id)
            result = dict(row)
            result['empleado_nombre'] = emp['nombre'] if emp else None
            return result


@router.post("/adelantos/{id}/pagar", response_model=Adelanto)
async def pagar_adelanto(
    id: int,
    cuenta_financiera_id: int = Query(...),
    medio_pago: str = Query(default="efectivo"),
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            adelanto = await conn.fetchrow("SELECT * FROM finanzas2.cont_adelanto_empleado WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not adelanto:
                raise HTTPException(404, "Adelanto no encontrado")
            if adelanto['pagado']:
                raise HTTPException(400, "Este adelanto ya fue pagado")
            emp_info = await conn.fetchrow("SELECT centro_costo_id, linea_negocio_id FROM finanzas2.cont_empleado_detalle WHERE tercero_id = $1", adelanto['empleado_id'])
            cc_id = emp_info['centro_costo_id'] if emp_info else None
            ln_id = emp_info['linea_negocio_id'] if emp_info else None
            pago_numero = await generate_pago_number(conn, 'egreso', empresa_id)
            pago = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_pago
                (numero, tipo, fecha, cuenta_financiera_id, monto_total, notas, centro_costo_id, linea_negocio_id, empresa_id)
                VALUES ($1, 'egreso', CURRENT_DATE, $2, $3, $4, $5, $6, $7)
                RETURNING id
            """, pago_numero, cuenta_financiera_id, adelanto['monto'],
                "Pago de adelanto a empleado", cc_id, ln_id, empresa_id)
            pago_id = pago['id']
            await conn.execute("""
                INSERT INTO finanzas2.cont_pago_detalle
                (pago_id, cuenta_financiera_id, medio_pago, monto, empresa_id)
                VALUES ($1, $2, $3, $4, $5)
            """, pago_id, cuenta_financiera_id, medio_pago, adelanto['monto'], empresa_id)
            await conn.execute("UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = saldo_actual - $1 WHERE id = $2", adelanto['monto'], cuenta_financiera_id)
            row = await conn.fetchrow("UPDATE finanzas2.cont_adelanto_empleado SET pagado = TRUE, pago_id = $1 WHERE id = $2 RETURNING *", pago_id, id)
            await conn.execute("""
                INSERT INTO finanzas2.cont_pago_aplicacion
                (pago_id, tipo_documento, documento_id, monto_aplicado, empresa_id)
                VALUES ($1, 'adelanto', $2, $3, $4)
            """, pago_id, id, adelanto['monto'], empresa_id)
            emp = await conn.fetchrow("SELECT nombre FROM finanzas2.cont_tercero WHERE id = $1 AND empresa_id = $2", row['empleado_id'], empresa_id)
            result = dict(row)
            result['empleado_nombre'] = emp['nombre'] if emp else None
            return result


@router.put("/adelantos/{id}", response_model=Adelanto)
async def update_adelanto(id: int, data: AdelantoCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        existing = await conn.fetchrow("SELECT * FROM finanzas2.cont_adelanto_empleado WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not existing:
            raise HTTPException(404, "Adelanto no encontrado")
        if existing['pagado'] or existing['descontado']:
            raise HTTPException(400, "No se puede editar un adelanto pagado o descontado")
        row = await conn.fetchrow("""
            UPDATE finanzas2.cont_adelanto_empleado
            SET empleado_id = $1, fecha = $2, monto = $3, motivo = $4
            WHERE id = $5
            RETURNING *
        """, data.empleado_id, data.fecha, data.monto, data.motivo, id)
        emp = await conn.fetchrow("SELECT nombre FROM finanzas2.cont_tercero WHERE id = $1 AND empresa_id = $2", row['empleado_id'], empresa_id)
        result = dict(row)
        result['empleado_nombre'] = emp['nombre'] if emp else None
        return result


@router.delete("/adelantos/{id}")
async def delete_adelanto(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        existing = await conn.fetchrow("SELECT * FROM finanzas2.cont_adelanto_empleado WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not existing:
            raise HTTPException(404, "Adelanto no encontrado")
        if existing['pagado']:
            raise HTTPException(400, "No se puede eliminar un adelanto pagado. Primero anule el pago.")
        if existing['descontado']:
            raise HTTPException(400, "No se puede eliminar un adelanto ya descontado en planilla")
        await conn.execute("DELETE FROM finanzas2.cont_adelanto_empleado WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        return {"message": "Adelanto eliminado"}
