import { useEffect, useState } from "react";
import { PROYECTOS, EMISOR_DE_LAS_RONDAS } from "./proyectos.js";
import { cerrarAntes, crearCliente, formatXlm, horizon, leerRonda, liberar } from "./fondeo.js";
import { firmarConFreighter } from "./wallet.js";
import { enviarReparto, planDeReparto } from "./reparto.js";
import { TASA_COP_POR_XLM, fichaFinanciera, montoSugeridoReparto, pesos } from "./finanzas.js";
import Fiduciaria from "./Fiduciaria.jsx";
import { Billetera } from "./icons.jsx";
import { Cabecera } from "./ui.jsx";

const ETIQUETA = { Recaudando: "Recaudando", Exitosa: "Meta alcanzada", Liberada: "Completada", Fallida: "No se completó" };
const CLASE = { Recaudando: "recaudando", Exitosa: "meta", Liberada: "ok", Fallida: "fallo" };
const corto = (g) => `${g.slice(0, 6)}…${g.slice(-6)}`;

// Solo en desarrollo: #fiduciaria?muestra=estados enseña cada ronda en un estado distinto, sin tener la wallet.
const ESTADOS_MUESTRA = ["Recaudando", "Exitosa", "Liberada", "Fallida", "Recaudando", "Exitosa"];
function conMuestra(datos, i) {
  const estado = ESTADOS_MUESTRA[i % ESTADOS_MUESTRA.length];
  const { total, precio } = datos.resumen;
  const vendidas = estado === "Exitosa" || estado === "Liberada" ? total : Math.round(total * (estado === "Fallida" ? 0.3 : 0.45));
  return { ...datos, resumen: { ...datos.resumen, estado, vendidas, recaudado: BigInt(vendidas) * precio } };
}

/**
 * Portal de la fiduciaria: una sola pantalla con las rondas del catálogo que esa wallet administra.
 * Liberar los fondos y repartir ganancias se firman con Freighter, como en el panel de «Seguimiento».
 */
