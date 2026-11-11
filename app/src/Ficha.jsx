import { fichaFinanciera, proyeccionInversion, millones, pesos, porcentaje, TASA_COP_POR_XLM } from "./finanzas.js";

const num = (n) => Number(n).toLocaleString("es-CO");

/** Etiqueta «VIS» / «No VIS» (o «VIP»): se calcula con el precio del apartamento. */
export function EtiquetaVis({ proyecto: p, className = "" }) {
  if (!p.modelo) return null;
  const f = fichaFinanciera(p);
  return (
    <span className={`vis ${f.esVis ? "si" : "no"} ${className}`} title={`Apartamento de ${millones(f.precioApartamento)}; tope VIS ${millones(f.topeVisCop)}`}>
      {f.tipoVivienda}
    </span>
  );
}

/**
 * Ficha financiera del proyecto. A la vista van solo dos líneas (cuánto financia la ronda y el retorno estimado);
 * las cuentas completas quedan detrás de «Ver cómo se calcula», para explicarlas cuando alguien las pregunte.
 */
export function FichaProyecto({ proyecto: p }) {
  if (!p.modelo) return null;
  const f = fichaFinanciera(p);
  const venta = f.modelo === "venta";

  return (
    <div className="resumen ficha">
      <h3>Rendimiento estimado <span className="chip">estimación</span></h3>

      <Fila
        et="Tipo de vivienda"
        valor={f.tipoVivienda}
        nota={`${venta ? "apartamento" : "apartaestudio"} de ${millones(f.precioApartamento)} · el tope VIS es ${millones(f.topeVisCop)}`}
        vis={f.esVis ? "si" : "no"}
      />

      {venta ? (
        <>
          <Fila et="Esta ronda financia" valor={porcentaje(f.participacionRonda)} nota={`del costo del proyecto (${millones(f.metaCop)} de ${millones(f.costo)})`} />
          <Fila et="Retorno estimado" valor={`${porcentaje(f.retornoAnual)} E.A.`} nota={`${porcentaje(f.retorno)} en ${p.plazoMeses} meses`} fuerte />
        </>
      ) : (
        <>
          <Fila et="Esta ronda es dueña de" valor={porcentaje(f.participacionRonda)} nota={`del edificio (${millones(f.metaCop)} de ${millones(f.valorProyecto)})`} />
          <Fila et="Rendimiento neto" valor={`${porcentaje(f.rendimiento)} anual`} nota="arriendo neto ÷ valor del edificio" fuerte />
        </>
      )}

      <details className="como">
        <summary>Ver cómo se calcula</summary>
        <p className="ficha-modelo">
          <b>VIS o No VIS:</b> se calcula con el precio de cada apartamento ({p.areaM2} m² × {pesos(p.precioM2)} = {millones(f.precioApartamento)}).
          La vivienda de interés social cuesta hasta 135 salarios mínimos ({millones(f.topeVisCop)} en 2026); este proyecto es <b>{f.tipoVivienda}</b>.
        </p>
        <p className="ficha-modelo">
          {venta
            ? "Desarrollo y venta: los inversionistas financian una parte del costo y reciben la misma parte de la utilidad cuando se venden los apartamentos."
            : "Renta: los inversionistas son dueños de una parte del edificio y reciben su parte del arriendo neto, cada mes."}
        </p>

        {venta ? (
          <>
            <Fila et="Valor de las ventas" valor={millones(f.valorProyecto)} nota={`${p.unidades} apartamentos × ${p.areaM2} m² × ${pesos(p.precioM2)} por m²`} />
            <Fila et="Costo del proyecto" valor={millones(f.costo)} nota={`${Math.round((1 - p.margenSobreVentas) * 100)} % de las ventas`} />
            <Fila et="Utilidad estimada" valor={millones(f.utilidad)} nota={`${porcentaje(f.retorno)} sobre el costo`} />
            <ol>
              <li><b>Ventas</b> = apartamentos × área × precio por m² = {millones(f.valorProyecto)}.</li>
              <li><b>Costo</b> = ventas × (1 − {porcentaje(p.margenSobreVentas)} de margen) = {millones(f.costo)}.</li>
              <li><b>Utilidad</b> = ventas − costo = {millones(f.utilidad)}, o sea {porcentaje(f.retorno)} sobre el costo.</li>
              <li>
                La ronda aporta {millones(f.metaCop)}, que es el {porcentaje(f.participacionRonda)} del costo, así que se lleva esa misma parte de la utilidad:
                {" "}{millones(f.metaCop)} × {porcentaje(f.retorno)} = {millones(f.utilidadRonda)}.
              </li>
              <li><b>Retorno anual (E.A.)</b> = (1 + {porcentaje(f.retorno)})<sup>12 ÷ {p.plazoMeses}</sup> − 1 = {porcentaje(f.retornoAnual)}.</li>
            </ol>
          </>
        ) : (
          <>
            <Fila et="Valor del edificio" valor={millones(f.valorProyecto)} nota={`${p.unidades} apartaestudios × ${p.areaM2} m² × ${pesos(p.precioM2)} por m²`} />
            <Fila et="Arriendo bruto al año" valor={millones(f.arriendoBrutoAnual)} nota={`${pesos(p.rentaM2Mes)} por m² al mes`} />
            <Fila et="Arriendo cobrado" valor={millones(f.arriendoCobrado)} nota={`descontando ${p.mesesVacios} mes sin arrendar al año`} />
            <Fila et="Arriendo neto al año" valor={millones(f.arriendoNetoAnual)} nota={`después de ${Math.round(p.gastosSobreRenta * 100)} % de costos de operación`} />
            <ol>
              <li><b>Arriendo bruto</b> = {p.unidades} × {p.areaM2} m² × {pesos(p.rentaM2Mes)} × 12 meses = {millones(f.arriendoBrutoAnual)}.</li>
              <li><b>Cobrado</b> = bruto × (12 − {p.mesesVacios}) ÷ 12 = {millones(f.arriendoCobrado)}.</li>
              <li><b>Neto</b> = cobrado × (1 − {porcentaje(p.gastosSobreRenta)} de administración, mantenimiento e impuestos) = {millones(f.arriendoNetoAnual)}.</li>
              <li><b>Rendimiento</b> = neto ÷ valor del edificio = {porcentaje(f.rendimiento)} al año.</li>
              <li>La ronda se lleva {millones(f.metaCop)} × {porcentaje(f.rendimiento)} = {millones(f.pagoAnualRonda)} al año, es decir {pesos(f.repartoSugeridoCop)} al mes.</li>
            </ol>
          </>
        )}

        <p>
          <b>Cambio a pesos:</b> el XLM de testnet no vale nada; usamos <b>1 XLM = {pesos(TASA_COP_POR_XLM)}</b> solo para hablar en pesos (supuesto).
          Cada fracción cuesta {pesos(f.ticketCop)} y la ronda completa {pesos(f.metaCop)}. El proyecto y sus cifras son ficticios; los supuestos
          están explicados en <code>Docs/MODELO_FINANCIERO.md</code>.
        </p>
      </details>

      <p className="ficha-aviso">Son estimaciones con supuestos, no una promesa de rentabilidad.</p>
    </div>
  );
}

