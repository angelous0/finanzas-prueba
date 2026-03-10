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
export const getDashboardKPIs = () => api.get('/dashboard/kpis');

// Empresas
export const getEmpresas = () => api.get('/empresas');
export const createEmpresa = (data) => api.post('/empresas', data);
export const updateEmpresa = (id, data) => api.put(`/empresas/${id}`, data);
export const deleteEmpresa = (id) => api.delete(`/empresas/${id}`);

// Monedas
export const getMonedas = () => api.get('/monedas');
export const createMoneda = (data) => api.post('/monedas', data);
export const deleteMoneda = (id) => api.delete(`/monedas/${id}`);

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
export const getClientes = (search) => api.get('/clientes', { params: { search } });
export const getEmpleados = (search) => api.get('/empleados', { params: { search } });
export const getEmpleadoDetalle = (terceroId) => api.get(`/empleados/${terceroId}/detalle`);
export const saveEmpleadoDetalle = (terceroId, data) => api.post(`/empleados/${terceroId}/detalle`, data);

// Articulos
export const getArticulos = (search) => api.get('/articulos', { params: { search } });
export const createArticulo = (data) => api.post('/articulos', data);

// Inventario (public.prod_inventario)
export const getInventario = (search) => api.get('/inventario', { params: { search } });

// Modelos/Cortes (public.prod_registros + prod_modelos)
export const getModelosCortes = (search) => api.get('/modelos-cortes', { params: { search } });
export const getModelos = (search) => api.get('/modelos', { params: { search } });

// Ordenes de Compra
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

// Letras
export const getLetras = (params) => api.get('/letras', { params });
export const getLetra = (id) => api.get(`/letras/${id}`);
export const generarLetras = (data) => api.post('/letras/generar', data);
export const deleteLetra = (id) => api.delete(`/letras/${id}`);
export const getLetrasDeFactura = (facturaId) => api.get(`/facturas-proveedor/${facturaId}/letras`);
export const deshacerCanjeLetras = (facturaId) => api.post(`/facturas-proveedor/${facturaId}/deshacer-canje`);

// Gastos
export const getGastos = (params) => api.get('/gastos', { params });
export const getGasto = (id) => api.get(`/gastos/${id}`);
export const createGasto = (data) => api.post('/gastos', data);
export const deleteGasto = (id) => api.delete(`/gastos/${id}`);

// Adelantos
export const getAdelantos = (params) => api.get('/adelantos', { params });
export const createAdelanto = (data) => api.post('/adelantos', data);
export const updateAdelanto = (id, data) => api.put(`/adelantos/${id}`, data);
export const deleteAdelanto = (id) => api.delete(`/adelantos/${id}`);
export const pagarAdelanto = (id, cuentaFinancieraId, medioPago = 'efectivo') => 
  api.post(`/adelantos/${id}/pagar?cuenta_financiera_id=${cuentaFinancieraId}&medio_pago=${medioPago}`);

// Planillas
export const getPlanillas = (params) => api.get('/planillas', { params });
export const getPlanilla = (id) => api.get(`/planillas/${id}`);
export const createPlanilla = (data) => api.post('/planillas', data);
export const deletePlanilla = (id) => api.delete(`/planillas/${id}`);
export const pagarPlanilla = (id, cuentaFinancieraId) => 
  api.post(`/planillas/${id}/pagar?cuenta_financiera_id=${cuentaFinancieraId}`);

// Ventas POS
export const getVentasPOS = (params) => api.get('/ventas-pos', { params });
export const refreshVentasPOS = (data) => api.post('/ventas-pos/refresh', data);
export const syncVentasPOS = (company, days) => 
  api.post(`/ventas-pos/sync?company=${company}&days_back=${days}`);
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

// Config - Odoo Company Map
export const getOdooCompanyMap = () => api.get('/config/odoo-company-map');
export const setOdooCompanyMap = (data) => api.put('/config/odoo-company-map', data);

// CxC
export const getCxC = (params) => api.get('/cxc', { params });

// CxP
export const getCxP = (params) => api.get('/cxp', { params });

// Presupuestos
export const getPresupuestos = (anio) => api.get('/presupuestos', { params: { anio } });
export const getPresupuesto = (id) => api.get(`/presupuestos/${id}`);
export const createPresupuesto = (data) => api.post('/presupuestos', data);
export const updatePresupuesto = (id, data) => api.put(`/presupuestos/${id}`, data);
export const deletePresupuesto = (id) => api.delete(`/presupuestos/${id}`);

// Conciliacion
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

// Reportes
export const getReporteFlujoCaja = (fechaDesde, fechaHasta) => 
  api.get('/reportes/flujo-caja', { params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta } });
export const getReporteEstadoResultados = (fechaDesde, fechaHasta) => 
  api.get('/reportes/estado-resultados', { params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta } });
export const getReporteBalanceGeneral = () => api.get('/reportes/balance-general');

export const exportCompraAPP = (params) => api.get('/export/compraapp', { params, responseType: 'blob' });

// Cuentas Contables
export const getCuentasContables = () => api.get('/cuentas-contables');
export const createCuentaContable = (data) => api.post('/cuentas-contables', data);
export const updateCuentaContable = (id, data) => api.put(`/cuentas-contables/${id}`, data);
export const deleteCuentaContable = (id) => api.delete(`/cuentas-contables/${id}`);
export const seedCuentasPeru = () => api.post('/cuentas-contables/seed-peru');

// Config Contable
export const getConfigContable = () => api.get('/config-contable');
export const updateConfigContable = (data) => api.put('/config-contable', data);

// Asientos Contables
export const generarAsiento = (data) => api.post('/asientos/generar', data);
export const postearAsiento = (id) => api.post(`/asientos/${id}/postear`);
export const anularAsiento = (id) => api.post(`/asientos/${id}/anular`);
export const getAsientos = (params) => api.get('/asientos', { params });
export const getAsiento = (id) => api.get(`/asientos/${id}`);

// Reportes Contables
export const getReporteMayor = (params) => api.get('/reportes/mayor', { params });
export const getReporteBalanceContable = (params) => api.get('/reportes/balance', { params });
export const getReportePnl = (params) => api.get('/reportes/pnl', { params });

// Periodos Contables
export const getPeriodos = () => api.get('/periodos-contables');
export const cerrarPeriodo = (anio, mes) => api.post(`/periodos-contables/cerrar?anio=${anio}&mes=${mes}`);
export const abrirPeriodo = (anio, mes) => api.post(`/periodos-contables/abrir?anio=${anio}&mes=${mes}`);

// Retencion/Detraccion
export const getRetencionDetalle = (origen_tipo, origen_id) => api.get('/retencion-detalle', { params: { origen_tipo, origen_id } });
export const upsertRetencionDetalle = (origen_tipo, origen_id, data) => api.put('/retencion-detalle', data, { params: { origen_tipo, origen_id } });

// Cuentas Financieras Mapeo
export const mapearCuentasDefault = () => api.post('/cuentas-financieras/mapear-cuentas-default');

export default api;