export default function PortalFiduciaria({ address, conectar, ocupado, setOcupado, setAviso, error, avisoFirmada, muestra }) {
  const [rondas, setRondas] = useState({}); // id del proyecto -> { resumen, config }

  async function cargar() {
    const lecturas = await Promise.allSettled(PROYECTOS.map((p) => leerRonda(p.contrato)));
    const nuevo = {};
    lecturas.forEach((l, i) => {
      if (l.status === "fulfilled") nuevo[PROYECTOS[i].id] = muestra ? conMuestra(l.value, i) : l.value;
    });
    setRondas(nuevo);
  }

  useEffect(() => {
    cargar();
    const cada20s = setInterval(cargar, 20000);
    return () => clearInterval(cada20s);
  }, [muestra]);

  // En la vista previa nos hacemos pasar por la fiduciaria de las rondas; en la realidad, la wallet conectada.
  const fiduciariaDeLasRondas = Object.values(rondas)[0]?.config.fiduciaria;
  const quien = muestra ? fiduciariaDeLasRondas : address;
  const administra = (d) => Boolean(quien && d.config.fiduciaria === quien);
  const mias = PROYECTOS.filter((p) => rondas[p.id] && administra(rondas[p.id])).length;

  async function liberarRonda(p) {
    try {
      setOcupado(true);
      setAviso({ tipo: "info", texto: `Esperando tu firma en Freighter para liberar los fondos de ${p.nombre}…` });
      const cliente = await crearCliente({ contrato: p.contrato, publicKey: address, signTransaction: firmarConFreighter(address, avisoFirmada) });
      const { hash } = await liberar(cliente);
      await cargar();
      setAviso({ tipo: "ok", texto: `Fondos de ${p.nombre} liberados a la constructora.`, hash });
    } catch (e) {
      error(e);
    } finally {
      setOcupado(false);
    }
  }

  async function cerrarRonda(p) {
    try {
      setOcupado(true);
      setAviso({ tipo: "info", texto: `Esperando tu firma en Freighter para cerrar ${p.nombre} antes de tiempo…` });
      const cliente = await crearCliente({ contrato: p.contrato, publicKey: address, signTransaction: firmarConFreighter(address, avisoFirmada) });
      const { hash } = await cerrarAntes(cliente);
      await cargar();
      setAviso({ tipo: "ok", texto: `${p.nombre} quedó cerrada con lo recaudado. Ya puedes liberar los fondos.`, hash });
    } catch (e) {
      error(e);
    } finally {
      setOcupado(false);
    }
  }

  const calcularReparto = (p, monto) => planDeReparto(horizon, { codigo: p.codigo, emisor: EMISOR_DE_LAS_RONDAS, monto });

  async function repartirRonda(p, plan, monto) {
    try {
      setOcupado(true);
      setAviso({ tipo: "info", texto: `Esperando tu firma en Freighter para repartir ${monto} XLM de ${p.nombre}…` });
      const hash = await enviarReparto(horizon, { desde: address, codigo: p.codigo, pagos: plan.pagos, firmar: firmarConFreighter(address, avisoFirmada) });
      await cargar();
      setAviso({ tipo: "ok", texto: `Reparto de ${monto} XLM de ${p.nombre} enviado a ${plan.pagos.length} tenedor(es).`, hash });
    } catch (e) {
      error(e);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <Cabecera etiqueta="Fiduciaria" titulo="Portal de la fiduciaria" texto="Las rondas que administras, en un solo lugar. Cada acción se firma con tu Freighter." />

      {!quien && (
        <div className="portal-aviso">
          <b>Conecta la wallet de la fiduciaria</b> para ver y gestionar sus rondas. Con cualquier otra wallet verás las rondas, pero no podrás actuar sobre ellas.
          <button className="btn main" onClick={conectar} disabled={ocupado}><Billetera size={22} />Conectar wallet</button>
        </div>
      )}

      {quien && mias === 0 && Object.keys(rondas).length > 0 && (
        <div className="portal-aviso">
          La wallet conectada ({corto(quien)}) no es la fiduciaria de estas rondas. Cámbiate en Freighter a la cuenta de la fiduciaria
          ({corto(fiduciariaDeLasRondas)}) y recarga.
        </div>
      )}

      {quien && mias > 0 && (
        <p className="nota portal-nota">
          {muestra ? "Vista previa (solo desarrollo): cada ronda aparece en un estado distinto. " : ""}
          Administras {mias} de {PROYECTOS.length} rondas.
        </p>
      )}

      <div className="portal">
        {PROYECTOS.map((p) => {
          const d = rondas[p.id];
          if (!d) {
            return (
              <article className="rfid" key={p.id}>
                <div className="rfid-cab"><img src={p.imagen} alt="" /><div><h3>{p.nombre}</h3><small>Leyendo la ronda en la red…</small></div></div>
              </article>
            );
          }
          const { estado, vendidas, total, recaudado } = d.resumen;
          const ficha = fichaFinanciera(p);
          const recaudadoXlm = Number(recaudado) / 1e7;
          return (
            <article className="rfid" key={p.id}>
              <div className="rfid-cab">
                <img src={p.imagen} alt={`Imagen ilustrativa de ${p.nombre}`} loading="lazy" />
                <div>
                  <h3>{p.nombre}</h3>
                  <small>{p.zona}</small>
                </div>
                <span className={`pill-estado ${CLASE[estado]}`}>{estado === "Exitosa" && vendidas < total ? "Cerrada con lo recaudado" : ETIQUETA[estado]}</span>
              </div>

              <div className="proy-avance">
                <div className="barra"><i style={{ width: `${total ? (vendidas / total) * 100 : 0}%` }} /></div>
                <span>
                  {vendidas} de {total} fracciones · {formatXlm(recaudado)} XLM recaudados (≈ {pesos(recaudadoXlm * TASA_COP_POR_XLM)})
                </span>
              </div>

              {administra(d) ? (
                <Fiduciaria
                  titulo={false}
                  estado={estado}
                  vendidas={vendidas}
                  total={total}
                  ocupado={ocupado}
                  cerrarAntes={() => cerrarRonda(p)}
                  liberar={() => liberarRonda(p)}
                  calcularReparto={(monto) => calcularReparto(p, monto)}
                  enviarReparto={(plan, monto) => repartirRonda(p, plan, monto)}
                  sugerido={{ xlm: Math.round(montoSugeridoReparto(ficha) * 100) / 100, cop: ficha.repartoSugeridoCop, nota: ficha.repartoNota }}
                  control={{ fiduciaria: d.config.fiduciaria, codigo: p.codigo, unaVez: ficha.modelo === "venta" }}
                />
              ) : (
                quien && <p className="nota">No eres la fiduciaria de esta ronda.</p>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
