from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel
from database import get_pool
from dependencies import get_empresa_id

router = APIRouter()


# ── Pydantic Models ──

class PlanillaDetalleIn(BaseModel):
    trabajador_id: Optional[str] = None
    trabajador_nombre: Optional[str] = None
    tipo_trabajador: Optional[str] = None
    unidad_interna_id: Optional[int] = None
    linea_negocio_id: Optional[int] = None
    salario_base: float = 0
    bonificaciones: float = 0
    adelantos: float = 0
    otros_descuentos: float = 0
    neto_pagar: float = 0
    notas: Optional[str] = None


class PlanillaCreate(BaseModel):
    periodo: str
    tipo: Optional[str] = "quincenal"
    fecha_inicio: date
    fecha_fin: date
    fecha_pago: Optional[date] = None
    notas: Optional[str] = None
    lineas: List[PlanillaDetalleIn] = []


class PlanillaUpdate(BaseModel):
    periodo: Optional[str] = None
    tipo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    fecha_pago: Optional[date] = None
    estado: Optional[str] = None
    notas: Optional[str] = None
    lineas: Optional[List[PlanillaDetalleIn]] = None


# ── Helpers ──

async def _enrich_planilla(conn, planilla: dict) -> dict:
    """Load detail lines + joined names for a single planilla."""
    rows = await conn.fetch("""
        SELECT d.*,
               ui.nombre AS unidad_interna_nombre,
               ln.nombre AS linea_negocio_nombre
        FROM finanzas2.cont_planilla_detalle d
        LEFT JOIN finanzas2.fin_unidad_interna ui ON d.unidad_interna_id = ui.id
        LEFT JOIN finanzas2.cont_linea_negocio ln ON d.linea_negocio_id = ln.id
        WHERE d.planilla_id = $1
        ORDER BY d.id
    """, planilla["id"])
    planilla["lineas"] = [dict(r) for r in rows]
    return planilla


# ── LIST ──

