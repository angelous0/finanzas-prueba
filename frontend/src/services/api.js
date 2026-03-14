import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${API_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: inject empresa_id on every request (except global endpoints)
const GLOBAL_ENDPOINTS = ['/empresas', '/monedas'];

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isGlobal = GLOBAL_ENDPOINTS.some(ep => url === ep || url.startsWith(ep + '/'));
  if (!isGlobal) {
    const empresaId = localStorage.getItem('empresaActualId');
    if (empresaId) {
      config.params = { ...config.params, empresa_id: parseInt(empresaId) };
    }
  }
  return config;
});

// Dashboard
export const getDashboardResumen = () => api.get('/dashboard/resumen-ejecutivo');

// Empresas
export const getEmpresas = () => api.get('/empresas');
export const createEmpresa = (data) => api.post('/empresas', data);
export const updateEmpresa = (id, data) => api.put(`/empresas/${id}`, data);
export const deleteEmpresa = (id) => api.delete(`/empresas/${id}`);

// Monedas
export const getMonedas = () => api.get('/monedas');

// Categorias
export const getCategorias = (tipo) => api.get('/categorias', { params: { tipo } });
export const createCategoria = (data) => api.post('/categorias', data);
export const updateCategoria = (id, data) => api.put(`/categorias/${id}`, data);
export const deleteCategoria = (id) => api.delete(`/categorias/${id}`);

// Centros de Costo
export const getCentrosCosto = () => api.get('/centros-costo');
export const createCentroCosto = (data) => api.post('/centros-costo', data);
export const updateCentroCosto = (id, data) => api.put(`/centros-costo/${id}`, data);
export const deleteCentroCosto = (id) => api.delete(`/centros-costo/${id}`);

// Lineas de Negocio
export const getLineasNegocio = () => api.get('/lineas-negocio');
export const getOdooLineasNegocioOpciones = () => api.get('/lineas-negocio/odoo-opciones');
export const createLineaNegocio = (data) => api.post('/lineas-negocio', data);
export const updateLineaNegocio = (id, data) => api.put(`/lineas-negocio/${id}`, data);
export const deleteLineaNegocio = (id) => api.delete(`/lineas-negocio/${id}`);

// Cuentas Financieras
export const getCuentasFinancieras = (tipo) => api.get('/cuentas-financieras', { params: { tipo } });
export const createCuentaFinanciera = (data) => api.post('/cuentas-financieras', data);
export const updateCuentaFinanciera = (id, data) => api.put(`/cuentas-financieras/${id}`, data);
export const deleteCuentaFinanciera = (id) => api.delete(`/cuentas-financieras/${id}`);
export const getKardexCuenta = (id, params) => api.get(`/cuentas-financieras/${id}/kardex`, { params });
export const recalcularSaldos = () => api.post('/cuentas-financieras/recalcular-saldos');

// Terceros (Proveedores, Clientes, Empleados)
export const getTerceros = (params) => api.get('/terceros', { params });
export const getTercero = (id) => api.get(`/terceros/${id}`);
export const createTercero = (data) => api.post('/terceros', data);
export const updateTercero = (id, data) => api.put(`/terceros/${id}`, data);
export const deleteTercero = (id) => api.delete(`/terceros/${id}`);
export const getProveedores = (search) => api.get('/proveedores', { params: { search } });
export const getEmpleados = (search) => api.get('/empleados', { params: { search } });

// Inventario (public.prod_inventario)
export const getInventario = (search) => api.get('/inventario', { params: { search } });

// Modelos/Cortes (public.prod_registros + prod_modelos)
export const getModelosCortes = (search) => api.get('/modelos-cortes', { params: { search } });
export const getModelos = (search) => api.get('/modelos', { params: { search } });

// Ordenes de Compra (REVISAR Fase 2)
export const getOrdenesCompra = (params) => api.get('/ordenes-compra', { params });
export const getOrdenCompra = (id) => api.get(`/ordenes-compra/${id}`);
export const createOrdenCompra = (data) => api.post('/ordenes-compra', data);
export const updateOrdenCompra = (id, data) => api.put(`/ordenes-compra/${id}`, data);
export const deleteOrdenCompra = (id) => api.delete(`/ordenes-compra/${id}`);
export const generarFacturaDesdeOC = (id) => api.post(`/ordenes-compra/${id}/generar-factura`);

// Facturas Proveedor
export const getFacturasProveedor = (params) => api.get('/facturas-proveedor', { params });
export const getFacturaProveedor = (id) => api.get(`/facturas-proveedor/${id}`);
export const createFacturaProveedor = (data) => api.post('/facturas-proveedor', data);
export const updateFacturaProveedor = (id, data) => api.put(`/facturas-proveedor/${id}`, data);
export const deleteFacturaProveedor = (id) => api.delete(`/facturas-proveedor/${id}`);

