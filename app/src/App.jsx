import { useEffect, useState } from "react";
import { conectarWallet, cargarBalances, agregarTrustline } from "./stellar.js";
import { firmarConFreighter } from "./wallet.js";
import {
  CONTRACT_ID,
  EXPLORER,
  ACTIVO,
  PROYECTO,
  crearCliente,
  leerRonda,
  leerGanancias,
  invertir,
  liberar,
  cerrarAntes,
  reembolsar,
  formatXlm,
  formatCop,
  fechaCorta,
  mensajeDeError,
  horizon,
} from "./fondeo.js";
import { Edificio, Grafico, Billetera, Externo, Info, Pin, Calendario, Escudo, Arriba, Copiar, Check, Equis, Stellar, Documento, Cuadricula, Capas, Tendencia } from "./icons.jsx";
import { Logo, Cabecera, useConteo } from "./ui.jsx";
import fotoProyecto from "./assets/proyecto.jpg";
import Fiduciaria from "./Fiduciaria.jsx";
import PortalFiduciaria from "./PortalFiduciaria.jsx";
import { EtiquetaVis, FichaProyecto, Proyeccion } from "./Ficha.jsx";
import { fichaFinanciera, montoSugeridoReparto } from "./finanzas.js";
import { enviarReparto, planDeReparto } from "./reparto.js";
import Proyectos from "./Proyectos.jsx";

const VISTAS = [
  ["portafolio", "Mi portafolio", Cuadricula],
  ["proyectos", "Proyectos", Edificio],
  ["invertir", "Invertir", Capas],
  ["seguimiento", "Seguimiento", Tendencia],
  ["fiduciaria", "Fiduciaria", Escudo, true], // pestaña oculta: solo sale cuando se conecta la wallet de la fiduciaria (o con el enlace #fiduciaria)
];

function leerHash() {
  const [v, q = ""] = window.location.hash.replace("#", "").split("?");
  const p = new URLSearchParams(q);
  return { vista: VISTAS.some(([k]) => k === v) ? v : "portafolio", muestra: p.has("muestra"), estadoMuestra: p.get("muestra") || "" };
}
const corto = (g, n = 6) => `${g.slice(0, n)}…${g.slice(-n)}`;
const num2 = (n) => Number(n).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

// Solo en desarrollo: #portafolio?muestra pinta datos de ejemplo para revisar el diseño sin wallet.
const MUESTRA = [
  { codigo: "XLM", emisor: null, balance: "1983.90" },
  { codigo: ACTIVO.codigo, emisor: ACTIVO.emisor, balance: "5.0000000" },
];
// Solo en desarrollo: #seguimiento?muestra=exitosa | liberada | fallida muestra el panel de la fiduciaria sin tener su wallet.
const ESTADOS_MUESTRA = { exitosa: "Exitosa", liberada: "Liberada", fallida: "Fallida" };
const WALLET_MUESTRA = "GAATGMTDWWWTRSFYMDKCGGV2ALLFFOSWTSJPJGIGDGSU4J2POOGLNFWX";

