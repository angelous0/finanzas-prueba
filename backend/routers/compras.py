from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import date, datetime, timedelta
from database import get_pool
from models import OC, OCCreate, OCUpdate, FacturaProveedor, FacturaProveedorCreate, FacturaProveedorUpdate
from dependencies import get_empresa_id, get_next_correlativo, safe_date_param
from services.distribucion_service import recalcular_distribuciones_factura
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


async def generate_oc_number(conn, empresa_id: int) -> str:
    year = datetime.now().year
    prefijo = f"OC-{year}-"
    return await get_next_correlativo(conn, empresa_id, 'oc', prefijo)


async def generate_factura_number(conn, empresa_id: int) -> str:
    year = datetime.now().year
    prefijo = f"FP-{year}-"
    return await get_next_correlativo(conn, empresa_id, 'factura_proveedor', prefijo)


async def get_factura_proveedor(id: int, empresa_id: int) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            SELECT fp.*, t.nombre as proveedor_nombre, m.codigo as moneda_codigo, m.simbolo as moneda_simbolo
            FROM finanzas2.cont_factura_proveedor fp
            LEFT JOIN finanzas2.cont_tercero t ON fp.proveedor_id = t.id
            LEFT JOIN finanzas2.cont_moneda m ON fp.moneda_id = m.id
            WHERE fp.id = $1 AND fp.empresa_id = $2
        """, id, empresa_id)
        if not row:
            raise HTTPException(404, "Factura not found")
        fp_dict = dict(row)
        lineas = await conn.fetch("""
            SELECT fpl.*, c.nombre as categoria_nombre, c.padre_id as categoria_padre_id,
                   cp.nombre as categoria_padre_nombre,
                   ln.nombre as linea_negocio_nombre, cc.nombre as centro_costo_nombre
            FROM finanzas2.cont_factura_proveedor_linea fpl
            LEFT JOIN finanzas2.cont_categoria c ON fpl.categoria_id = c.id
            LEFT JOIN finanzas2.cont_categoria cp ON c.padre_id = cp.id
            LEFT JOIN finanzas2.cont_linea_negocio ln ON fpl.linea_negocio_id = ln.id
            LEFT JOIN finanzas2.cont_centro_costo cc ON fpl.centro_costo_id = cc.id
            WHERE fpl.factura_id = $1 ORDER BY fpl.id
        """, id)
        fp_dict['lineas'] = [dict(l) for l in lineas]
        return fp_dict


# =====================
# ORDENES DE COMPRA
# =====================
@router.get("/ordenes-compra", response_model=List[OC])
async def list_ordenes_compra(
    estado: Optional[str] = None,
    proveedor_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["oc.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if estado:
            conditions.append(f"oc.estado = ${idx}"); params.append(estado); idx += 1
        if proveedor_id:
            conditions.append(f"oc.proveedor_id = ${idx}"); params.append(proveedor_id); idx += 1
        if fecha_desde:
            conditions.append(f"oc.fecha >= ${idx}"); params.append(fecha_desde); idx += 1
        if fecha_hasta:
            conditions.append(f"oc.fecha <= ${idx}"); params.append(fecha_hasta); idx += 1
        query = f"""
            SELECT oc.*, t.nombre as proveedor_nombre, m.codigo as moneda_codigo
            FROM finanzas2.cont_oc oc
            LEFT JOIN finanzas2.cont_tercero t ON oc.proveedor_id = t.id
            LEFT JOIN finanzas2.cont_moneda m ON oc.moneda_id = m.id
            WHERE {' AND '.join(conditions)}
            ORDER BY oc.fecha DESC, oc.id DESC
        """
        rows = await conn.fetch(query, *params)
        result = []
        for row in rows:
            oc_dict = dict(row)
            lineas = await conn.fetch("SELECT * FROM finanzas2.cont_oc_linea WHERE oc_id = $1 ORDER BY id", row['id'])
            oc_dict['lineas'] = [dict(l) for l in lineas]
            result.append(oc_dict)
        return result


@router.get("/ordenes-compra/{id}", response_model=OC)
async def get_orden_compra(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        row = await conn.fetchrow("""
            SELECT oc.*, t.nombre as proveedor_nombre, m.codigo as moneda_codigo
            FROM finanzas2.cont_oc oc
            LEFT JOIN finanzas2.cont_tercero t ON oc.proveedor_id = t.id
            LEFT JOIN finanzas2.cont_moneda m ON oc.moneda_id = m.id
            WHERE oc.id = $1 AND oc.empresa_id = $2
        """, id, empresa_id)
        if not row:
            raise HTTPException(404, "Orden de compra not found")
        oc_dict = dict(row)
        lineas = await conn.fetch("SELECT * FROM finanzas2.cont_oc_linea WHERE oc_id = $1 ORDER BY id", id)
        oc_dict['lineas'] = [dict(l) for l in lineas]
        return oc_dict


@router.post("/ordenes-compra", response_model=OC)
async def create_orden_compra(data: OCCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            numero = await generate_oc_number(conn, empresa_id)
            subtotal = 0
            igv = 0
            for linea in data.lineas:
                if data.igv_incluido and linea.igv_aplica:
                    base = linea.cantidad * linea.precio_unitario / 1.18
                    linea_igv = linea.cantidad * linea.precio_unitario - base
                    subtotal += base
                    igv += linea_igv
                else:
                    linea_subtotal = linea.cantidad * linea.precio_unitario
                    subtotal += linea_subtotal
                    if linea.igv_aplica:
                        igv += linea_subtotal * 0.18
            total = subtotal + igv
            row = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_oc
                (empresa_id, numero, fecha, proveedor_id, moneda_id, estado, subtotal, igv, total, notas)
                VALUES ($1, $2, $3, $4, $5, 'borrador', $6, $7, $8, $9)
                RETURNING *
            """, empresa_id, numero, data.fecha, data.proveedor_id, data.moneda_id, subtotal, igv, total, data.notas)
            oc_id = row['id']
            for linea in data.lineas:
                if data.igv_incluido and linea.igv_aplica:
                    linea_subtotal = linea.cantidad * linea.precio_unitario / 1.18
                else:
                    linea_subtotal = linea.cantidad * linea.precio_unitario
                articulo_id_value = None
                if linea.articulo_id:
                    try:
                        articulo_id_value = int(linea.articulo_id)
                    except (ValueError, TypeError):
                        if not linea.descripcion:
                            linea.descripcion = f"Articulo UUID: {linea.articulo_id}"
                await conn.execute("""
                    INSERT INTO finanzas2.cont_oc_linea
                    (empresa_id, oc_id, articulo_id, descripcion, cantidad, precio_unitario, igv_aplica, subtotal)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, empresa_id, oc_id, articulo_id_value, linea.descripcion, linea.cantidad,
                    linea.precio_unitario, linea.igv_aplica, linea_subtotal)
            oc_row = await conn.fetchrow("""
                SELECT oc.*, t.nombre as proveedor_nombre, m.codigo as moneda_codigo
                FROM finanzas2.cont_oc oc
                LEFT JOIN finanzas2.cont_tercero t ON oc.proveedor_id = t.id
                LEFT JOIN finanzas2.cont_moneda m ON oc.moneda_id = m.id
                WHERE oc.id = $1
            """, oc_id)
            oc_dict = dict(oc_row)
            lineas_rows = await conn.fetch("SELECT * FROM finanzas2.cont_oc_linea WHERE oc_id = $1 ORDER BY id", oc_id)
            oc_dict['lineas'] = [dict(l) for l in lineas_rows]
            return oc_dict


@router.put("/ordenes-compra/{id}", response_model=OC)
async def update_orden_compra(id: int, data: OCUpdate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        oc = await conn.fetchrow("SELECT * FROM finanzas2.cont_oc WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not oc:
            raise HTTPException(404, "Orden de compra not found")
        if oc['estado'] != 'borrador':
            raise HTTPException(400, "Solo se pueden editar órdenes en estado borrador")

        async with conn.transaction():
            data_dict = data.model_dump(exclude_unset=True)
            lineas_data = data_dict.pop('lineas', None)
            igv_incluido = data_dict.pop('igv_incluido', None)

            # Update header fields
            updates = []
            values = []
            idx = 1
            for field, value in data_dict.items():
                updates.append(f"{field} = ${idx}"); values.append(value); idx += 1

            if updates:
                values.append(id)
                query = f"UPDATE finanzas2.cont_oc SET {', '.join(updates)}, updated_at = NOW() WHERE id = ${idx}"
                await conn.execute(query, *values)

            # Replace lines if provided
            if lineas_data is not None:
                await conn.execute("DELETE FROM finanzas2.cont_oc_linea WHERE oc_id = $1", id)
                use_igv_incluido = igv_incluido if igv_incluido is not None else False
                subtotal = 0
                igv = 0
                for linea in lineas_data:
                    if use_igv_incluido and linea.get('igv_aplica', True):
                        base = linea['cantidad'] * linea['precio_unitario'] / 1.18
                        linea_igv = linea['cantidad'] * linea['precio_unitario'] - base
                        subtotal += base
                        igv += linea_igv
                        linea_subtotal = base
                    else:
                        linea_subtotal = linea['cantidad'] * linea['precio_unitario']
                        subtotal += linea_subtotal
                        if linea.get('igv_aplica', True):
                            igv += linea_subtotal * 0.18
                    articulo_id_value = None
                    if linea.get('articulo_id'):
                        try:
                            articulo_id_value = int(linea['articulo_id'])
                        except (ValueError, TypeError):
                            pass
                    await conn.execute("""
                        INSERT INTO finanzas2.cont_oc_linea
                        (empresa_id, oc_id, articulo_id, descripcion, cantidad, precio_unitario, igv_aplica, subtotal)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """, empresa_id, id, articulo_id_value, linea.get('descripcion'),
                        linea['cantidad'], linea['precio_unitario'], linea.get('igv_aplica', True), linea_subtotal)
                total = subtotal + igv
                await conn.execute("""
                    UPDATE finanzas2.cont_oc SET subtotal = $1, igv = $2, total = $3, updated_at = NOW() WHERE id = $4
                """, subtotal, igv, total, id)

        return await get_orden_compra(id, empresa_id)


@router.delete("/ordenes-compra/{id}")
async def delete_orden_compra(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        oc = await conn.fetchrow("SELECT * FROM finanzas2.cont_oc WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not oc:
            raise HTTPException(404, "Orden de compra not found")
        if oc['factura_generada_id']:
            raise HTTPException(400, "Cannot delete OC that has generated a factura")
        await conn.execute("DELETE FROM finanzas2.cont_oc WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        return {"message": "Orden de compra deleted"}


@router.post("/ordenes-compra/{id}/generar-factura", response_model=FacturaProveedor)
async def generar_factura_desde_oc(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            oc = await conn.fetchrow("SELECT * FROM finanzas2.cont_oc WHERE id = $1", id)
            if not oc:
                raise HTTPException(404, "Orden de compra not found")
            if oc['factura_generada_id']:
                raise HTTPException(400, "Esta OC ya genero una factura")
            year = datetime.now().year
            prefix = f"FP-{year}-"
            last = await conn.fetchval(f"""
                SELECT numero FROM finanzas2.cont_factura_proveedor
                WHERE numero LIKE '{prefix}%' ORDER BY id DESC LIMIT 1
            """)
            if last:
                num = int(last.split('-')[-1]) + 1
            else:
                num = 1
            numero = f"{prefix}{num:05d}"
            factura = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_factura_proveedor
                (empresa_id, numero, proveedor_id, moneda_id, fecha_factura, fecha_vencimiento,
                 terminos_dias, tipo_documento, estado, subtotal, igv, total, saldo_pendiente,
                 notas, oc_origen_id)
                VALUES ($1, $2, $3, $4, TO_DATE($5, 'YYYY-MM-DD'), TO_DATE($6, 'YYYY-MM-DD'), $7, 'factura', 'pendiente', $8, $9, $10, $10, $11, $12)
                RETURNING *
            """, empresa_id, numero, oc['proveedor_id'], oc['moneda_id'], safe_date_param(datetime.now().date()),
                safe_date_param(datetime.now().date() + timedelta(days=30)), 30,
                oc['subtotal'], oc['igv'], oc['total'], oc['notas'], id)
            factura_id = factura['id']
            oc_lineas = await conn.fetch("SELECT * FROM finanzas2.cont_oc_linea WHERE oc_id = $1", id)
            for linea in oc_lineas:
                await conn.execute("""
                    INSERT INTO finanzas2.cont_factura_proveedor_linea
                    (empresa_id, factura_id, articulo_id, descripcion, importe, igv_aplica)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, empresa_id, factura_id, linea['articulo_id'], linea['descripcion'],
                    linea['subtotal'], linea['igv_aplica'])
            await conn.execute("""
                INSERT INTO finanzas2.cont_cxp
                (empresa_id, factura_id, proveedor_id, monto_original, saldo_pendiente, fecha_vencimiento, estado)
                VALUES ($1, $2, $3, $4, $4, $5, 'pendiente')
            """, factura_id, oc['proveedor_id'], oc['total'],
                datetime.now().date() + timedelta(days=30), empresa_id)
            await conn.execute("""
                UPDATE finanzas2.cont_oc SET estado = 'facturada', factura_generada_id = $1 WHERE id = $2 AND empresa_id = $3
            """, factura_id, id, empresa_id)
            f_row = await conn.fetchrow("""
                SELECT fp.*, t.nombre as proveedor_nombre, m.codigo as moneda_codigo, m.simbolo as moneda_simbolo
                FROM finanzas2.cont_factura_proveedor fp
                LEFT JOIN finanzas2.cont_tercero t ON fp.proveedor_id = t.id
                LEFT JOIN finanzas2.cont_moneda m ON fp.moneda_id = m.id
                WHERE fp.id = $1
            """, factura_id)
            factura_dict = dict(f_row)
            f_lineas = await conn.fetch("""
                SELECT fpl.*, c.nombre as categoria_nombre
                FROM finanzas2.cont_factura_proveedor_linea fpl
                LEFT JOIN finanzas2.cont_categoria c ON fpl.categoria_id = c.id
                WHERE fpl.factura_id = $1 ORDER BY fpl.id
            """, factura_id)
            factura_dict['lineas'] = [dict(l) for l in f_lineas]
            return factura_dict


# =====================
# FACTURAS PROVEEDOR
# =====================
@router.get("/facturas-proveedor", response_model=List[FacturaProveedor])
async def list_facturas_proveedor(
    estado: Optional[str] = None,
    proveedor_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    empresa_id: int = Depends(get_empresa_id),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        conditions = ["fp.empresa_id = $1"]
        params = [empresa_id]
        idx = 2
        if estado:
            conditions.append(f"fp.estado = ${idx}"); params.append(estado); idx += 1
        if proveedor_id:
            conditions.append(f"fp.proveedor_id = ${idx}"); params.append(proveedor_id); idx += 1
        if fecha_desde:
            conditions.append(f"fp.fecha_factura >= ${idx}"); params.append(fecha_desde); idx += 1
        if fecha_hasta:
            conditions.append(f"fp.fecha_factura <= ${idx}"); params.append(fecha_hasta); idx += 1
        query = f"""
            SELECT fp.*, t.nombre as proveedor_nombre, m.codigo as moneda_codigo, m.simbolo as moneda_simbolo
            FROM finanzas2.cont_factura_proveedor fp
            LEFT JOIN finanzas2.cont_tercero t ON fp.proveedor_id = t.id
            LEFT JOIN finanzas2.cont_moneda m ON fp.moneda_id = m.id
            WHERE {' AND '.join(conditions)}
            ORDER BY fp.fecha_factura DESC, fp.id DESC
        """
        rows = await conn.fetch(query, *params)
        result = []
        for row in rows:
            fp_dict = dict(row)
            lineas = await conn.fetch("""
                SELECT fpl.*, c.nombre as categoria_nombre, c.padre_id as categoria_padre_id,
                       cp.nombre as categoria_padre_nombre,
                       ln.nombre as linea_negocio_nombre, cc.nombre as centro_costo_nombre
                FROM finanzas2.cont_factura_proveedor_linea fpl
                LEFT JOIN finanzas2.cont_categoria c ON fpl.categoria_id = c.id
                LEFT JOIN finanzas2.cont_categoria cp ON c.padre_id = cp.id
                LEFT JOIN finanzas2.cont_linea_negocio ln ON fpl.linea_negocio_id = ln.id
                LEFT JOIN finanzas2.cont_centro_costo cc ON fpl.centro_costo_id = cc.id
                WHERE fpl.factura_id = $1 ORDER BY fpl.id
            """, row['id'])
            fp_dict['lineas'] = [dict(l) for l in lineas]
            result.append(fp_dict)
        return result


@router.get("/facturas-proveedor/{id}", response_model=FacturaProveedor)
async def get_factura_proveedor_endpoint(id: int, empresa_id: int = Depends(get_empresa_id)):
    return await get_factura_proveedor(id, empresa_id)


@router.post("/facturas-proveedor", response_model=FacturaProveedor)
async def create_factura_proveedor(data: FacturaProveedorCreate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            numero = data.numero or await generate_factura_number(conn, empresa_id)
            subtotal = sum(l.importe for l in data.lineas)
            if data.impuestos_incluidos:
                subtotal = subtotal / 1.18
                igv = subtotal * 0.18
            else:
                igv = sum(l.importe * 0.18 for l in data.lineas if l.igv_aplica)
            total = subtotal + igv
            base_gravada = 0.0
            igv_sunat = 0.0
            base_no_gravada = 0.0
            for linea in data.lineas:
                imp = linea.importe
                if linea.igv_aplica:
                    if data.impuestos_incluidos:
                        base = imp / 1.18
                        base_gravada += base
                        igv_sunat += imp - base
                    else:
                        base_gravada += imp
                        igv_sunat += imp * 0.18
                else:
                    base_no_gravada += imp
            base_gravada = round(base_gravada, 2)
            igv_sunat = round(igv_sunat, 2)
            base_no_gravada = round(base_no_gravada, 2)
            isc_val = data.isc or 0.0
            fecha_vencimiento = data.fecha_vencimiento
            if not fecha_vencimiento and data.terminos_dias:
                fecha_vencimiento = data.fecha_factura + timedelta(days=data.terminos_dias)
            fecha_contable = data.fecha_contable or data.fecha_factura
            row = await conn.fetchrow("""
                INSERT INTO finanzas2.cont_factura_proveedor
                (empresa_id, numero, proveedor_id, beneficiario_nombre, moneda_id, fecha_factura, fecha_contable, fecha_vencimiento,
                 terminos_dias, tipo_documento, estado, subtotal, igv, total, saldo_pendiente,
                 impuestos_incluidos, tipo_comprobante_sunat, base_gravada, igv_sunat, base_no_gravada, isc, tipo_cambio, notas)
                VALUES ($1, $2, $3, $4, $5, TO_DATE($6, 'YYYY-MM-DD'), TO_DATE($7, 'YYYY-MM-DD'), TO_DATE($8, 'YYYY-MM-DD'), $9, $10, 'pendiente', $11, $12, $13, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                RETURNING id
            """, empresa_id, numero, data.proveedor_id, data.beneficiario_nombre, data.moneda_id,
                safe_date_param(data.fecha_factura), safe_date_param(fecha_contable), safe_date_param(fecha_vencimiento), data.terminos_dias, data.tipo_documento,
                subtotal, igv, total, data.impuestos_incluidos, data.tipo_comprobante_sunat, base_gravada, igv_sunat, base_no_gravada, isc_val, data.tipo_cambio, data.notas)
            factura_id = row['id']
            for linea in data.lineas:
                await conn.execute("""
                    INSERT INTO finanzas2.cont_factura_proveedor_linea
                    (empresa_id, factura_id, categoria_id, articulo_id, descripcion, linea_negocio_id,
                     centro_costo_id, importe, igv_aplica, cantidad, precio_unitario, modelo_corte_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                """, empresa_id, factura_id, linea.categoria_id, linea.articulo_id, linea.descripcion,
                    linea.linea_negocio_id, linea.centro_costo_id, linea.importe, linea.igv_aplica,
                    linea.cantidad, linea.precio_unitario, linea.modelo_corte_id)
            await conn.execute("""
                INSERT INTO finanzas2.cont_cxp
                (empresa_id, factura_id, proveedor_id, monto_original, saldo_pendiente, fecha_vencimiento, estado)
                VALUES ($1, $2, $3, $4, $4, $5, 'pendiente')
            """, empresa_id, factura_id, data.proveedor_id, total, fecha_vencimiento)
            row = await conn.fetchrow("""
                SELECT fp.*, t.nombre as proveedor_nombre, m.codigo as moneda_codigo, m.simbolo as moneda_simbolo
                FROM finanzas2.cont_factura_proveedor fp
                LEFT JOIN finanzas2.cont_tercero t ON fp.proveedor_id = t.id
                LEFT JOIN finanzas2.cont_moneda m ON fp.moneda_id = m.id
                WHERE fp.id = $1
            """, factura_id)
            if not row:
                raise HTTPException(404, "Factura not found after creation")
            fp_dict = dict(row)
            lineas = await conn.fetch("""
                SELECT fpl.*, c.nombre as categoria_nombre, c.padre_id as categoria_padre_id,
                       cp.nombre as categoria_padre_nombre,
                       ln.nombre as linea_negocio_nombre, cc.nombre as centro_costo_nombre
                FROM finanzas2.cont_factura_proveedor_linea fpl
                LEFT JOIN finanzas2.cont_categoria c ON fpl.categoria_id = c.id
                LEFT JOIN finanzas2.cont_categoria cp ON c.padre_id = cp.id
                LEFT JOIN finanzas2.cont_linea_negocio ln ON fpl.linea_negocio_id = ln.id
                LEFT JOIN finanzas2.cont_centro_costo cc ON fpl.centro_costo_id = cc.id
                WHERE fpl.factura_id = $1 ORDER BY fpl.id
            """, factura_id)
            fp_dict['lineas'] = [dict(l) for l in lineas]
            return fp_dict


@router.put("/facturas-proveedor/{id}", response_model=FacturaProveedor)
async def update_factura_proveedor(id: int, data: FacturaProveedorUpdate, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        factura = await conn.fetchrow("SELECT * FROM finanzas2.cont_factura_proveedor WHERE id = $1 AND empresa_id = $2", id, empresa_id)
        if not factura:
            raise HTTPException(404, "Factura not found")
        if factura['estado'] == 'anulada':
            raise HTTPException(400, "No se puede editar una factura anulada")

        is_locked = factura['estado'] in ('pagado', 'canjeado')
        CLASSIFICATION_FIELDS = {'notas', 'fecha_contable', 'tipo_comprobante_sunat'}

        data_dict = data.model_dump(exclude_unset=True)
        lineas_data = data_dict.pop('lineas', None)

        updates = []
        values = []
        idx = 1
        for field, value in data_dict.items():
            if is_locked and field not in CLASSIFICATION_FIELDS:
                continue
            updates.append(f"{field} = ${idx}"); values.append(value); idx += 1

        if updates:
            values.append(id)
            query = f"UPDATE finanzas2.cont_factura_proveedor SET {', '.join(updates)}, updated_at = NOW() WHERE id = ${idx}"
            await conn.execute(query, *values)

        if lineas_data is not None:
            LINEA_CLASS_FIELDS = {'categoria_id', 'descripcion', 'linea_negocio_id', 'centro_costo_id'}
            classification_changed = False
            for linea in lineas_data:
                linea_id = linea.get('id')
                if not linea_id:
                    continue
                lu = []
                lv = []
                li = 1
                for lf in LINEA_CLASS_FIELDS:
                    if lf in linea:
                        lu.append(f"{lf} = ${li}"); lv.append(linea[lf]); li += 1
                        if lf in ('linea_negocio_id', 'categoria_id', 'centro_costo_id'):
                            classification_changed = True
                if lu:
                    lv.append(linea_id)
                    await conn.execute(
                        f"UPDATE finanzas2.cont_factura_proveedor_linea SET {', '.join(lu)} WHERE id = ${li}", *lv)

            if classification_changed:
                await recalcular_distribuciones_factura(conn, empresa_id, id)

        return await get_factura_proveedor(id, empresa_id)


@router.delete("/facturas-proveedor/{id}")
async def delete_factura_proveedor(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            factura = await conn.fetchrow("SELECT * FROM finanzas2.cont_factura_proveedor WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not factura:
                raise HTTPException(404, "Factura not found")
            pagos = await conn.fetchval("""
                SELECT COUNT(*) FROM finanzas2.cont_pago_aplicacion
                WHERE tipo_documento = 'factura' AND documento_id = $1
            """, id)
            if pagos > 0:
                raise HTTPException(400, "Cannot delete factura with payments. Reverse payments first.")
            letras = await conn.fetchval("SELECT COUNT(*) FROM finanzas2.cont_letra WHERE factura_id = $1", id)
            if letras > 0:
                raise HTTPException(400, "Cannot delete factura with letras. Delete letras first.")
            await conn.execute("DELETE FROM finanzas2.cont_cxp WHERE factura_id = $1", id)
            await conn.execute("DELETE FROM finanzas2.cont_factura_proveedor WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            return {"message": "Factura deleted"}


@router.get("/facturas-proveedor/{id}/pagos")
async def get_pagos_de_factura(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        rows = await conn.fetch("""
            SELECT COALESCE(mt.id, p.id) as id,
                   COALESCE(mt.numero, p.numero) as numero,
                   COALESCE(mt.tipo, p.tipo::text) as tipo,
                   COALESCE(mt.fecha, p.fecha) as fecha,
                   COALESCE(mt.monto, p.monto_total) as monto_total,
                   pa.monto_aplicado,
                   COALESCE(cf_mt.nombre, cf_p.nombre) as cuenta_nombre,
                   COALESCE(mon_mt.codigo, mon_p.codigo) as moneda_codigo,
                   COALESCE(mon_mt.simbolo, mon_p.simbolo) as moneda_simbolo,
                   COALESCE(mt.referencia, p.referencia) as referencia,
                   COALESCE(mt.conciliado, false) as conciliado
            FROM finanzas2.cont_pago_aplicacion pa
            LEFT JOIN finanzas2.cont_movimiento_tesoreria mt ON pa.movimiento_tesoreria_id = mt.id
            LEFT JOIN finanzas2.cont_pago p ON pa.pago_id = p.id
            LEFT JOIN finanzas2.cont_cuenta_financiera cf_mt ON mt.cuenta_financiera_id = cf_mt.id
            LEFT JOIN finanzas2.cont_cuenta_financiera cf_p ON p.cuenta_financiera_id = cf_p.id
            LEFT JOIN finanzas2.cont_moneda mon_mt ON mt.moneda_id = mon_mt.id
            LEFT JOIN finanzas2.cont_moneda mon_p ON p.moneda_id = mon_p.id
            WHERE pa.tipo_documento = 'factura' AND pa.documento_id = $1
            ORDER BY COALESCE(mt.fecha, p.fecha) DESC
        """, id)
        return [dict(r) for r in rows]


@router.get("/facturas-proveedor/{id}/letras")
async def get_letras_de_factura(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        rows = await conn.fetch("""
            SELECT l.*, fp.moneda_id, m.codigo as moneda_codigo, m.simbolo as moneda_simbolo
            FROM finanzas2.cont_letra l
            LEFT JOIN finanzas2.cont_factura_proveedor fp ON l.factura_id = fp.id
            LEFT JOIN finanzas2.cont_moneda m ON fp.moneda_id = m.id
            WHERE l.factura_id = $1
            ORDER BY l.fecha_vencimiento ASC
        """, id)
        return [dict(r) for r in rows]


@router.post("/facturas-proveedor/{id}/deshacer-canje")
async def deshacer_canje_letras(id: int, empresa_id: int = Depends(get_empresa_id)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("SET search_path TO finanzas2, public")
        async with conn.transaction():
            factura = await conn.fetchrow("SELECT * FROM finanzas2.cont_factura_proveedor WHERE id = $1 AND empresa_id = $2", id, empresa_id)
            if not factura:
                raise HTTPException(404, "Factura not found")
            if factura['estado'] != 'canjeado':
                raise HTTPException(400, "Factura is not in canjeado state")
            pagos_letras = await conn.fetchval("""
                SELECT COUNT(*) FROM finanzas2.cont_pago_aplicacion pa
                JOIN finanzas2.cont_letra l ON pa.tipo_documento = 'letra' AND pa.documento_id = l.id
                WHERE l.factura_id = $1
            """, id)
            if pagos_letras > 0:
                raise HTTPException(400, "Cannot undo canje - some letras have payments. Delete payments first.")
            await conn.execute("DELETE FROM finanzas2.cont_letra WHERE factura_id = $1", id)
            await conn.execute("""
                UPDATE finanzas2.cont_factura_proveedor
                SET estado = 'pendiente', updated_at = NOW()
                WHERE id = $1
            """, id)
            return {"message": "Canje reversed successfully"}
