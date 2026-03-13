# Fase 5 - Split ventas_pos.py - Resumen

## Fecha: 2026-03-13

## Antes
- `backend/routers/ventas_pos.py`: 1191 lineas, 16 endpoints, monolitico

## Despues
| Archivo | Lineas | Responsabilidad |
|---------|--------|-----------------|
| `ventas_pos.py` | 21 | Orquestador ligero (importa sub-routers) |
| `pos_common.py` | 10 | `get_company_key()` compartido |
| `pos_sync.py` | 267 | Config Odoo + sync-local + refresh + `_sync_odoo_to_local` |
| `pos_crud.py` | 232 | GET ventas-pos (list) + GET lineas |
| `pos_estados.py` | 419 | POST confirmar/credito/descartar/desconfirmar + GET distribucion-analitica |
| `pos_pagos.py` | 298 | GET/POST/PUT/DELETE pagos + GET pagos-oficiales |

## Endpoints por modulo
- **pos_sync**: GET/PUT config/odoo-company-map, POST ventas-pos/sync-local, POST ventas-pos/refresh
- **pos_crud**: GET ventas-pos, GET ventas-pos/{id}/lineas
- **pos_estados**: POST confirmar, POST credito, POST descartar, POST desconfirmar, GET distribucion-analitica
- **pos_pagos**: GET pagos, POST pagos, PUT pagos/{id}, DELETE pagos/{id}, GET pagos-oficiales

## Contratos API
- **Sin cambios**: Todas las rutas, parametros y respuestas mantienen exactamente el mismo contrato
- `server.py` no fue modificado: sigue importando `from routers.ventas_pos import router`

## Verificacion
- Backend: 18/20 tests pasaron (2 "fallos" son comportamiento esperado: 404 orden inexistente, 502 Odoo inalcanzable)
- Frontend: VentasPOS page carga correctamente con 287 registros, sin errores de consola
- 0 regresiones detectadas

## Riesgos / Deuda detectada
- `pos_estados.py` tiene 419 lineas (archivo mas grande de los nuevos) - si crece mas, considerar separar `confirmar` que tiene logica compleja de tesoreria/pagos/CxC
- Cada modulo hace `from database import get_pool` independiente (patron repetido pero necesario por diseño FastAPI)
- La logica legacy (fallback sin company_key) esta duplicada entre modulos - candidato futuro para simplificacion si se elimina el path legacy
