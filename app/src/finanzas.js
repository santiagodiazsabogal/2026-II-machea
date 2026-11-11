// Cálculos financieros de cada proyecto del catálogo. Sin interfaz: se puede probar desde la terminal.
// Todo son ESTIMACIONES con supuestos (ver Docs/MODELO_FINANCIERO.md); no son una promesa de rentabilidad.

/** Supuesto: el XLM de testnet no vale nada; para hablar en pesos usamos 1 XLM = $100.000 COP. */
export const TASA_COP_POR_XLM = 100_000;

const aPesos = (xlm) => Number(xlm) * TASA_COP_POR_XLM;

/**
 * Vivienda de interés social. El tipo se CALCULA con el precio de cada apartamento (área × precio por m²):
 *   VIP    si cuesta hasta  90 salarios mínimos
 *   VIS    si cuesta hasta 135 salarios mínimos (unos $236 millones en 2026)
 *   No VIS si cuesta más.
 * Nota: hoy el tope es 135 salarios mínimos en general y se ha hablado de 150 en las ciudades principales;
 * con cualquiera de los dos, los proyectos del catálogo se clasifican igual.
 */
const SMMLV_2026 = 1_750_905;
const TOPE_VIP_SMMLV = 90;
const TOPE_VIS_SMMLV = 135;

function clasificarVivienda(precioApartamento) {
  const topeVip = TOPE_VIP_SMMLV * SMMLV_2026;
  const topeVis = TOPE_VIS_SMMLV * SMMLV_2026;
  const tipo = precioApartamento <= topeVip ? "VIP" : precioApartamento <= topeVis ? "VIS" : "No VIS";
  return { tipo, topeVip, topeVis, esVis: tipo !== "No VIS" };
}

/**
 * Ficha financiera de un proyecto. Hay dos modelos:
 *
 * "venta" (desarrollo y preventa): los inversionistas financian una parte del costo y reciben la misma parte
 *   de la utilidad cuando se venden los apartamentos.
 *     ventas   = unidades × área × precio por m²
 *     costo    = ventas × (1 − margen)           utilidad = ventas − costo
 *     retorno  = utilidad ÷ costo                en E.A.: (1 + retorno)^(12 ÷ meses) − 1
 *     la ronda financia  meta ÷ costo  del proyecto y se lleva  meta × retorno  de la utilidad.
 *
 * "renta" (edificio para arrendar): los inversionistas son dueños de una parte del edificio y reciben su parte del
 *   arriendo neto, cada mes.
 *     valor del edificio = unidades × área × precio por m²
 *     arriendo cobrado   = unidades × área × arriendo por m² × 12 × (12 − meses sin arrendar) ÷ 12
 *     arriendo neto      = arriendo cobrado × (1 − gastos)       rendimiento = neto ÷ valor del edificio
 *     la ronda se lleva  meta × rendimiento  al año.
 */
export function fichaFinanciera(p) {
  const metaXlm = p.fracciones * p.precioFraccionXlm;
  const metaCop = aPesos(metaXlm);
  const ticketCop = aPesos(p.precioFraccionXlm);
  const valorProyecto = p.unidades * p.areaM2 * p.precioM2;
  const precioApartamento = p.areaM2 * p.precioM2;
  const vivienda = clasificarVivienda(precioApartamento);
  const comunes = { precioApartamento, tipoVivienda: vivienda.tipo, esVis: vivienda.esVis, topeVisCop: vivienda.topeVis };

  if (p.modelo === "renta") {
    const arriendoBrutoAnual = p.unidades * p.areaM2 * p.rentaM2Mes * 12;
    const arriendoCobrado = (arriendoBrutoAnual * (12 - p.mesesVacios)) / 12;
    const gastos = arriendoCobrado * p.gastosSobreRenta;
    const arriendoNetoAnual = arriendoCobrado - gastos;
    const rendimiento = arriendoNetoAnual / valorProyecto;
    const pagoAnualRonda = metaCop * rendimiento;
    return {
      ...comunes,
      modelo: "renta",
      metaXlm,
      metaCop,
      ticketCop,
      valorProyecto,
      participacionRonda: metaCop / valorProyecto,
      arriendoBrutoAnual,
      arriendoCobrado,
      gastos,
      arriendoNetoAnual,
      rendimiento,
      pagoAnualRonda,
      repartoSugeridoCop: pagoAnualRonda / 12, // un reparto al mes
      repartoNota: "el arriendo neto mensual que le corresponde a la ronda",
    };
  }

  const costo = valorProyecto * (1 - p.margenSobreVentas);
  const utilidad = valorProyecto - costo;
  const retorno = utilidad / costo;
  const utilidadRonda = metaCop * retorno;
  return {
    ...comunes,
    modelo: "venta",
    metaXlm,
    metaCop,
    ticketCop,
    valorProyecto,
    costo,
    utilidad,
    retorno,
    plazoMeses: p.plazoMeses,
    retornoAnual: (1 + retorno) ** (12 / p.plazoMeses) - 1,
    participacionRonda: metaCop / costo,
    utilidadRonda,
    repartoSugeridoCop: utilidadRonda, // un reparto al vender
    repartoNota: "la utilidad que le corresponde a la ronda (lo aportado × el retorno del proyecto), una sola vez al vender",
  };
}

/** Lo que estimamos para quien compra `fracciones` fracciones. */
export function proyeccionInversion(ficha, p, fracciones) {
  const aporteCop = fracciones * ficha.ticketCop;
  const parteDeLaRonda = fracciones / p.fracciones;
  if (ficha.modelo === "renta") {
    const pagoAnualCop = aporteCop * ficha.rendimiento;
    return { modelo: "renta", aporteCop, parteDeLaRonda, pagoMensualCop: pagoAnualCop / 12, pagoAnualCop };
  }
  const utilidadCop = aporteCop * ficha.retorno;
  return { modelo: "venta", aporteCop, parteDeLaRonda, utilidadCop, retornoTotalCop: aporteCop + utilidadCop, plazoMeses: ficha.plazoMeses };
}

/** Monto que el modelo sugiere repartir (en XLM) y su equivalente en pesos. */
export const montoSugeridoReparto = (ficha) => ficha.repartoSugeridoCop / TASA_COP_POR_XLM;

// ---- Formatos para mostrar ----
export const pesos = (n) => `$${Math.round(n).toLocaleString("es-CO")}`;
/** "$1.200 millones" */
export const millones = (n) => `$${(n / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 0 })} millones`;
/** "11,8 %" */
export const porcentaje = (x) => `${(x * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