export default function App() {
  const inicial = leerHash();
  const [vista, setVista] = useState(inicial.vista);
  const [address, setAddress] = useState("");
  const [balances, setBalances] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [config, setConfig] = useState(null);
  const [ganancias, setGanancias] = useState(0n);
  const [fracciones, setFracciones] = useState(5);
  const [aviso, setAviso] = useState(null); // { tipo: info | ok | error, texto, hash? }
  const [ocupado, setOcupado] = useState(false);

  const muestra = import.meta.env.DEV && inicial.muestra;
  const estadoMuestra = import.meta.env.DEV ? ESTADOS_MUESTRA[inicial.estadoMuestra] : undefined;
  const wallet = muestra ? WALLET_MUESTRA : address;
  const filas = muestra ? MUESTRA : balances;
  const fila = filas.find((b) => b.codigo === ACTIVO.codigo && b.emisor === ACTIVO.emisor);
  const tieneTrustline = Boolean(fila);
  const misFracciones = fila ? Math.floor(Number(fila.balance)) : 0;

  const error = (e) => setAviso({ tipo: "error", texto: mensajeDeError(e) });

  // Lecturas, sin firma y en paralelo: la ronda y los balances salen a la vez, y las ganancias
  // (que necesitan saber quién es la fiduciaria) en cuanto llega la ronda.
  async function refrescar() {
    const tareas = [
      leerRonda().then(async ({ resumen, config }) => {
        setResumen(resumen);
        setConfig(config);
        if (address) setGanancias(await leerGanancias(address, config.fiduciaria));
      }),
    ];
    if (address) tareas.push(cargarBalances(address).then(setBalances));
    const resultados = await Promise.allSettled(tareas);
    const fallo = resultados.find((r) => r.status === "rejected");
    if (fallo) error(fallo.reason);
  }

  // Al abrir, al conectar la wallet y cada 15 segundos (así el seguimiento se actualiza solo).
  useEffect(() => {
    refrescar();
    const cada15s = setInterval(refrescar, 15000);
    return () => clearInterval(cada15s);
  }, [address]);

  function ir(v) {
    setVista(v);
    setAviso(null);
    window.location.hash = v;
  }

  async function conectar() {
    try {
      setOcupado(true);
      setAviso({ tipo: "info", texto: "Conectando con Varial (antes Freighter)…" });
      setAddress(await conectarWallet());
      setAviso(null);
    } catch (e) {
      error(e);
    } finally {
      setOcupado(false);
    }
  }

  const avisoFirmada = () => setAviso({ tipo: "info", texto: "Firmada. Esperando a que la red la confirme (puede tardar unos segundos)…" });
  const clienteConFirma = () => crearCliente({ publicKey: address, signTransaction: firmarConFreighter(address, avisoFirmada) });

  // Para recibir un activo de Stellar hay que aceptarlo antes (trustline).
  async function aceptarActivo() {
    try {
      setOcupado(true);
      setAviso({ tipo: "info", texto: "Esperando tu firma en Varial para aceptar el activo…" });
      const hash = await agregarTrustline({ desde: address, codigo: ACTIVO.codigo, emisor: ACTIVO.emisor });
      setAviso({ tipo: "info", texto: "Activo aceptado. Actualizando tu cuenta…" });
      await refrescar();
      setAviso({ tipo: "ok", texto: `Listo: ya puedes recibir ${ACTIVO.codigo}.`, hash });
    } catch (e) {
      error(e);
    } finally {
      setOcupado(false);
    }
  }

  async function accion(texto, fn) {
    try {
      setOcupado(true);
      setAviso({ tipo: "info", texto: "Simulando la transacción y esperando tu firma en Varial…" });
      const { hash } = await fn(await clienteConFirma());
      await refrescar();
      setAviso({ tipo: "ok", texto, hash });
    } catch (e) {
      error(e);
    } finally {
      setOcupado(false);
    }
  }

  // Fiduciaria: calcula quién recibe cuánto y, tras la confirmación, lo envía firmado con Varial.
  const calcularReparto = (monto) => planDeReparto(horizon, { codigo: ACTIVO.codigo, emisor: ACTIVO.emisor, monto });
  async function enviarElReparto(plan, monto) {
    try {
      setOcupado(true);
      setAviso({ tipo: "info", texto: "Esperando tu firma en Varial para enviar el reparto…" });
      const hash = await enviarReparto(horizon, { desde: address, codigo: ACTIVO.codigo, pagos: plan.pagos, firmar: firmarConFreighter(address, avisoFirmada) });
      await refrescar();
      setAviso({ tipo: "ok", texto: `Reparto de ${monto} XLM enviado a ${plan.pagos.length} tenedor(es).`, hash });
    } catch (e) {
      error(e);
    } finally {
      setOcupado(false);
    }
  }

  // Lo que el modelo del proyecto sugiere repartir (la fiduciaria puede cambiarlo).
  const ficha = PROYECTO.modelo ? fichaFinanciera(PROYECTO) : null;
  const sugerido = ficha ? { xlm: Math.round(montoSugeridoReparto(ficha) * 100) / 100, cop: ficha.repartoSugeridoCop, nota: ficha.repartoNota } : null;

  // La pestaña «Fiduciaria» solo sale cuando la wallet conectada es la fiduciaria de la ronda (o si ya estás en ella).
  const pestanas = VISTAS.filter(([k, , , oculta]) => !oculta || k === vista || (k === "fiduciaria" && address && config && address === config.fiduciaria));

  const disponibles = resumen ? resumen.total - resumen.vendidas : 0;
  const cantidad = Math.max(1, Math.min(Number(fracciones) || 1, Math.max(disponibles, 1)));

  return (
    <div className="app">
      <header className="nav">
        <div className="nav-in">
          <button className="brand" onClick={() => ir("portafolio")} aria-label="Machea, ir a mi portafolio"><Logo /></button>
          <div className="nav-act">
            <span className="red"><Stellar size={18} /><b>Stellar</b><em><i />Testnet</em></span>
            {wallet ? (
              <a className="cuenta" href={`${EXPLORER}/account/${wallet}`} target="_blank" rel="noreferrer" title="Ver tu cuenta en stellar.expert"><i />{corto(wallet, 4)}</a>
            ) : (
              <button className="btn main chico" onClick={conectar} disabled={ocupado}><Billetera size={18} /><span>Conectar<span className="solo-pc"> wallet</span></span></button>
            )}
          </div>
        </div>
      </header>

      <nav className={`tabs ${pestanas.length > 4 ? "cinco" : ""}`} aria-label="Secciones">
        {pestanas.map(([k, nombre, Icono]) => (
          <button key={k} className={vista === k ? "on" : ""} aria-current={vista === k ? "page" : undefined} onClick={() => ir(k)}><Icono size={19} /><span>{nombre}</span></button>
        ))}
      </nav>

      <main className="vista" key={vista}>
        {vista === "portafolio" && (
          <Portafolio wallet={wallet} filas={filas} misFracciones={misFracciones} resumen={resumen} ganancias={muestra ? 50000000n : ganancias} conectar={conectar} ir={ir} ocupado={ocupado} />
        )}

        {vista === "invertir" && (
          <Invertir
            wallet={wallet}
            resumen={resumen}
            cantidad={cantidad}
            setFracciones={setFracciones}
            misFracciones={misFracciones}
            tieneTrustline={tieneTrustline}
            ocupado={ocupado}
            atras={() => ir("portafolio")}
            conectar={conectar}
            aceptarActivo={aceptarActivo}
            invertir={() =>
              accion(`Invertiste ${cantidad} fracciones: ya las ves en tu wallet.`, (c) => invertir(c, { inversionista: address, fracciones: cantidad }))
            }
          />
        )}

        {vista === "seguimiento" && (
          <Seguimiento
            resumen={estadoMuestra && resumen ? { ...resumen, estado: estadoMuestra } : resumen}
            config={config}
            wallet={estadoMuestra && config ? config.fiduciaria : wallet}
            misFracciones={misFracciones}
            ocupado={ocupado}
            conectar={conectar}
            cerrarAntes={() => accion("Ronda cerrada con lo recaudado. Ya puedes liberar los fondos.", (c) => cerrarAntes(c))}
            liberar={() => accion("Fondos liberados a la constructora.", (c) => liberar(c))}
            reembolsar={() => accion("Recuperaste tu dinero.", (c) => reembolsar(c, { tenedor: address, fracciones: misFracciones }))}
            calcularReparto={calcularReparto}
            enviarReparto={enviarElReparto}
            sugerido={sugerido}
          />
        )}

        {vista === "proyectos" && <Proyectos irInvertir={() => ir("invertir")} />}

        {vista === "fiduciaria" && (
          <PortalFiduciaria
            address={address}
            conectar={conectar}
            ocupado={ocupado}
            setOcupado={setOcupado}
            setAviso={setAviso}
            error={error}
            avisoFirmada={avisoFirmada}
            muestra={import.meta.env.DEV && inicial.estadoMuestra === "estados"}
          />
        )}
      </main>

      <footer className="pie">
        <span>Prototipo en la red de pruebas de Stellar. Proyectos y cifras ficticios; no es una oferta de inversión.</span>
        <a href={`${EXPLORER}/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">Ver el contrato en stellar.expert</a>
      </footer>

      {aviso && (
        <div className={`aviso ${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : "status"}>
          <span className="aviso-ico">{aviso.tipo === "ok" ? <Check size={16} /> : aviso.tipo === "error" ? <Equis size={14} /> : null}</span>
          <div className="aviso-txt">
            {aviso.texto}
            {aviso.hash && (
              <>
                {" "}<a href={`${EXPLORER}/tx/${aviso.hash}`} target="_blank" rel="noreferrer">Ver transacción</a>
                <code>{aviso.hash}</code>
              </>
            )}
          </div>
          <button className="aviso-x" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><Equis size={14} /></button>
        </div>
      )}
    </div>
  );
}

