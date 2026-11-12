import { useEffect, useState } from "react";
import { aXlm, repartoHecho } from "./reparto.js";
import { horizon, mensajeDeError } from "./fondeo.js";
import { pesos } from "./finanzas.js";

const corto = (g) => `${g.slice(0, 6)}…${g.slice(-6)}`;

/**
 * Panel de la fiduciaria: solo aparece cuando la wallet conectada es la fiduciaria de la ronda.
 * Liberar los fondos y repartir ganancias se firman con Varial, como cualquier otra operación.
 * Todas las acciones piden confirmación porque no se pueden deshacer.
 * Con la ronda abierta y al menos una inversión, la fiduciaria puede cerrarla antes de tiempo (cierre anticipado).
 *
 * En las rondas del catálogo el monto del reparto es PACTADO: sale de las condiciones del proyecto (el modelo
 * financiero) y la fiduciaria no lo modifica, solo lo ejecuta y lo firma. En otras rondas (sin modelo) se escribe.
 * `control` = { fiduciaria, codigo, unaVez }: si el reparto es de una sola vez (proyectos de venta), avisa cuando ya se hizo.
 */
export default function Fiduciaria({ estado, vendidas, total, ocupado, cerrarAntes, liberar, calcularReparto, enviarReparto, sugerido, control, titulo = true }) {
  const [montoEscrito, setMontoEscrito] = useState(100);
  const monto = sugerido ? sugerido.xlm : montoEscrito;
  const [yaRepartido, setYaRepartido] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // "liberar" | "cerrar" | { plan, monto }
  const [calculando, setCalculando] = useState(false);
  const [problema, setProblema] = useState("");

  async function revisarReparto() {
    if (!control?.unaVez) return;
    try {
      setYaRepartido(await repartoHecho(horizon, control.fiduciaria, control.codigo));
    } catch {
      /* si no se puede consultar, no se bloquea nada */
    }
  }
  useEffect(() => {
    if (estado === "Liberada") revisarReparto();
  }, [estado, control?.codigo]);

  async function pedirReparto() {
    setProblema("");
    setCalculando(true);
    try {
      setConfirmar({ plan: await calcularReparto(monto), monto });
    } catch (e) {
      setProblema(mensajeDeError(e));
    } finally {
      setCalculando(false);
    }
  }

  const cerrar = () => setConfirmar(null);

  return (
    <div className="fiduciaria">
      {titulo && (
        <>
          <h3>Panel de la fiduciaria</h3>
          <small>Solo la fiduciaria de esta ronda ve esto. Cada acción se firma con tu Varial.</small>
        </>
      )}

      {estado === "Recaudando" && (
        <>
          <p className="nota">Todavía no se alcanza la meta: no hay nada que liberar. Si ya hay inversiones, puedes cerrar la ronda antes de tiempo con lo recaudado.</p>
          <button className="btn" onClick={() => setConfirmar("cerrar")} disabled={ocupado || !(vendidas > 0)}>
            {vendidas > 0 ? "Cerrar la ronda antes de tiempo" : "Cerrar la ronda (aún sin inversiones)"}
          </button>
        </>
      )}
      {estado === "Fallida" && <p className="nota">La ronda no llegó a la meta. Cada tenedor puede recuperar su dinero desde su wallet.</p>}

      {estado === "Exitosa" && (
        <button className="btn ok" onClick={() => setConfirmar("liberar")} disabled={ocupado}>Liberar fondos a la constructora</button>
      )}

      {estado === "Liberada" && (
        <>
          <p className="nota">Los fondos ya están en la constructora. Puedes repartir ganancias entre quienes tienen fracciones.</p>
          {sugerido ? (
            <div className="pactado">
              <small>Monto pactado</small>
              <b>{sugerido.xlm.toLocaleString("es-CO")} XLM</b>
              <span> (≈ {pesos(sugerido.cop)})</span>
              <p>
                Es {sugerido.nota}, según las condiciones del proyecto. La fiduciaria no lo modifica: solo lo ejecuta y lo firma con su wallet.
              </p>
            </div>
          ) : (
            <label className="campo">
              Ganancias a repartir (XLM)
              <input type="number" min="0" step="any" value={montoEscrito} onChange={(e) => setMontoEscrito(Number(e.target.value))} disabled={ocupado || calculando} />
            </label>
          )}
          {yaRepartido ? (
            <p className="nota"><b>Ya se repartió la utilidad de esta ronda.</b> En los proyectos de venta el reparto es de una sola vez.</p>
          ) : (
            <button className="btn" onClick={pedirReparto} disabled={ocupado || calculando || !(monto > 0)}>
              {calculando ? "Calculando el reparto…" : "Repartir ganancias"}
            </button>
          )}
          {problema && <p className="nota">{problema}</p>}
        </>
      )}

      {confirmar === "cerrar" && (
        <div className="confirmar" role="alertdialog" aria-label="Confirmar cierre anticipado">
          <b>Atención, esto no se puede deshacer</b>
          <p>
            Vas a cerrar la ronda con {vendidas} de {total} fracciones vendidas. Nadie más podrá invertir, no habrá reembolso y después podrás liberar lo recaudado a la constructora.
          </p>
          <div className="dos">
            <button className="btn" onClick={cerrar} disabled={ocupado}>Cancelar</button>
            <button className="btn warn" onClick={() => { cerrar(); cerrarAntes(); }} disabled={ocupado}>Sí, firmar</button>
          </div>
        </div>
      )}

      {confirmar === "liberar" && (
        <div className="confirmar" role="alertdialog" aria-label="Confirmar liberación">
          <b>Atención, esto no se puede deshacer</b>
          <p>Vas a enviar todo el dinero recaudado a la constructora.</p>
          <div className="dos">
            <button className="btn" onClick={cerrar} disabled={ocupado}>Cancelar</button>
            <button className="btn warn" onClick={() => { cerrar(); liberar(); }} disabled={ocupado}>Sí, firmar</button>
          </div>
        </div>
      )}

      {confirmar && confirmar !== "liberar" && confirmar !== "cerrar" && (
        <div className="confirmar" role="alertdialog" aria-label="Confirmar reparto">
          <b>Atención, esto no se puede deshacer</b>
          <p>Vas a enviar {confirmar.monto} XLM a {confirmar.plan.pagos.length} tenedor(es), en una sola transacción:</p>
          <ul className="plan">
            {confirmar.plan.pagos.slice(0, 8).map((p) => (
              <li key={p.cuenta}>{corto(p.cuenta)} recibe {aXlm(p.parte)} XLM</li>
            ))}
            {confirmar.plan.pagos.length > 8 && <li>… y {confirmar.plan.pagos.length - 8} más</li>}
          </ul>
          <div className="dos">
            <button className="btn" onClick={cerrar} disabled={ocupado}>Cancelar</button>
            <button className="btn warn" onClick={async () => { const c = confirmar; cerrar(); await enviarReparto(c.plan, c.monto); revisarReparto(); }} disabled={ocupado}>
              Sí, firmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
