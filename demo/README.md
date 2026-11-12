# Guía de la demo

Cómo mostrar **todo el ciclo** en vivo: invertir, cerrar la ronda (completa o antes de tiempo), liberar los fondos, repartir ganancias y recuperar el dinero cuando una ronda falla. No hace falta simular a nadie: todo se hace con wallets reales en Varial.

## Lo que se necesita

- Brave con **Varial en TEST NET** y XLM de prueba en cada wallet (a cada cuenta le sirve Friendbot).
- **La fiduciaria es la wallet de Varial de Santiago** (`GAATGM…NLFWX`). No hay que importar ninguna llave: con esa cuenta conectada, la app muestra las acciones de la fiduciaria. Los inversionistas son otras wallets (por ejemplo, las de Juan Diego y Carlos).
- La app corriendo: `cd app && npm install && npm run dev` (anota el puerto que muestra).
- Cada wallet tiene que **aceptar el activo** del proyecto antes de invertir (la app lo pide con el botón «1. Aceptar el activo»).
- Para el reembolso, una terminal **Git Bash** en la carpeta del repo donde `stellar --version` funcione (ver más abajo).

## La fiduciaria desde la app (con Varial)

Cerrar la ronda, liberar los fondos y repartir ganancias son tareas de la fiduciaria, y la app las hace con **su wallet**, como cualquier otra operación:

1. Conecta la wallet de la fiduciaria (la tuya) y abre la pestaña **Fiduciaria** (aparece sola al conectar tu wallet; también se abre con `http://localhost:5173/#fiduciaria`): es el **portal de la fiduciaria** y ahí ves las seis rondas del catálogo y la acción que toca en cada una. También aparece el **Panel de la fiduciaria** en **Seguimiento**, para la ronda activa. Solo lo ve la fiduciaria de esa ronda.
2. **Mientras la ronda está abierta** y ya tiene inversiones: **Cerrar la ronda antes de tiempo**. Es el *cierre anticipado*: la ronda queda cerrada con lo recaudado hasta ahora, nadie más invierte y no hay reembolso. Solo vale antes del plazo.
3. Cuando la ronda llega a la meta (o se cerró antes de tiempo): **Liberar fondos a la constructora**. Se envía lo recaudado.
4. Cuando está completada: el **monto está pactado** por las condiciones del proyecto (ver [`Docs/MODELO_FINANCIERO.md`](../Docs/MODELO_FINANCIERO.md)) y la fiduciaria no lo modifica; solo pulsa **Repartir ganancias**. En la ronda de ensayo el monto se escribe. En los proyectos de venta el reparto es de una sola vez, y la app avisa si ya se hizo. La app calcula quién recibe cuánto (según sus fracciones), te lo muestra y, al confirmar, Varial firma **una sola transacción** con todos los pagos.

Las tres acciones piden confirmación porque no se pueden deshacer.

> Solo en desarrollo (`npm run dev`) puedes verlos sin tener la wallet de la fiduciaria: `#fiduciaria?muestra=estados` (cada ronda en un estado distinto) o `#seguimiento?muestra=exitosa`, `?muestra=liberada` o `?muestra=fallida`.

## Ensayo: la ronda `ENSAYO`

Antes de la presentación, ensaya el cierre anticipado, liberar y repartir en una ronda que no importa: **ENSAYO**, de 20 fracciones de 5 XLM, con tu wallet como fiduciaria. No se puede reiniciar, así que úsala una vez para entender los pasos.

`http://localhost:5173/#invertir?contrato=CDVQ2KCHRF76EUZYBP2FE76YEPIRK5ZWD7TXQEX3RY4QFNPRA3SPFOSL&activo=ENSAYO&emisor=GAK6FDVYLICN6GTW7TVEZJ65PWNM3OV474PMWQKBYS6VYPL2PLTV2SYB`

1. Con otra wallet, invierte unas fracciones (no todas).
2. Con la tuya, en **Seguimiento**: **Cerrar la ronda antes de tiempo** → **Liberar fondos** → **Repartir ganancias**.

## Demo A · La ronda se completa

Las seis rondas del catálogo ya existen en la red. Se llenan entre tres wallets: reúnen entre 10.000 y 16.000 XLM y cada wallet de prueba tiene unos 10.000. Por ejemplo, **Reserva del Salitre** (800 fracciones de 15 XLM = 12.000 XLM): Santiago compra 300 fracciones, Juan Diego 300 y Carlos 200.

