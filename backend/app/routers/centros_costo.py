from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import get_pool
from app.schemas import CentroCosto, CentroCostoCreate
from app.core.dependencies import get_empresa_id

router = APIRouter(tags=["Centros de Costo"])


@router.get("/centros-costo", response_model=List[CentroCosto])
async def list_centros_costo(empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        rows = await conn.fetch("SELECT * FROM finanzas2.cont_centro_costo WHERE empresa_id = $1 ORDER BY nombre", empresa_id)
        return [dict(r) for r in rows]


@router.post("/centros-costo", response_model=CentroCosto)
async def create_centro_costo(data: CentroCostoCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            INSERT INTO finanzas2.cont_centro_costo (empresa_id, codigo, nombre, descripcion, activo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        """, empresa_id, data.codigo, data.nombre, data.descripcion, data.activo)
        return dict(row)


@router.delete("/centros-costo/{id}")
async def delete_centro_costo(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        result = await conn.execute("DELETE FROM finanzas2.cont_centro_costo WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if result == "DELETE 0":
            raise HTTPException(404, "Centro de costo not found")
        return {"message": "Centro de costo deleted"}


@router.put("/centros-costo/{id}", response_model=CentroCosto)
async def update_centro_costo(id: int, data: CentroCostoCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            UPDATE finanzas2.cont_centro_costo SET codigo = $1, nombre = $2, descripcion = $3
            WHERE id = $4 AND empresa_id = $5 RETURNING *
        """, data.codigo, data.nombre, data.descripcion, id, empresa_id)
        if not row:
            raise HTTPException(404, "Centro de costo not found")
        return dict(row)