// Pagos
export const getPagos = (params) => api.get('/pagos', { params });
export const getPago = (id) => api.get(`/pagos/${id}`);
export const createPago = (data) => api.post('/pagos', data);
export const updatePago = (id, data) => api.put(`/pagos/${id}`, data);
export const deletePago = (id) => api.delete(`/pagos/${id}`);
export const getPagosDeFactura = (facturaId) => api.get(`/facturas-proveedor/${facturaId}/pagos`);

// Letras (REVISAR Fase 2)
export const getLetras = (params) => api.get('/letras', { params });
export const getLetra = (id) => api.get(`/letras/${id}`);
export const generarLetras = (data) => api.post('/letras/generar', data);
export const deleteLetra = (id) => api.delete(`/letras/${id}`);
export const updateLetraNumeroUnico = (id, data) => api.put(`/letras/${id}/numero-unico`, data);
export const getLetrasDeFactura = (facturaId) => api.get(`/facturas-proveedor/${facturaId}/letras`);
export const deshacerCanjeLetras = (facturaId) => api.post(`/facturas-proveedor/${facturaId}/deshacer-canje`);

// Gastos
export const getGastos = (params) => api.get('/gastos', { params });
export const getGasto = (id) => api.get(`/gastos/${id}`);
export const createGasto = (data) => api.post('/gastos', data);
export const deleteGasto = (id) => api.delete(`/gastos/${id}`);

// Categorias de Gasto
export const getCategoriasGasto = () => api.get('/categorias-gasto');
export const createCategoriaGasto = (data) => api.post('/categorias-gasto', data);
export const updateCategoriaGasto = (id, data) => api.put(`/categorias-gasto/${id}`, data);
export const deleteCategoriaGasto = (id) => api.delete(`/categorias-gasto/${id}`);

// Prorrateo
export const getProrratePendientes = (params) => api.get('/prorrateo/pendientes', { params });
export const getProrratePreview = (data) => api.post('/prorrateo/preview', data);
export const ejecutarProrrateo = (data) => api.post('/prorrateo/ejecutar', data);
export const getProrrateHistorial = (params) => api.get('/prorrateo/historial', { params });
export const eliminarProrrateo = (gastoId) => api.delete(`/prorrateo/${gastoId}`);

// Ventas POS
export const getVentasPOS = (params) => api.get('/ventas-pos', { params });
export const refreshVentasPOS = (data) => api.post('/ventas-pos/refresh', data);
export const confirmarVentaPOS = (id) => api.post(`/ventas-pos/${id}/confirmar`);
export const desconfirmarVentaPOS = (id) => api.post(`/ventas-pos/${id}/desconfirmar`);
export const marcarCreditoVentaPOS = (id, fechaVencimiento) => 
  api.post(`/ventas-pos/${id}/credito`, null, { params: { fecha_vencimiento: fechaVencimiento } });
export const descartarVentaPOS = (id) => api.post(`/ventas-pos/${id}/descartar`);

// Ventas POS - Pagos
export const getPagosVentaPOS = (ventaId) => api.get(`/ventas-pos/${ventaId}/pagos`);
export const getPagosOficialesVentaPOS = (ventaId) => api.get(`/ventas-pos/${ventaId}/pagos-oficiales`);
export const addPagoVentaPOS = (ventaId, pago) => api.post(`/ventas-pos/${ventaId}/pagos`, pago);
export const updatePagoVentaPOS = (ventaId, pagoId, pago) => api.put(`/ventas-pos/${ventaId}/pagos/${pagoId}`, pago);
export const deletePagoVentaPOS = (ventaId, pagoId) => api.delete(`/ventas-pos/${ventaId}/pagos/${pagoId}`);

// Ventas POS - Líneas de productos
export const getLineasVentaPOS = (ventaId) => api.get(`/ventas-pos/${ventaId}/lineas`);
export const syncLocalVentasPOS = (params) => api.post('/ventas-pos/sync-local', null, { params });
export const getDistribucionAnalitica = (ventaId) => api.get(`/ventas-pos/${ventaId}/distribucion-analitica`);
export const getPagosCreditoVentaPOS = (ventaId) => api.get(`/ventas-pos/${ventaId}/pagos-credito`);

// Config - Odoo Company Map
export const getOdooCompanyMap = () => api.get('/config/odoo-company-map');
export const setOdooCompanyMap = (data) => api.put('/config/odoo-company-map', data);

// CxC
export const getCxC = (params) => api.get('/cxc', { params });
export const getCxCResumen = () => api.get('/cxc/resumen');
export const createCxC = (data) => api.post('/cxc', data);
export const getCxCAbonos = (cxcId) => api.get(`/cxc/${cxcId}/abonos`);
export const createCxCAbono = (cxcId, data) => api.post(`/cxc/${cxcId}/abonos`, data);

