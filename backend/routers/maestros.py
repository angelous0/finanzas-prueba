from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import get_pool
from models import (
    Moneda, MonedaCreate,
    Categoria, CategoriaCreate, CategoriaUpdate,
    CentroCosto, CentroCostoCreate,
    LineaNegocio, LineaNegocioCreate,
)
from dependencies import get_empresa_id

router = APIRouter()

# =====================
# MONEDAS
# =====================
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

# =====================
# CATEGORIAS
# =====================
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
            rows = await conn.fetch(
                base_query + " AND c.tipo = $2 ORDER BY c.nombre", empresa_id, tipo
            )
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

# =====================
# CENTROS DE COSTO
# =====================
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

# =====================
# LINEAS DE NEGOCIO
# =====================
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
            raise HTTPException(404, "Linea de negocio not found")
        return {"message": "Linea de negocio deleted"}


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
            raise HTTPException(404, "Linea de negocio not found")
        return dict(row)
