from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import date
from database import get_pool
from models import CuentaFinanciera, CuentaFinancieraCreate, CuentaFinancieraUpdate
from dependencies import get_empresa_id

router = APIRouter()


@router.get("/cuentas-financieras", response_model=List[CuentaFinanciera])
async def list_cuentas_financieras(empresa_id: int = Depends(get_empresa_id), tipo: Optional[str] = None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        query = """
            SELECT cf.*, m.codigo as moneda_codigo
            FROM finanzas2.cont_cuenta_financiera cf
            LEFT JOIN finanzas2.cont_moneda m ON cf.moneda_id = m.id
            WHERE cf.empresa_id = $1
        """
        if tipo:
            query += " AND cf.tipo = $2"
            rows = await conn.fetch(query + " ORDER BY cf.nombre", empresa_id, tipo)
        else:
            rows = await conn.fetch(query + " ORDER BY cf.nombre", empresa_id)
        return [dict(r) for r in rows]


@router.post("/cuentas-financieras", response_model=CuentaFinanciera)
async def create_cuenta_financiera(data: CuentaFinancieraCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            INSERT INTO finanzas2.cont_cuenta_financiera
            (empresa_id, nombre, tipo, banco, numero_cuenta, cci, moneda_id, saldo_actual, saldo_inicial, activo, cuenta_contable_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10)
            RETURNING *
        """, empresa_id, data.nombre, data.tipo, data.banco, data.numero_cuenta, data.cci,
            data.moneda_id, data.saldo_actual, data.activo, data.cuenta_contable_id)
        return dict(row)


@router.put("/cuentas-financieras/{id}", response_model=CuentaFinanciera)
async def update_cuenta_financiera(id: int, data: CuentaFinancieraUpdate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        updates = []
        values = []
        idx = 1
        saldo_inicial_changed = False
        new_saldo_inicial = None
        for field, value in data.model_dump(exclude_unset=True).items():
            updates.append(f"{field} = ${idx}"); values.append(value); idx += 1
            if field == 'saldo_inicial':
                saldo_inicial_changed = True
                new_saldo_inicial = value
        if not updates:
            raise HTTPException(400, "No fields to update")
        values.append(empresa_id); values.append(id)
        query = f"UPDATE finanzas2.cont_cuenta_financiera SET {', '.join(updates)}, updated_at = NOW() WHERE empresa_id = ${idx} AND id = ${idx+1} RETURNING *"
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(404, "Cuenta financiera not found")
        if saldo_inicial_changed and new_saldo_inicial is not None:
            ingresos = await conn.fetchval("""
                SELECT COALESCE(SUM(pd.monto), 0) FROM finanzas2.cont_pago_detalle pd
                JOIN finanzas2.cont_pago p ON pd.pago_id = p.id
                WHERE pd.cuenta_financiera_id = $1 AND p.tipo = 'ingreso'
            """, id)
            egresos = await conn.fetchval("""
                SELECT COALESCE(SUM(pd.monto), 0) FROM finanzas2.cont_pago_detalle pd
                JOIN finanzas2.cont_pago p ON pd.pago_id = p.id
                WHERE pd.cuenta_financiera_id = $1 AND p.tipo = 'egreso'
            """, id)
            nuevo_saldo = float(new_saldo_inicial) + float(ingresos) - float(egresos)
            row = await conn.fetchrow(
                "UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = $1 WHERE id = $2 RETURNING *",
                nuevo_saldo, id)
        return dict(row)


@router.delete("/cuentas-financieras/{id}")
async def delete_cuenta_financiera(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        result = await conn.execute("DELETE FROM finanzas2.cont_cuenta_financiera WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if result == "DELETE 0":
            raise HTTPException(404, "Cuenta financiera not found")
        return {"message": "Cuenta financiera deleted"}


@router.get("/cuentas-financieras/{id}/kardex")
async def get_kardex_cuenta(
    id: int,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        cuenta = await conn.fetchrow(
            "SELECT * FROM finanzas2.cont_cuenta_financiera WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not cuenta:
            raise HTTPException(404, "Cuenta no encontrada")
        conditions = ["pd.cuenta_financiera_id = $1", "pd.empresa_id = $2"]
        params = [id, empresa_id]
        idx = 3
        if fecha_desde:
            conditions.append(f"p.fecha >= ${idx}"); params.append(fecha_desde); idx += 1
        if fecha_hasta:
            conditions.append(f"p.fecha <= ${idx}"); params.append(fecha_hasta); idx += 1
        rows = await conn.fetch(f"""
            SELECT p.id as pago_id, p.numero, p.tipo, p.fecha, p.notas,
                   pd.medio_pago, pd.monto, pd.referencia
            FROM finanzas2.cont_pago_detalle pd
            JOIN finanzas2.cont_pago p ON pd.pago_id = p.id
            WHERE {' AND '.join(conditions)}
            ORDER BY p.fecha ASC, pd.id ASC
        """, *params)
        saldo_base = float(cuenta.get('saldo_inicial') or 0)
        if fecha_desde:
            pre_ingresos = await conn.fetchval("""
                SELECT COALESCE(SUM(pd.monto), 0) FROM finanzas2.cont_pago_detalle pd
                JOIN finanzas2.cont_pago p ON pd.pago_id = p.id
                WHERE pd.cuenta_financiera_id = $1 AND pd.empresa_id = $2 AND p.tipo = 'ingreso' AND p.fecha < $3
            """, id, empresa_id, fecha_desde) or 0
            pre_egresos = await conn.fetchval("""
                SELECT COALESCE(SUM(pd.monto), 0) FROM finanzas2.cont_pago_detalle pd
                JOIN finanzas2.cont_pago p ON pd.pago_id = p.id
                WHERE pd.cuenta_financiera_id = $1 AND pd.empresa_id = $2 AND p.tipo = 'egreso' AND p.fecha < $3
            """, id, empresa_id, fecha_desde) or 0
            saldo_periodo = saldo_base + float(pre_ingresos) - float(pre_egresos)
        else:
            saldo_periodo = saldo_base
        movimientos = []
        saldo = saldo_periodo
        for r in rows:
            monto = float(r['monto'])
            if r['tipo'] == 'ingreso':
                saldo += monto
            else:
                saldo -= monto
            movimientos.append({
                "fecha": str(r['fecha']), "numero": r['numero'], "tipo": r['tipo'],
                "concepto": r['notas'] or r['medio_pago'], "medio_pago": r['medio_pago'],
                "referencia": r['referencia'],
                "ingreso": monto if r['tipo'] == 'ingreso' else 0,
                "egreso": monto if r['tipo'] == 'egreso' else 0,
                "saldo": round(saldo, 2)
            })
        total_ingresos = sum(m['ingreso'] for m in movimientos)
        total_egresos = sum(m['egreso'] for m in movimientos)
        return {
            "cuenta": dict(cuenta), "saldo_inicial": round(saldo_periodo, 2),
            "total_ingresos": round(total_ingresos, 2), "total_egresos": round(total_egresos, 2),
            "saldo_final": round(saldo, 2), "movimientos": movimientos
        }


@router.post("/cuentas-financieras/recalcular-saldos")
async def recalcular_saldos(empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        cuentas = await conn.fetch(
            "SELECT id, saldo_actual FROM finanzas2.cont_cuenta_financiera WHERE empresa_id = $1", empresa_id)
        results = []
        for cuenta in cuentas:
            cid = cuenta['id']
            saldo_anterior = float(cuenta['saldo_actual'])
            ingresos = await conn.fetchval("""
                SELECT COALESCE(SUM(pd.monto), 0) FROM finanzas2.cont_pago_detalle pd
                JOIN finanzas2.cont_pago p ON pd.pago_id = p.id
                WHERE pd.cuenta_financiera_id = $1 AND pd.empresa_id = $2 AND p.tipo = 'ingreso'
            """, cid, empresa_id) or 0
            egresos = await conn.fetchval("""
                SELECT COALESCE(SUM(pd.monto), 0) FROM finanzas2.cont_pago_detalle pd
                JOIN finanzas2.cont_pago p ON pd.pago_id = p.id
                WHERE pd.cuenta_financiera_id = $1 AND pd.empresa_id = $2 AND p.tipo = 'egreso'
            """, cid, empresa_id) or 0
            saldo_base = await conn.fetchval("""
                SELECT COALESCE(saldo_inicial, 0) FROM finanzas2.cont_cuenta_financiera
                WHERE id = $1 AND empresa_id = $2
            """, cid, empresa_id) or 0
            nuevo_saldo = float(saldo_base) + float(ingresos) - float(egresos)
            await conn.execute("""
                UPDATE finanzas2.cont_cuenta_financiera SET saldo_actual = $1, updated_at = NOW()
                WHERE id = $2 AND empresa_id = $3
            """, nuevo_saldo, cid, empresa_id)
            results.append({"cuenta_id": cid, "saldo_anterior": saldo_anterior, "saldo_nuevo": round(nuevo_saldo, 2)})
        return {"message": f"Saldos recalculados para {len(results)} cuentas", "cuentas": results}


@router.post("/cuentas-financieras/mapear-cuentas-default")
async def mapear_cuentas_default(empresa_id: int = Depends(get_empresa_id)):
    MAPPING = [
        ('BCP', '1041'), ('BBVA', '1042'), ('INTERBANK', '1043'), ('IBK', '1043'), ('CAJA', '101'),
    ]
    pool = await get_pool()
    async with pool.acquire() as conn:
        cuentas_fin = await conn.fetch(
            "SELECT id, nombre FROM finanzas2.cont_cuenta_financiera WHERE empresa_id = $1", empresa_id)
        cuentas_cont = await conn.fetch(
            "SELECT id, codigo FROM finanzas2.cont_cuenta WHERE empresa_id = $1", empresa_id)
        code_map = {r['codigo']: r['id'] for r in cuentas_cont}
        mapped = []
        faltantes = []
        for cf in cuentas_fin:
            nombre_upper = cf['nombre'].upper()
            for keyword, codigo in MAPPING:
                if keyword in nombre_upper:
                    if codigo in code_map:
                        await conn.execute(
                            "UPDATE finanzas2.cont_cuenta_financiera SET cuenta_contable_id = $1 WHERE id = $2",
                            code_map[codigo], cf['id'])
                        mapped.append(f"{cf['nombre']} -> {codigo}")
                    else:
                        faltantes.append(f"Cuenta contable {codigo} no existe para mapear {cf['nombre']}")
                    break
        return {"mapped": mapped, "faltantes": faltantes}