function Fila({ et, valor, nota, fuerte, vis }) {
  return (
    <div className={`dato-fila ${fuerte ? "fuerte" : ""}`}>
      <span className="et">{et}</span>
      <span className="val">{vis ? <b><span className={`vis ${vis}`}>{valor}</span></b> : <b>{valor}</b>}{nota && <small>{nota}</small>}</span>
    </div>
  );
}

/** Lo que le toca a quien compra N fracciones (estimado). Va debajo de «Total a pagar». */
export function Proyeccion({ proyecto: p, fracciones }) {
  if (!p.modelo) return null;
  const f = fichaFinanciera(p);
  const y = proyeccionInversion(f, p, Number(fracciones) || 0);
  return (
    <>
      <div className="dato-fila">
        <span className="et">Tu aporte en pesos</span>
        <span className="val"><b>{pesos(y.aporteCop)}</b><small>{num(fracciones)} × {pesos(f.ticketCop)}</small></span>
      </div>
      {y.modelo === "venta" ? (
        <div className="dato-fila fuerte">
          <span className="et">Retorno estimado</span>
          <span className="val"><b>{pesos(y.retornoTotalCop)}</b><small>tu aporte + {pesos(y.utilidadCop)} de utilidad en {y.plazoMeses} meses</small></span>
        </div>
      ) : (
        <div className="dato-fila fuerte">
          <span className="et">Arriendo estimado</span>
          <span className="val"><b>{pesos(y.pagoMensualCop)} al mes</b><small>{pesos(y.pagoAnualCop)} al año</small></span>
        </div>
      )}
    </>
  );
}
