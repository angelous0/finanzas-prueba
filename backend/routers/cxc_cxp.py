from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta
from database import get_pool
from models import CXC
from dependencies import get_empresa_id

router = APIRouter()


@router.get("/cxc", response_model=List[CXC])
async def list_cxc(estado: Optional[str] = None, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["cxc.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if estado:
            conditions.append(f"cxc.estado = ${idx}")
            params.append(estado); idx += 1
        query = f"""
            SELECT cxc.*, t.nombre as cliente_nombre
            FROM finanzas2.cont_cxc cxc
            LEFT JOIN finanzas2.cont_tercero t ON cxc.cliente_id = t.id
            WHERE {' AND '.join(conditions)}
            ORDER BY cxc.fecha_vencimiento ASC
        """
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]


@router.get("/cxp")
async def list_cxp(estado: Optional[str] = None, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["cxp.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if estado:
            conditions.append(f"cxp.estado = ${idx}")
            params.append(estado); idx += 1
        query = f"""
            SELECT cxp.*, t.nombre as proveedor_nombre, fp.numero as factura_numero
            FROM finanzas2.cont_cxp cxp
            LEFT JOIN finanzas2.cont_tercero t ON cxp.proveedor_id = t.id
            LEFT JOIN finanzas2.cont_factura_proveedor fp ON cxp.factura_id = fp.id
            WHERE {' AND '.join(conditions)}
            ORDER BY cxp.fecha_vencimiento ASC
        """
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]