function Portafolio({ wallet, filas, misFracciones, resumen, ganancias, conectar, ir, ocupado }) {
  const xlm = Number(filas.find((b) => b.codigo === "XLM")?.balance ?? 0);
  const xlmAnimado = useConteo(xlm);
  const participacion = resumen && resumen.total ? (misFracciones / resumen.total) * 100 : 0;
  // Tus fracciones son una parte de la RONDA; la ronda financia una parte del proyecto. Mostramos las dos.
  const ficha = PROYECTO.modelo ? fichaFinanciera(PROYECTO) : null;
  const delProyecto = ficha && resumen ? (misFracciones / resumen.total) * ficha.participacionRonda * 100 : null;
  const baseDelProyecto = ficha?.modelo === "renta" ? "del edificio" : "del costo del proyecto";
  const avance = resumen && resumen.total ? (resumen.vendidas / resumen.total) * 100 : 0;
  const abierta = resumen?.estado === "Recaudando";
  return (
    <>
      <Cabecera etiqueta="Tu cartera" titulo="Mi portafolio" texto="Tu balance en Stellar y tus fracciones de proyectos inmobiliarios, en un solo lugar." />

      <div className="bento">
        <section className="saldo" aria-label="Balance en Stellar">
          <div className="saldo-top">
            <span className="saldo-et"><Stellar size={20} />Balance en Stellar</span>
            <span className={`saldo-chip ${wallet ? "on" : ""}`}><i />{wallet ? corto(wallet, 4) : "Sin conectar"}</span>
          </div>
          <div>
            <div className="monto">{num2(xlmAnimado)}<span>XLM</span></div>
            <div className="cop">≈ ${formatCop(xlm)} COP <em>(ejemplo)</em></div>
          </div>
          <div className="saldo-acciones">
            {!wallet ? (
              <button className="hbtn" onClick={conectar} disabled={ocupado}><Billetera size={22} />Conectar wallet</button>
            ) : (
              <button className="hbtn" onClick={() => ir("proyectos")}><Edificio size={22} />Ver todos los proyectos</button>
            )}
            <a className="hlink" href={wallet ? `${EXPLORER}/account/${wallet}` : `${EXPLORER}/asset/${ACTIVO.codigo}-${ACTIVO.emisor}`} target="_blank" rel="noreferrer">
              <Externo size={18} />Ver en stellar.expert
            </a>
          </div>
        </section>

        <article className="destacado">
          <div className="destacado-foto">
            <img src={PROYECTO.imagen || fotoProyecto} alt={`Imagen ilustrativa de ${PROYECTO.nombre}`} />
            <span className="proy-tag">Ronda de fondeo</span>
            <EtiquetaVis proyecto={PROYECTO} />
          </div>
          <div className="destacado-cuerpo">
            <h2>{PROYECTO.nombre}</h2>
            <p className="zona"><Pin size={16} />{PROYECTO.zona}</p>
            <div className="proy-avance">
              <div className="barra"><i style={{ width: `${avance}%` }} /></div>
              <span>{resumen ? `${resumen.vendidas} de ${resumen.total} fracciones · ${pct(avance)} %` : "Leyendo la ronda en la red…"}</span>
            </div>
            <button className="btn" onClick={() => ir(abierta || !resumen ? "invertir" : "seguimiento")}>
              {abierta || !resumen ? "Invertir en este proyecto" : "Ver el seguimiento"}<span className="ir"><Arriba size={16} /></span>
            </button>
          </div>
        </article>
      </div>

      <div className="rejilla">
        <button className="fila" onClick={() => ir("invertir")}>
          <span className="ico rosa"><Edificio size={26} /></span>
          <span className="txt">
            <small>Fracciones {ACTIVO.codigo}</small>
            <b>{misFracciones.toLocaleString("es-CO")}</b>
            <em>un activo de Stellar en tu wallet</em>
          </span>
          <span className="flecha"><Arriba size={16} /></span>
        </button>

        <button className="fila part" onClick={() => ir("seguimiento")}>
          <span className="anillo" style={{ "--p": participacion > 0 ? Math.max(participacion, 3) : 0 }}><Grafico size={20} /></span>
          <span className="txt">
            <small>Mi participación</small>
            <b>{pct(participacion)} %</b>
            <em>
              de la ronda de {PROYECTO.nombre}
              {delProyecto !== null && ` · ${delProyecto.toLocaleString("es-CO", { maximumFractionDigits: 3 })} % ${baseDelProyecto}`}
            </em>
          </span>
          <span className="flecha"><Arriba size={16} /></span>
        </button>

        <div className="fila">
          <span className="ico verde"><Stellar size={26} /></span>
          <span className="txt">
            <small>Ganancias recibidas</small>
            <b>{formatXlm(ganancias)}<span>XLM</span></b>
            <em>repartidas por la fiduciaria</em>
          </span>
        </div>
      </div>

      <div className="caja verde">
        <Info size={24} />
        <div><b>¿Qué es esto?</b>Administra tu balance en XLM, tus fracciones (un activo de Stellar) y tu participación en la ronda del proyecto.</div>
      </div>
    </>
  );
}