// CxP
export const getCxP = (params) => api.get('/cxp', { params });
export const getCxPResumen = () => api.get('/cxp/resumen');
export const createCxP = (data) => api.post('/cxp', data);
export const getCxPAbonos = (cxpId) => api.get(`/cxp/${cxpId}/abonos`);
export const createCxPAbono = (cxpId, data) => api.post(`/cxp/${cxpId}/abonos`, data);

// Conciliacion (REVISAR Fase 2)
export const getConciliaciones = (cuentaFinancieraId) => 
  api.get('/conciliaciones', { params: { cuenta_financiera_id: cuentaFinancieraId } });
export const createConciliacion = (data) => api.post('/conciliaciones', data);
export const getMovimientosBanco = (params) => api.get('/conciliacion/movimientos-banco', { params });
export const importarExcelBanco = (file, cuentaFinancieraId, banco) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/conciliacion/importar-excel?cuenta_financiera_id=${cuentaFinancieraId}&banco=${banco}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const previsualizarExcelBanco = (file, banco) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/conciliacion/previsualizar-excel?banco=${banco}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const conciliarMovimientos = (bancoIds, pagoIds) => {
  const params = new URLSearchParams();
  bancoIds.forEach(id => params.append('banco_ids', id));
  pagoIds.forEach(id => params.append('pago_ids', id));
  return api.post(`/conciliacion/conciliar?${params.toString()}`);
};
export const crearGastoBancario = (bancoIds, categoriaId, cuentaFinancieraId, descripcion) => {
  const params = new URLSearchParams();
  bancoIds.forEach(id => params.append('banco_ids', id));
  params.append('categoria_id', categoriaId);
  params.append('cuenta_financiera_id', cuentaFinancieraId);
  if (descripcion) params.append('descripcion', descripcion);
  return api.post(`/conciliacion/crear-gasto-bancario?${params.toString()}`);
};
export const getConciliacionesDetalladas = () => api.get('/conciliacion/historial');
export const desconciliarMovimientos = (bancoId, pagoId) => 
  api.post('/conciliacion/desconciliar', { banco_id: bancoId, pago_id: pagoId });

// Tesoreria
export const getTesoreriaResumen = (params) => api.get('/tesoreria/resumen', { params });

// Export
export const exportCompraAPP = (params) => api.get('/export/compraapp', { params, responseType: 'blob' });

// Retencion/Detraccion (REVISAR Fase 2 — usado en FacturasProveedor)
export const getRetencionDetalle = (origen_tipo, origen_id) => api.get('/retencion-detalle', { params: { origen_tipo, origen_id } });
export const upsertRetencionDetalle = (origen_tipo, origen_id, data) => api.put('/retencion-detalle', data, { params: { origen_tipo, origen_id } });

// Cuentas Financieras Mapeo
export const mapearCuentasDefault = () => api.post('/cuentas-financieras/mapear-cuentas-default');

// Cuentas Contables (usado por CuentasBancarias para mapeo)
export const getCuentasContables = () => api.get('/cuentas-contables');

// Asientos Contables (usado por Gastos y FacturasProveedor CORE)
export const generarAsiento = (data) => api.post('/asientos/generar', data);

// Flujo de Caja Gerencial
export const getFlujoCajaGerencial = (params) => api.get('/flujo-caja-gerencial', { params });

// Marcas
export const getMarcas = () => api.get('/marcas');
export const createMarca = (data) => api.post('/marcas', data);
export const updateMarca = (id, data) => api.put(`/marcas/${id}`, data);
export const deleteMarca = (id) => api.delete(`/marcas/${id}`);

// Reportes Simplificados
export const getReporteVentasPendientes = () => api.get('/reportes/ventas-pendientes');
export const getReporteIngresosPorLinea = (params) => api.get('/reportes/ingresos-por-linea', { params });
export const getReporteIngresosPorMarca = (params) => api.get('/reportes/ingresos-por-marca', { params });
export const getReporteCobranzasPorLinea = (params) => api.get('/reportes/cobranzas-por-linea', { params });
export const getReportePendienteCobrar = () => api.get('/reportes/pendiente-cobrar-por-linea');
export const getReporteGastosPorCategoria = (params) => api.get('/reportes/gastos-por-categoria', { params });
export const getReporteGastosPorCentro = (params) => api.get('/reportes/gastos-por-centro-costo', { params });
export const getReporteUtilidadPorLinea = (params) => api.get('/reportes/utilidad-por-linea', { params });

// Libro Analitico
export const getLibroAnalitico = (params) => api.get('/libro-analitico', { params });
export const exportLibroAnalitico = (params) => api.get('/libro-analitico/export', { params, responseType: 'blob' });

export default api;