@router.get("/planillas")
async def list_planillas(
    periodo: Optional[str] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conds = ["p.empresa_id = $1"]
        params: list = [empresa_id]
        idx = 2
        if periodo:
            conds.append(f"p.periodo ILIKE '%' || ${idx} || '%'")
            params.append(periodo); idx += 1
        if tipo:
            conds.append(f"p.tipo = ${idx}")
            params.append(tipo); idx += 1
        if estado:
            conds.append(f"p.estado = ${idx}")
            params.append(estado); idx += 1

        query = f"""
            SELECT p.*
            FROM finanzas2.cont_planilla p
            WHERE {' AND '.join(conds)}
            ORDER BY p.fecha_inicio DESC
        """
        rows = await conn.fetch(query, *params)
        result = []
        for row in rows:
            p = dict(row)
            p = await _enrich_planilla(conn, p)
            result.append(p)
        return result


# ── GET BY ID ──

@router.get("/planillas/{planilla_id}")
async def get_planilla(planilla_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow(
            "SELECT * FROM finanzas2.cont_planilla WHERE id=$1 AND empresa_id=$2",
            planilla_id, empresa_id,
        )
        if not row:
            raise HTTPException(404, "Planilla no encontrada")
        p = dict(row)
        return await _enrich_planilla(conn, p)


# ── CREATE ──

@router.post("/planillas")
async def create_planilla(data: PlanillaCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")

        # Calculate totals from lines
        total_bruto = sum(l.salario_base for l in data.lineas)
        total_bonif = sum(l.bonificaciones for l in data.lineas)
        total_adel = sum(l.adelantos for l in data.lineas)
        total_desc = sum(l.otros_descuentos for l in data.lineas)
        total_neto = sum(l.neto_pagar for l in data.lineas)

        pid = await conn.fetchval("""
            INSERT INTO finanzas2.cont_planilla
                (empresa_id, periodo, tipo, fecha_inicio, fecha_fin, fecha_pago,
                 total_bruto, total_adelantos, total_descuentos, total_neto,
                 estado, notas, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'borrador',$11,NOW(),NOW())
            RETURNING id
        """, empresa_id, data.periodo, data.tipo,
            data.fecha_inicio, data.fecha_fin, data.fecha_pago,
            total_bruto + total_bonif, total_adel, total_desc, total_neto,
            data.notas)

        for l in data.lineas:
            await conn.execute("""
                INSERT INTO finanzas2.cont_planilla_detalle
                    (empresa_id, planilla_id, trabajador_id, trabajador_nombre, tipo_trabajador,
                     unidad_interna_id, linea_negocio_id, salario_base, bonificaciones,
                     adelantos, otros_descuentos, neto_pagar, notas, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
            """, empresa_id, pid, l.trabajador_id, l.trabajador_nombre, l.tipo_trabajador,
                l.unidad_interna_id, l.linea_negocio_id, l.salario_base, l.bonificaciones,
                l.adelantos, l.otros_descuentos, l.neto_pagar, l.notas)

        row = await conn.fetchrow("SELECT * FROM finanzas2.cont_planilla WHERE id=$1", pid)
        return await _enrich_planilla(conn, dict(row))


# ── UPDATE ──

@router.put("/planillas/{planilla_id}")
async def update_planilla(planilla_id: int, data: PlanillaUpdate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        existing = await conn.fetchrow(
            "SELECT * FROM finanzas2.cont_planilla WHERE id=$1 AND empresa_id=$2",
            planilla_id, empresa_id,
        )
        if not existing:
            raise HTTPException(404, "Planilla no encontrada")

        # Update header fields
        sets = []
        params = []
        idx = 1
        for field in ["periodo", "tipo", "fecha_inicio", "fecha_fin", "fecha_pago", "estado", "notas"]:
            val = getattr(data, field, None)
            if val is not None:
                sets.append(f"{field} = ${idx}")
                params.append(val); idx += 1

        # If lines provided, recalculate totals & replace lines
        if data.lineas is not None:
            total_bruto = sum(l.salario_base + l.bonificaciones for l in data.lineas)
            total_adel = sum(l.adelantos for l in data.lineas)
            total_desc = sum(l.otros_descuentos for l in data.lineas)
            total_neto = sum(l.neto_pagar for l in data.lineas)

            for col, val in [("total_bruto", total_bruto), ("total_adelantos", total_adel),
                             ("total_descuentos", total_desc), ("total_neto", total_neto)]:
                sets.append(f"{col} = ${idx}")
                params.append(val); idx += 1

        sets.append(f"updated_at = NOW()")
        params.append(planilla_id); idx_id = idx

        await conn.execute(
            f"UPDATE finanzas2.cont_planilla SET {', '.join(sets)} WHERE id = ${idx_id}",
            *params,
        )

        # Replace detail lines
        if data.lineas is not None:
            await conn.execute("DELETE FROM finanzas2.cont_planilla_detalle WHERE planilla_id=$1", planilla_id)
            for l in data.lineas:
                await conn.execute("""
                    INSERT INTO finanzas2.cont_planilla_detalle
                        (empresa_id, planilla_id, trabajador_id, trabajador_nombre, tipo_trabajador,
                         unidad_interna_id, linea_negocio_id, salario_base, bonificaciones,
                         adelantos, otros_descuentos, neto_pagar, notas, created_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
                """, empresa_id, planilla_id, l.trabajador_id, l.trabajador_nombre, l.tipo_trabajador,
                    l.unidad_interna_id, l.linea_negocio_id, l.salario_base, l.bonificaciones,
                    l.adelantos, l.otros_descuentos, l.neto_pagar, l.notas)

        row = await conn.fetchrow("SELECT * FROM finanzas2.cont_planilla WHERE id=$1", planilla_id)
        return await _enrich_planilla(conn, dict(row))


# ── DELETE ──

@router.delete("/planillas/{planilla_id}")
async def delete_planilla(planilla_id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        existing = await conn.fetchrow(
            "SELECT id FROM finanzas2.cont_planilla WHERE id=$1 AND empresa_id=$2",
            planilla_id, empresa_id,
        )
        if not existing:
            raise HTTPException(404, "Planilla no encontrada")
        await conn.execute("DELETE FROM finanzas2.cont_planilla WHERE id=$1", planilla_id)
        return {"ok": True}


# ── TRABAJADORES (from produccion.prod_personas_produccion) ──

@router.get("/planillas/trabajadores/list")
async def list_trabajadores(empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT pp.id, pp.nombre, pp.tipo_persona, pp.unidad_interna_id,
                   ui.nombre AS unidad_interna_nombre
            FROM produccion.prod_personas_produccion pp
            LEFT JOIN finanzas2.fin_unidad_interna ui ON pp.unidad_interna_id = ui.id
            WHERE pp.activo = true
            ORDER BY pp.nombre
        """)
        return [dict(r) for r in rows]


# ── RESUMEN (summary for reporting) ──

@router.get("/planillas/resumen/totales")
async def resumen_planillas(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conds = ["p.empresa_id = $1"]
        params: list = [empresa_id]
        idx = 2
        if fecha_desde:
            conds.append(f"p.fecha_inicio >= ${idx}")
            params.append(fecha_desde); idx += 1
        if fecha_hasta:
            conds.append(f"p.fecha_fin <= ${idx}")
            params.append(fecha_hasta); idx += 1

        # Summary by unidad interna
        por_unidad = await conn.fetch(f"""
            SELECT d.unidad_interna_id, ui.nombre AS unidad_nombre,
                   COUNT(DISTINCT d.trabajador_id) AS num_trabajadores,
                   SUM(d.neto_pagar) AS total_neto
            FROM finanzas2.cont_planilla_detalle d
            JOIN finanzas2.cont_planilla p ON d.planilla_id = p.id
            LEFT JOIN finanzas2.fin_unidad_interna ui ON d.unidad_interna_id = ui.id
            WHERE {' AND '.join(conds)}
            GROUP BY d.unidad_interna_id, ui.nombre
            ORDER BY total_neto DESC
        """, *params)

        # Summary by linea de negocio
        por_linea = await conn.fetch(f"""
            SELECT d.linea_negocio_id, ln.nombre AS linea_nombre,
                   SUM(d.neto_pagar) AS total_neto
            FROM finanzas2.cont_planilla_detalle d
            JOIN finanzas2.cont_planilla p ON d.planilla_id = p.id
            LEFT JOIN finanzas2.cont_linea_negocio ln ON d.linea_negocio_id = ln.id
            WHERE {' AND '.join(conds)}
            GROUP BY d.linea_negocio_id, ln.nombre
            ORDER BY total_neto DESC
        """, *params)

        # Grand totals
        totals = await conn.fetchrow(f"""
            SELECT COUNT(*) AS num_planillas,
                   COALESCE(SUM(p.total_bruto), 0) AS total_bruto,
                   COALESCE(SUM(p.total_neto), 0) AS total_neto,
                   COALESCE(SUM(p.total_adelantos), 0) AS total_adelantos,
                   COALESCE(SUM(p.total_descuentos), 0) AS total_descuentos
            FROM finanzas2.cont_planilla p
            WHERE {' AND '.join(conds)}
        """, *params)

        return {
            "totales": dict(totals) if totals else {},
            "por_unidad_interna": [dict(r) for r in por_unidad],
            "por_linea_negocio": [dict(r) for r in por_linea],
        }