function Invertir({ wallet, resumen, cantidad, setFracciones, misFracciones, tieneTrustline, ocupado, atras, conectar, aceptarActivo, invertir }) {
  const precioXlm = resumen ? Number(resumen.precio) / 1e7 : 0;
  const total = precioXlm * cantidad;
  const avance = resumen && resumen.total ? (resumen.vendidas / resumen.total) * 100 : 0;
  const abierta = resumen?.estado === "Recaudando";
  const nuevaParticipacion = resumen && resumen.total ? ((misFracciones + cantidad) / resumen.total) * 100 : 0;

  let boton;
  if (!wallet) boton = <button className="btn main" onClick={conectar} disabled={ocupado}><Billetera size={22} />Conectar wallet para invertir</button>;
  else if (!resumen) boton = <button className="btn" disabled>Cargando la ronda…</button>;
  else if (!abierta) boton = <button className="btn" disabled>La ronda ya no recibe inversiones</button>;
  else if (!tieneTrustline) boton = <button className="btn main" onClick={aceptarActivo} disabled={ocupado}><Billetera size={22} />1. Aceptar el activo {ACTIVO.codigo}</button>;
  else boton = <button className="btn main" onClick={invertir} disabled={ocupado}><Billetera size={22} />Invertir con Varial</button>;

  return (
    <>
      <Cabecera etiqueta="Ronda de fondeo" titulo="Invertir en un proyecto" texto="Compra fracciones del proyecto con un pago seguro en Stellar." atras={atras} />

      <div className="dos-col">
        <div className="col">
          <div className="proyecto">
            <img src={PROYECTO.imagen || fotoProyecto} alt={`Imagen ilustrativa de ${PROYECTO.nombre}`} />
            <div className="dato">
              <small>Proyecto</small>
              <h2>{PROYECTO.nombre}</h2>
              <div className="zona"><Pin size={16} />{PROYECTO.zona}</div>
              <div className="etiquetas">
                <span className="unidad">Ronda de fondeo</span>
                <EtiquetaVis proyecto={PROYECTO} />
              </div>
            </div>
          </div>

          {resumen && (
            <div className="resumen">
              <h3>La ronda</h3>
              <div className="dato-fila">
                <span className="ico"><Escudo size={20} /></span>
                <span className="et">Meta</span>
                <span className="val"><b>{num2(precioXlm * resumen.total)} XLM</b><small>≈ ${formatCop(precioXlm * resumen.total)} COP</small></span>
              </div>
              <div className="avance">
                <div className="barra"><i style={{ width: `${avance}%` }} /></div>
                <span>{resumen.vendidas} de {resumen.total} fracciones · {pct(avance)} %</span>
              </div>
              <div className="dato-fila">
                <span className="ico"><Calendario size={20} /></span>
                <span className="et">Plazo</span>
                <span className="val">Hasta {fechaCorta(resumen.fechaLimite)}</span>
              </div>
              <div className="dato-fila">
                <span className="ico"><Edificio size={20} /></span>
                <span className="et">Precio por fracción</span>
                <span className="val"><b>{num2(precioXlm)} XLM</b><small>≈ ${formatCop(precioXlm)} COP</small></span>
              </div>
            </div>
          )}

          <FichaProyecto proyecto={PROYECTO} />
        </div>

        <div className="col compra pegada">
          {abierta && (
            <div className="comprar">
              <label htmlFor="frac"><span className="tile rosa"><Stellar size={22} /></span>Fracciones a comprar</label>
              <div className="stepper">
                <button onClick={() => setFracciones(Math.max(1, cantidad - 1))} aria-label="Menos">−</button>
                <input id="frac" inputMode="numeric" value={cantidad} onChange={(e) => setFracciones(e.target.value.replace(/\D/g, ""))} />
                <button onClick={() => setFracciones(cantidad + 1)} aria-label="Más">+</button>
              </div>
            </div>
          )}

          {abierta && (
            <div className="totales">
              <div className="dato-fila"><span className="et">Total a pagar</span><span className="val"><b>{num2(total)} XLM</b></span></div>
              <div className="dato-fila"><span className="et">Tu participación en la ronda</span><span className="val"><b>{pct(nuevaParticipacion)} %</b></span></div>
              <Proyeccion proyecto={PROYECTO} fracciones={cantidad} />
            </div>
          )}

          {boton}

          <div className="caja verde">
            <Info size={24} />
            <div><b>¿Qué sucede con mi dinero?</b>Tu dinero queda bloqueado en un contrato en Stellar. Si la ronda no llega a la meta y la fiduciaria no la cierra antes del plazo, lo recuperas tú mismo. En producción el pago sería en una moneda estable, no en XLM.</div>
          </div>
        </div>
      </div>
    </>
  );
}

