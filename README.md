# Machea · Ruta JaveBlockchain 2026-II

> Ruta Fundamentos del Semillero JaveBlockchain (Pontificia Universidad Javeriana).
> Equipo Machea. Integrantes: Santiago Diaz Sabogal, Juan Diego Ortiz Guerrero y Carlos Andrés Figueroa Vega.

## Qué es este proyecto

Inversión fraccionada en Stellar: una persona con montos pequeños no puede invertir en un proyecto inmobiliario porque tiene que confiar su dinero a un tercero; con la app, cualquiera compra fracciones del proyecto (un activo de Stellar), el dinero queda bloqueado en un contrato a la vista de todos, y solo se libera a la constructora si se completa la meta: si no, cada inversionista recupera lo suyo.

## Cómo funciona

1. Una **ronda de fondeo** tiene una meta (un número de fracciones), un precio por fracción y un plazo.
2. **Cualquiera invierte:** acepta el activo en su wallet (trustline) y compra fracciones. El contrato recibe el dinero y le entrega las fracciones, un activo de Stellar que ve en Freighter.
3. **Si se venden todas las fracciones,** la fiduciaria libera el dinero a la constructora. **Si pasa el plazo sin completarse,** la ronda falla sola y cada tenedor devuelve sus fracciones y recupera su dinero.
4. **Ganancias:** la fiduciaria reparte un monto (por ejemplo, el arriendo) entre los tenedores, según su porcentaje de fracciones.

| Pantalla | Operación de Stellar | ¿Firma Freighter? |
|---|---|---|
| 0 · Proyectos | Lectura `resumen` de la ronda de cada proyecto del catálogo (avance en vivo) y su retorno estimado | No |
| 1 · Mi portafolio | Lectura de la cuenta en Horizon: balance de XLM, fracciones y ganancias recibidas | No |
| 2 · Invertir en un proyecto | `changeTrust` para aceptar el activo e `invertir` en el contrato de fondeo | Sí |
| 3 · Seguimiento del proyecto | Lectura `resumen` del contrato; la fiduciaria firma `cerrar` (cierre anticipado), `liberar` y reparte ganancias; el tenedor firma `reembolsar` | No al consultar; Sí al cerrar, liberar, repartir o reembolsar |
| Portal de la fiduciaria (pestaña **Fiduciaria**, solo con su wallet; o `#fiduciaria`) | Las seis rondas del catálogo en una pantalla: cierre anticipado, `liberar` y reparto de ganancias, solo con la wallet de la fiduciaria | Sí |

## Estado actual

| Pieza | Qué es | Estado |
|---|---|---|
| **Contrato de fondeo** (`contracts/fondeo/`) | La ronda: invertir, cerrar antes de tiempo, liberar, reembolsar. El contrato emite y destruye las fracciones | 31 pruebas automáticas; probado en testnet (rondas de éxito y de fracaso) |
| **App** (`app/`) | Las pantallas (Proyectos, Mi portafolio, Invertir y Seguimiento) y el portal de la fiduciaria, conectadas al contrato | Funciona; falta el ensayo con Freighter en el navegador |
| **Portal y panel de la fiduciaria** | Cerrar la ronda antes de tiempo, liberar fondos y repartir ganancias, firmados con la wallet de la fiduciaria (Freighter) y con confirmación; el monto del reparto es el pactado por el modelo | Reparto probado en testnet y pantalla probada en el navegador; falta el ensayo con la wallet de la fiduciaria en Freighter |
| **Guía de la demo** (`demo/`) | Cómo mostrar el ciclo completo y el script `ronda.sh`, que crea rondas de prueba (por ejemplo, la del reembolso) | Probado en testnet. Ver [`demo/README.md`](demo/README.md) |

El **CI de GitHub** compila los contratos, corre todas las pruebas y construye la app en cada cambio.

Lo que **no** hace todavía: repartir ganancias dentro del contrato, verificar a los inversionistas, usar pesos reales ni resolver lo legal. Es un prototipo en testnet.

## Probar la app

```bash
cd app
npm install
npm run dev        # muestra el puerto, normalmente http://localhost:5173
```

