from fastapi import APIRouter, HTTPException
from typing import List

from database import get_pool
from app.schemas import Moneda, MonedaCreate

router = APIRouter(tags=["Monedas"])


@router.get("/monedas", response_model=List[Moneda])
async def list_monedas():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        rows = await conn.fetch("SELECT * FROM finanzas2.cont_moneda ORDER BY codigo")
        return [dict(r) for r in rows]


@router.post("/monedas", response_model=Moneda)
async def create_moneda(data: MonedaCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            INSERT INTO finanzas2.cont_moneda (codigo, nombre, simbolo, es_principal, activo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        """, data.codigo, data.nombre, data.simbolo, data.es_principal, data.activo)
        return dict(row)


@router.delete("/monedas/{id}")
async def delete_moneda(id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        result = await conn.execute("DELETE FROM finanzas2.cont_moneda WHERE id = $1", id)
        if result == "DELETE 0":
            raise HTTPException(404, "Moneda not found")
        return {"message": "Moneda deleted"}
