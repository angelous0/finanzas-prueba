from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import get_pool
from app.schemas import LineaNegocio, LineaNegocioCreate
from app.core.dependencies import get_empresa_id

router = APIRouter(tags=["Líneas de Negocio"])


@router.get("/lineas-negocio", response_model=List[LineaNegocio])
async def list_lineas_negocio(empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        rows = await conn.fetch("SELECT * FROM finanzas2.cont_linea_negocio WHERE empresa_id = $1 ORDER BY nombre", empresa_id)
        return [dict(r) for r in rows]


@router.post("/lineas-negocio", response_model=LineaNegocio)
async def create_linea_negocio(data: LineaNegocioCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            INSERT INTO finanzas2.cont_linea_negocio (empresa_id, codigo, nombre, descripcion, activo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        """, empresa_id, data.codigo, data.nombre, data.descripcion, data.activo)
        return dict(row)


@router.delete("/lineas-negocio/{id}")
async def delete_linea_negocio(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        result = await conn.execute("DELETE FROM finanzas2.cont_linea_negocio WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if result == "DELETE 0":
            raise HTTPException(404, "Línea de negocio not found")
        return {"message": "Línea de negocio deleted"}


@router.put("/lineas-negocio/{id}", response_model=LineaNegocio)
async def update_linea_negocio(id: int, data: LineaNegocioCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            UPDATE finanzas2.cont_linea_negocio SET codigo = $1, nombre = $2, descripcion = $3
            WHERE id = $4 AND empresa_id = $5 RETURNING *
        """, data.codigo, data.nombre, data.descripcion, id, empresa_id)
        if not row:
            raise HTTPException(404, "Línea de negocio not found")
        return dict(row)