**En vivo:**
1. **Conectar wallet** y elegir el proyecto en **Proyectos**.
2. **«1. Aceptar el activo»** y **«Invertir con Varial»**. El activo aparece en la wallet.
3. **Seguimiento:** sube la barra de avance a medida que los demás invierten.
4. Con la meta alcanzada, la fiduciaria **libera los fondos**: el estado pasa a **«Completada»**. (Si no se llena, la fiduciaria puede **cerrar la ronda antes de tiempo** y luego liberar lo recaudado.)
5. La fiduciaria **reparte ganancias**; en **Mi portafolio** aparece **«Ganancias recibidas»**.

## Demo B · La ronda fracasa y se recupera el dinero

Las rondas del catálogo duran semanas, así que para mostrar el reembolso se crea una ronda de **plazo corto**. La duración de una ronda se fija **cuando se crea**.

**Preparar 6 minutos antes de presentar:**

```bash
demo/ronda.sh --fracciones 10 --duracion 360 --app http://localhost:5173
```

Opciones: `--fracciones` (por defecto 100), `--precio` en XLM (10), `--duracion` en segundos (604800 = 7 días) y `--app` con la dirección de tu app. Crea un activo y un contrato nuevos en cada ejecución (la primera vez tarda unos 2 minutos porque baja el contrato compilado de GitHub; después, cerca de 1 minuto). El plazo cuenta desde que el script termina. Abre el enlace que imprime y deja la pestaña lista.

**En vivo:**
1. **Conectar wallet** → **Invertir** 2 fracciones (aceptar el activo + invertir).
2. Mientras pasa el plazo, explica la regla: «si vence el plazo sin llegar a la meta y sin cierre de la fiduciaria, cada inversionista recupera lo suyo».
3. Cuando vence el plazo, en **Seguimiento** aparece **«No se completó»** con los pasos en rojo.
4. Pulsa **«Recuperar mi dinero»** → Varial → tu saldo vuelve y el activo queda en 0.

> Calcula el tiempo: crear la ronda toma cerca de 1 minuto, y aceptar el activo e invertir otro minuto. Con 360 segundos de plazo sobra margen para hablar antes de que venza.

`ronda.sh` sirve para rondas de reembolso (el reembolso lo firma quien invirtió, no la fiduciaria). Usa cuentas de prueba guardadas con `stellar-cli` en este computador: `emisor-alameda` (emite el activo) y `fiduciaria-machea` (despliega y configura el contrato), y la constructora `GA2QOK3V…`. Esas rondas no se administran desde la app: son solo para mostrar el reembolso.

## Cómo funciona el reparto de ganancias

La app mira en la red **quién tiene fracciones en ese momento**, calcula la parte de cada uno (su porcentaje del total) y la fiduciaria manda todos los pagos juntos en **una sola transacción**, con la nota `REPARTO <codigo>`. Así nadie puede cobrar dos veces pasando sus fracciones a otra cuenta.

- Se puede repetir (por ejemplo, un reparto por mes): la app suma todos los repartos de esa ronda.
- **Límites del prototipo:** el reparto lo hace la fiduciaria **fuera del contrato** (hay que confiar en ella), solo le paga a cuentas de Stellar normales y cabe hasta unas 100 personas por transacción. El reparto automático dentro del contrato queda para la siguiente etapa.

## Si algo falla

- **Varial no se abre:** revisa que esté en TEST NET y desbloqueada; recarga la página.
- **La app no muestra la ronda nueva:** abre el enlace y **recarga con F5**: la ronda se lee al cargar la página, y pegar un enlace que solo cambia lo que va después de `#` no la recarga. Si no, invertirás en la ronda anterior. Se nota en el nombre del proyecto: `ENSAYO` dice «Residencial Alameda» con 20 fracciones.
- **Cambiar de wallet:** cambia de cuenta en Varial, recarga con F5 y pulsa «Conectar wallet». Varial no deja que la página elija la cuenta.
- **«Pulsé y no pasó nada»:** la ventana de Varial es aparte y a veces queda detrás del navegador (mira la barra de tareas o pulsa el icono de la extensión). Con `ENSAYO` o una ronda nueva, el primer botón es «1. Aceptar el activo», no «Invertir». Para volver a la ronda por defecto: `#portafolio?ronda=reset`.
- **`ronda.sh` falla:** vuelve a correrlo; crea un activo nuevo cada vez, así que no estorba lo que quedó de antes.
- **Plan B:** ten a mano capturas o una grabación de pantalla del ciclo completo, hecha en el ensayo.

## Referencia

- La app acepta cualquier ronda con un enlace: `#invertir?contrato=C…&activo=CODIGO&emisor=G…` (y recuerda la elección en el navegador).
- Diseño del contrato: [`Docs/DISENO_FONDEO.md`](../Docs/DISENO_FONDEO.md).
