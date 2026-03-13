# Fase 5 - Split FacturasProveedor.jsx - Resumen

## Fecha: 2026-03-13

## Antes
- `frontend/src/pages/FacturasProveedor.jsx`: 2576 lineas, monolitico

## Despues
| Archivo | Lineas | Responsabilidad |
|---------|--------|-----------------|
| `FacturasProveedor.jsx` | 256 | Orquestador: estado, data loading, renderiza sub-componentes |
| `helpers.js` | 209 | formatCurrency, formatDate, estadoBadge, calcularTotales, generatePDFAndPrint |
| `FacturaFormModal.jsx` | 495 | Modal crear/editar factura (estado propio formData, lineas, articulos) |
| `FacturasTable.jsx` | 170 | Tabla de facturas con filtros y botones de accion |
| `PagoModal.jsx` | 144 | Modal registrar pago (auto-contenido) |
| `LetrasModal.jsx` | 203 | Modal canjear por letras (auto-contenido con preview) |
| `VerPagosModal.jsx` | 125 | Modal historial de pagos (carga datos internamente) |
| `VerLetrasModal.jsx` | 127 | Modal letras vinculadas (carga datos internamente) |
| `ExportModal.jsx` | 85 | Modal exportar CompraAPP (auto-contenido) |
| `ProveedorModal.jsx` | 59 | Modal crear proveedor rapido (auto-contenido) |
| **Total** | **1873** | |

## Estrategia de separacion
- **Modales auto-contenidos:** Cada modal gestiona su propio estado local y llamadas API.
  El orquestador solo pasa: show, factura seleccionada, y callback onSuccess.
- **Tabla presentacional:** FacturasTable recibe datos y callbacks via props.
- **Helpers compartidos:** Funciones puras reutilizables entre componentes.
- **Reduccion:** De 2576 a 256 lineas en el archivo principal (-90%)

## Verificacion
- Frontend: 100% tests pasaron (11/11)
- 0 errores de consola
- Todos los modales abren/cierran correctamente
- Filtros funcionan
- Botones de accion condicionalmente visibles segun estado
- 0 regresiones

## Riesgos / Deuda detectada
- `FacturaFormModal.jsx` con 495 lineas es el componente mas grande; si crece, considerar separar las secciones de categorias y articulos en sub-componentes
- El warning de react-hooks/exhaustive-deps en useEffect(loadData) es pre-existente (mismo patron que Gastos.jsx)
- Bug corregido: la variable `API` no estaba disponible en el componente original (undefined), la carga de datos FIFO siempre fallaba silenciosamente. Ahora usa `process.env.REACT_APP_BACKEND_URL` correctamente