Requisitos: Node 20 o superior y la extensión **Freighter en TEST NET**, con XLM de prueba (Friendbot). La app trae una ronda por defecto; para crear rondas nuevas y ensayar la demo completa, sigue [`demo/README.md`](demo/README.md).

## El activo de las fracciones

Cada fracción es **1,0000000 de un activo de Stellar** del proyecto. El contrato de fondeo es su administrador: emite los tokens al invertir y los destruye al reembolsar.

| Dato | Valor |
|---|---|
| Ronda por defecto | Mirador de los Cedros, activo `CEDROS` |
| Fiduciaria | `GAATGMTDWWWTRSFYMDKCGGV2ALLFFOSWTSJPJGIGDGSU4J2POOGLNFWX` (la wallet de Freighter de Santiago: firma `cerrar`, `liberar` y los repartos; no firmó la creación de las rondas) |
| Emisora | `GAK6FDVYLICN6GTW7TVEZJ65PWNM3OV474PMWQKBYS6VYPL2PLTV2SYB` |
| Contrato de fondeo | `CAJISXLJQL67VLMTJSLD2BVE2GFVIEYYAZB5AW3JFR4K3PSSHI7XKLE4` |
| Ronda | 1.200 fracciones de 10 XLM ($1.000.000 cada una), meta de $1.200 millones, hasta el 26 de noviembre de 2026 (11:56 p. m.) |
| Explorador | https://stellar.expert/explorer/testnet/asset/CEDROS-GAK6FDVYLICN6GTW7TVEZJ65PWNM3OV474PMWQKBYS6VYPL2PLTV2SYB |

Cada ronda usa su propio activo y contrato. Las seis rondas del catálogo y la ronda de ensayo (`ENSAYO`, ver [`demo/README.md`](demo/README.md)) tienen como fiduciaria la wallet de Freighter de Santiago, y su contrato incluye el **cierre anticipado**. Las rondas anteriores (`ALAMEDA1`, `ALAMEDA2` y las versiones previas del catálogo) ya no se usan: lo que se escribe en la blockchain no se borra, pero la app y los docs solo apuntan a las vigentes.

## Proyectos del catálogo

Seis proyectos ficticios de Bogotá (de `Catalogo_Machea.pdf`), cada uno con su propia ronda real en testnet. La app los muestra en la pestaña **Proyectos** y lee el avance directo de la red. El contrato no guarda el nombre ni la imagen del proyecto: eso vive en [`app/src/proyectos.js`](app/src/proyectos.js).

Las cifras siguen un **modelo financiero** con datos reales de Bogotá y supuestos declarados, con un cambio fijo de **1 XLM de prueba = $100.000 COP**. Está explicado, con fuentes y límites, en [`Docs/MODELO_FINANCIERO.md`](Docs/MODELO_FINANCIERO.md). Son estimaciones, no una promesa de rentabilidad.

| # | Proyecto | Zona | Fracciones × precio | Meta | Fecha límite | Retorno estimado | Activo | Contrato de la ronda |
|---|---|---|---|---|---|---|---|---|
| 1 | Mirador de los Cedros | Cedritos, Usaquén | 1.200 × $1.000.000 | $1.200 millones | 26 nov 2026 | 11,8 % E.A. | `CEDROS` | `CAJISXLJQL67VLMTJSLD2BVE2GFVIEYYAZB5AW3JFR4K3PSSHI7XKLE4` |
| 2 | Urban 85 | Chapinero Alto | 1.500 × $800.000 | $1.200 millones | 30 nov 2026 | 5,5 % anual (renta) | `URBAN85` | `CDPFBFVLPAIVU7QZ3AVTX2E257VBR37FWHKHQSMCIXBHGHFHLDTG2AMI` |
| 3 | Reserva del Salitre | Salitre, Fontibón | 800 × $1.500.000 | $1.200 millones | 4 dic 2026 | 10,0 % E.A. | `SALITRE` | `CCLECZ3KH4NRDDIYEBTON376K4FN6H3GMEREKYAMNGLFKU6C6IJ27R7M` |
| 4 | Horizonte Verde | Bosa | 2.000 × $500.000 | $1.000 millones | 8 dic 2026 | 5,2 % E.A. | `HORIZONTE` | `CD2AZRYYQXFMGYNQJBEGN23NU7UTYNU5TMZZUSVDZ6ZYOERVJYPYWASJ` |
| 5 | Altos de Rosales | Rosales, Chapinero | 1.000 × $1.200.000 | $1.200 millones | 12 dic 2026 | 9,3 % E.A. | `ROSALES` | `CAVBA76FTW4QOIQAHCIS75PFDNHYIDCYD5PF7DAKD2SHKUCK75UONR3R` |
| 6 | Colina Park Living | Colina Campestre, Suba | 1.600 × $1.000.000 | $1.600 millones | 18 dic 2026 | 7,7 % E.A. | `COLINA` | `CADTPSHEZ74ZZDPBKMR35XQ4CZPTL2NNH3A5SNOFLSQ2N4ES5KTMUYWG` |

