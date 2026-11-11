# App de fondeo (React + Vite)

La interfaz de Machea para invertir en fracciones de un proyecto. Conecta Freighter, lee la ronda de fondeo desde su contrato en Stellar y te deja **invertir**, ver el **seguimiento**, **recuperar tu dinero** si la ronda fracasa y ver las **ganancias** que te reparte la fiduciaria.

```bash
npm install
npm run dev        # muestra el puerto, normalmente http://localhost:5173
npm run build      # compila para producción
```

Requisitos: Node 20 o superior y la extensión Freighter en modo TEST NET, con XLM de prueba.

## Qué hay en `src/`

| Archivo | Qué hace |
|---|---|
| `App.jsx` | Las pantallas (Mi portafolio, Proyectos, Invertir, Seguimiento) y todo el estado |
| `fondeo.js` | Todo lo que habla con el contrato de fondeo: leer la ronda, invertir, liberar, reembolsar y leer ganancias. No tiene interfaz, así que se puede probar desde la terminal |
| `Proyectos.jsx`, `proyectos.js` | El catálogo de los seis proyectos: datos, imagen y la ronda de cada uno. El contrato no guarda el nombre ni la imagen del proyecto |
| `PortalFiduciaria.jsx`, `Fiduciaria.jsx`, `reparto.js` | El portal de la fiduciaria (pestaña «Fiduciaria», visible solo con la wallet de la fiduciaria, o `#fiduciaria`: las seis rondas del catálogo), el panel para liberar y repartir (firmados con Freighter, con confirmación y con el monto pactado) y el cálculo del reparto |
| `Ficha.jsx`, `finanzas.js` | La ficha financiera de cada proyecto, la proyección de lo que gana quien invierte y la etiqueta VIS / No VIS. Las cuentas están explicadas en `Docs/MODELO_FINANCIERO.md` |
| `wallet.js` | Le pide a Freighter que firme. La llave secreta nunca sale de la extensión |
| `stellar.js` | Del starter de la sesión 3: conectar la wallet, leer balances (Horizon) y aceptar un activo (`changeTrust`) |
| `icons.jsx`, `styles.css` | Íconos y estilo de Machea |

## Qué ronda usa

La ronda por defecto se define en `fondeo.js` y se puede cambiar con un archivo `.env` (copia `.env.example`). Para una demo, la app también acepta una ronda por enlace:

```
#invertir?contrato=C…&activo=CODIGO
```

La recuerda en el navegador; el enlace «usar la ronda por defecto» del pie de página la borra. Las rondas nuevas se crean con `demo/ronda.sh` (ver `../demo/README.md`).

## Cómo agregar una operación nueva

1. En `fondeo.js`, una función que simule la llamada al contrato (aquí aparecen los errores) y luego la firme y envíe.
2. En `App.jsx`, el botón que la llama y muestra el hash.
3. Pruébala en testnet y busca el hash en stellar.expert.
