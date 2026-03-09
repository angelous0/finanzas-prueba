from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional

from database import get_pool
from app.schemas import Categoria, CategoriaCreate, CategoriaUpdate
from app.core.dependencies import get_empresa_id

router = APIRouter(tags=["Categorías"])


@router.get("/categorias")
async def list_categorias(empresa_id: int = Depends(get_empresa_id), tipo: Optional[str] = None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        base_query = """
            SELECT c.*, cp.nombre as padre_nombre
            FROM finanzas2.cont_categoria c
            LEFT JOIN finanzas2.cont_categoria cp ON c.padre_id = cp.id
            WHERE c.empresa_id = $1
        """
        if tipo:
            rows = await conn.fetch(base_query + " AND c.tipo = $2 ORDER BY c.nombre", empresa_id, tipo)
        else:
            rows = await conn.fetch(base_query + " ORDER BY c.tipo, c.nombre", empresa_id)
        result = []
        for r in rows:
            item = dict(r)
            padre_nombre = item.pop("padre_nombre", None)
            item["nombre_completo"] = f"{padre_nombre} > {item['nombre']}" if padre_nombre else item["nombre"]
            result.append(item)
        return result


@router.post("/categorias", response_model=Categoria)
async def create_categoria(data: CategoriaCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            INSERT INTO finanzas2.cont_categoria (empresa_id, codigo, nombre, tipo, padre_id, descripcion, cuenta_gasto_id, activo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """, empresa_id, data.codigo, data.nombre, data.tipo, data.padre_id, data.descripcion, data.cuenta_gasto_id, data.activo)
        return dict(row)


@router.put("/categorias/{id}", response_model=Categoria)
async def update_categoria(id: int, data: CategoriaUpdate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        updates = []
        values = []
        idx = 1
        for field, value in data.model_dump(exclude_unset=True).items():
            updates.append(f"{field} = ${idx}")
            values.append(value)
            idx += 1
        if not updates:
            raise HTTPException(400, "No fields to update")
        values.append(empresa_id)
        values.append(id)
        query = f"UPDATE finanzas2.cont_categoria SET {', '.join(updates)}, updated_at = NOW() WHERE empresa_id = ${idx} AND id = ${idx+1} RETURNING *"
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(404, "Categoria not found")
        return dict(row)


@router.delete("/categorias/{id}")
async def delete_categoria(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        result = await conn.execute("DELETE FROM finanzas2.cont_categoria WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if result == "DELETE 0":
            raise HTTPException(404, "Categoria not found")
        return {"message": "Categoria deleted"}