Datos e imágenes ficticios para el prototipo. No son ofertas de inversión.

## Estructura

```
README.md                      ← esta página
DEBUG_LOG.md                   ← lo que se rompió y cómo lo resolvimos
app/                           ← dApp (React + Vite) conectada al contrato de fondeo
  src/                         ← App.jsx (pantallas), fondeo.js (habla con el contrato),
                                  wallet.js (firma con Freighter), stellar.js (starter)
contracts/
  fondeo/                      ← inversión fraccionada con un activo de Stellar
demo/                          ← guía de la demo y ronda.sh (crea rondas de prueba)
Docs/
  DISENO_FONDEO.md             ← diseño del contrato de fondeo
  PANTALLAS.md                 ← las pantallas y sus imágenes
  Ruta JaveBlockchain/         ← team, getting started y entrevistas
.github/workflows/ci.yml       ← el CI
```

## Historia (sesiones anteriores)

- **Etapa anterior, separación de vivienda con pago bloqueado:** se retiró del repositorio para dejar solo el proyecto definitivo. Sigue guardada en la etiqueta `antes-de-quitar-la-separacion` y en la rama `semana-4/app-separacion`. Para recuperarla: `git checkout antes-de-quitar-la-separacion -- contracts/separacion Docs/DISENO_CONTRATO.md`.
- **Sesión 2:** primer activo del equipo, `INMUEBLE` (emisora `GB6NHYBNEESIBXH4JQFLX7SQYIZUNBAQNGNZCYRFT6RWNHEQIW6RK4ND`, distribuidora `GBHAHSJU2JT7ZIZ7U73CMAPKGK4STVFFCEI7SPAB7SKX6TDD5E233GRG`, 1 000 000 emitidos). [Explorador](https://stellar.expert/explorer/testnet/asset/INMUEBLE-GB6NHYBNEESIBXH4JQFLX7SQYIZUNBAQNGNZCYRFT6RWNHEQIW6RK4ND).
- **Semana 3, pago hecho desde la app:** 10 `INMUEBLE` de la Freighter de Santiago (`GAATGMTDWWWTRSFYMDKCGGV2ALLFFOSWTSJPJGIGDGSU4J2POOGLNFWX`) a `alice` (`GDMXXGNVCOLW3G3QGW3XJSOG7IKIRMJUNPAJHY5WH4EOMPCDNFZUT7GD`), hash `f03796503357db92cf7ee34a61b6a4d68bf4fe5283a446f5d0c8cd8118ff4b0e` ([ver](https://stellar.expert/explorer/testnet/tx/f03796503357db92cf7ee34a61b6a4d68bf4fe5283a446f5d0c8cd8118ff4b0e)). Antes: trustline (`58ce984ef813f63890e89088ea4f560928b557e2cc22de845171ec9506fd4c0d`) y 100 `INMUEBLE` recibidos de la distribuidora (`4390f0810c3f51a37fa8c663f9920caa106bbeb7377ea9c77730d287343beedf`).
- **Getting Started:** `hello_world` e `increment` desplegados en testnet; ver [`Docs/Ruta JaveBlockchain/gettingStarted.md`](<Docs/Ruta JaveBlockchain/gettingStarted.md>).

## Enlaces

- Sitio de la Ruta: https://javeblockchain.pages.dev
- Guía de la sesión 3: https://github.com/Javeriana-Blockchain/ruta-2026-II/blob/main/GUIA_S3.md
