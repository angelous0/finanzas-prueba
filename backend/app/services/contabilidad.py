"""
Contabilidad de doble partida - Servicio de posting y reportes.
Re-exports from original module for backward compatibility.
"""
from contabilidad import (
    get_config_contable,
    check_periodo_cerrado,
    upsert_asiento,
    resolve_cuenta_id,
    generar_asiento_fprov,
    generar_asiento_gasto,
    generar_asiento_pago,
    reporte_mayor,
    reporte_balance,
    reporte_pnl,
)