function Seguimiento({ resumen, config, wallet, misFracciones, ocupado, conectar, cerrarAntes, liberar, reembolsar, calcularReparto, enviarReparto, sugerido }) {
  const [copiado, setCopiado] = useState(false);
  if (!resumen) return <Cabecera etiqueta="En la red" titulo="Seguimiento del proyecto" texto="Leyendo la ronda en la red…" />;

  const { estado } = resumen;
  const exito = estado === "Exitosa" || estado === "Liberada";
  const avance = resumen.total ? (resumen.vendidas / resumen.total) * 100 : 0;
  const esFiduciaria = wallet && config && wallet === config.fiduciaria;
  const cerradaAntes = exito && resumen.vendidas < resumen.total; // la fiduciaria la cerró con lo recaudado
  const etiqueta = { Recaudando: "En proceso", Exitosa: cerradaAntes ? "Cerrada con lo recaudado" : "Meta alcanzada", Liberada: "Completada", Fallida: "No se completó" }[estado];

  async function copiar() {
    try {
      await navigator.clipboard.writeText(CONTRACT_ID);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* el navegador no dejó copiar */ }
  }

  return (
    <>
      <Cabecera etiqueta="En la red" titulo="Seguimiento del proyecto" texto="Consulta el estado y la trazabilidad en la red." />

      <div className="dos-col">
        <div className="col">
          <div className="linea">
            <div className="linea-cab">
              <h3>{PROYECTO.nombre}</h3>
              <span className={`estado ${exito ? "ok" : ""}`}>{etiqueta}</span>
            </div>
            <ul className="pasos">
              <Paso estado="hecho" titulo="Ronda abierta" detalle={`Plazo hasta ${fechaCorta(resumen.fechaLimite)}`} fecha />
              <Paso
                estado={estado === "Recaudando" ? "activo" : exito ? "hecho" : "no"}
                titulo="Recaudando fondos"
                detalle={`${resumen.vendidas} de ${resumen.total} fracciones vendidas`}
              />
              <Paso
                estado={exito ? "hecho" : estado === "Fallida" ? "no" : "pendiente"}
                titulo={cerradaAntes ? "Ronda cerrada" : "Meta alcanzada"}
                detalle={cerradaAntes ? "La fiduciaria la cerró antes de tiempo, con lo recaudado" : exito ? "Se vendieron todas las fracciones" : estado === "Fallida" ? "No se alcanzó la meta a tiempo" : "Faltan fracciones por vender"}
              />
              <Paso
                estado={estado === "Liberada" ? "hecho" : estado === "Fallida" ? "no" : "pendiente"}
                titulo="Fondos a la constructora"
                detalle={estado === "Liberada" ? "La fiduciaria los liberó" : estado === "Fallida" ? "Cada inversionista recupera su dinero" : "La fiduciaria los libera al alcanzar la meta o si cierra la ronda antes del plazo"}
              />
            </ul>
            <div className="avance sola">
              <div className="barra"><i style={{ width: `${avance}%` }} /></div>
              <span>{pct(avance)} % de la meta</span>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="tira">
            <div><span className="tile azul"><Stellar size={24} /></span><span className="dato"><small>Recaudado</small><b>{formatXlm(resumen.recaudado)} XLM</b></span></div>
            <div>
              <span className="tile rosa"><Documento size={24} /></span>
              <span className="dato">
                <small>Contrato</small>
                <span className="c">{corto(CONTRACT_ID, 4)}<button onClick={copiar} aria-label="Copiar contrato">{copiado ? <Check size={16} /> : <Copiar size={16} />}</button></span>
              </span>
            </div>
            <div>
              <span className="tile verde"><Externo size={22} /></span>
              <span className="dato">
                <small>Ver en Stellar</small>
                <span className="c"><a href={`${EXPLORER}/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">stellar.expert</a></span>
              </span>
            </div>
          </div>

          <div className="que">
            <h3><Escudo size={26} />¿Qué puede pasar?</h3>
            <p><b>Se llega a la meta:</b> la fiduciaria libera el dinero a la constructora y tus fracciones son tu participación en el proyecto.</p>
            <p><b>La fiduciaria cierra antes del plazo:</b> la ronda queda cerrada con lo recaudado hasta ese momento, se libera a la constructora y ya no hay reembolso.</p>
            <p className="malo"><b>Vence el plazo sin meta ni cierre:</b> devuelves tus fracciones y recuperas tu dinero, sin pedirle permiso a nadie.</p>
          </div>

          {!wallet && <button className="btn" onClick={conectar} disabled={ocupado}><Billetera size={22} />Conectar wallet para actuar</button>}

          {estado === "Fallida" && misFracciones > 0 && (
            <button className="btn warn" onClick={reembolsar} disabled={ocupado}>Recuperar mi dinero ({misFracciones} fracciones)</button>
          )}

          {esFiduciaria && (
            <Fiduciaria estado={estado} vendidas={resumen.vendidas} total={resumen.total} ocupado={ocupado} cerrarAntes={cerrarAntes} liberar={liberar} calcularReparto={calcularReparto} enviarReparto={enviarReparto} sugerido={sugerido} control={sugerido && config ? { fiduciaria: config.fiduciaria, codigo: ACTIVO.codigo, unaVez: PROYECTO.modelo === "venta" } : null} />
          )}
        </div>
      </div>
    </>
  );
}

function Paso({ estado, titulo, detalle, fecha }) {
  return (
    <li className={`paso ${estado}`}>
      <div className={`punto ${estado}`}>{estado === "hecho" ? <Check size={18} /> : estado === "no" ? <Equis size={16} /> : null}</div>
      <div><b>{titulo}</b><span className={fecha ? "fecha" : ""}>{detalle}</span></div>
    </li>
  );
}
