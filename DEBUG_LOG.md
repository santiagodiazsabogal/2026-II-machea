# Debug log

Lo que se rompió, el mensaje exacto y cómo lo resolvimos.

## 2026-10-27 · `stellar.exe` bloqueado en Windows

- **Quién:** Santiago (Windows 11 Home 26H2)
- **Mensaje:** `Una directiva de Control de aplicaciones bloqueó este archivo` al correr `stellar --version` con la CLI instalada por winget.
- **Causa:** Smart App Control de Windows está en modo *enforce* y bloquea ejecutables sin firma o sin reputación.
- **Solución:** instalar la CLI desde el código fuente con `cargo install --locked stellar-cli` y desinstalar la versión de winget para que `stellar` apunte a `~/.cargo/bin/stellar.exe`.

## 2026-10-27 · `stellar contract build` bloqueado

- **Quién:** Santiago
- **Mensaje:** `could not execute process ...\build-script-build (never executed)` · `Una directiva de Control de aplicaciones bloqueó este archivo. (os error 4551)` en `soroban-env-common` y `stellar-xdr`.
- **Qué probamos:** reintentar y cambiar `CARGO_TARGET_DIR`; el bloqueo se mantiene por archivo.
- **Solución:** compilar el `.wasm` en GitHub Actions (Linux) con `stellar contract build` y desplegarlo desde el PC con `stellar contract deploy`. No desactivamos Smart App Control.

## 2026-10-27 a 2026-11-03 · Sin acceso a la organización

- **Mensaje:** `santiagodiazsabogal does not have the correct permissions to execute CloneTemplateRepository`.
- **Solución:** creamos el repo en la cuenta personal y lo transferimos a Javeriana-Blockchain cuando nos agregaron a la organización (3 de noviembre).

## 2026-11-03 · Taller en casa de la sesión 3

- No hubo errores en la app: conectar wallet, trustline a `INMUEBLE` y pago de 10 `INMUEBLE` funcionaron a la primera en Brave con Freighter en TEST NET.
- **Ojo:** el pago de 10 tiene que ir a una cuenta que ya tenga la trustline a `INMUEBLE`; si no, Horizon devuelve `op_no_trust`. Por eso le agregamos la trustline a `alice` antes de pagar.

## 2026-11-04 · El CI de la plantilla no compila con el SDK 28

- **Mensaje:** `soroban-sdk requires stellar-cli v25.2.0+ to build a contract` al correr `cargo build --target wasm32v1-none --release` en el CI.
- **Causa:** con el SDK 28 el contrato solo se compila con `stellar contract build`.
- **Solución:** el CI instala `stellar-cli` y compila con `stellar contract build`; además guarda el `.wasm` como archivo descargable.

## 2026-11-05 · Los errores del contrato llegaban sin mensaje

- **Síntoma:** al rechazar una operación, el cliente de JavaScript devolvía un error con el mensaje vacío, sin saber cuál fue.
- **Causa:** los errores del contrato no tenían descripción.
- **Solución:** documentar cada variante del enum de errores con `///` y redesplegar. Ahora la app muestra el mensaje en español.

## 2026-11-05 · Port 5173 is already in use

- **Mensaje:** `Error: Port 5173 is already in use` al levantar la app, aunque no se veía ningún proceso escuchando.
- **Solución:** levantar la app en otro puerto, por ejemplo `npm run dev -- --port 5180`. Para Freighter el puerto da igual.

## 2026-11-05 · El pago del reparto necesita una nota (memo)

- **Problema:** `stellar tx new payment` no permite poner un memo, y el reparto de ganancias lo necesita para que la app reconozca cada reparto.
- **Solución:** el reparto se hace con un script en Node (`app/scripts/repartir.mjs`), que arma una sola transacción con todos los pagos y la nota `REPARTO <codigo>`.

## 2026-11-05 · La app tardaba unos 17 segundos en conectar

- **Síntoma:** al conectar la wallet y al hacer transacciones, la app se demoraba mucho.
- **Causa:** medida con el código real: cada lectura del contrato (`resumen`, `config`) era una simulación de 5 a 10 segundos, y la app creaba un cliente nuevo (descargando de nuevo la interfaz del contrato) varias veces, todo en fila. El servidor de contratos de testnet además responde de forma irregular (de 0,3 a 4 segundos por llamada).
- **Solución:** `leerRonda` lee lo que el contrato tiene guardado en una sola llamada (0,55 s, mismos datos que el contrato); la interfaz del contrato se descarga una sola vez; las lecturas van en paralelo; la pantalla se actualiza sola cada 15 segundos; y la app avisa cuándo se firmó la transacción y falta la confirmación de la red.

## 2026-11-05 · Un botón de la pestaña Demo completó sin querer la ronda de pruebas

- **Síntoma:** la ronda por defecto (`ALAMEDA1`) apareció con la meta cumplida sin que nadie la hubiera comprado a mano.
- **Causa:** el botón «Comprar lo que falta» de la pestaña Demo actúa sobre la ronda activa, y esa era la ronda por defecto. En la red quedó una sola transacción: `comprador-prueba` invirtió las 79 fracciones restantes. El contrato no hizo nada raro: para marcar la meta hace falta que alguien firme y pague en `invertir`.
- **Lo que no se puede hacer:** reabrir o reiniciar esa ronda. Su contrato no tiene función para borrar lo vendido y lo que queda en la blockchain no se borra.
- **Solución:** (1) una ronda por defecto nueva, `ALAMEDA2`, con plazo de 14 días para cubrir el Demo Day; (2) los botones «Comprar lo que falta», «Liberar fondos» y «Repartir ganancias» ahora piden confirmación con un aviso antes de firmar, y en la ronda por defecto el aviso lo advierte de forma explícita.
- **Resuelto después:** se quitó la pestaña Demo y con ella las llaves del código (ver la entrada siguiente).

## 2026-11-05 · El servidor de desarrollo servía un CSS viejo

- **Síntoma:** después de restaurar `styles.css` con `git checkout` y agregarle reglas, el navegador mostraba el diseño sin esas reglas, aunque el archivo y la descarga directa del CSS estaban bien.
- **Causa:** Vite no volvió a procesar el archivo porque el cambio de `git checkout` y la edición siguiente llegaron casi a la vez.
- **Solución:** `touch app/src/styles.css` fuerza que Vite lo vuelva a leer. En el navegador, recargar con Ctrl+F5.

## 2026-11-05 · El plazo de una ronda cae un minuto después de lo calculado

- **Síntoma:** al crear las rondas del catálogo, tres quedaron con plazo a las 12:00 a. m. del día siguiente en vez de las 11:59 p. m. de la fecha del catálogo.
- **Causa:** el plazo se fija dentro del contrato como «hora del bloque + duración» cuando corre `init`, y entre calcular la duración y ejecutar `init` pasan unos 40 a 70 segundos (crear el activo, subir y desplegar el contrato).
- **Solución:** al calcular la duración desde el catálogo se restan 150 segundos (`duracionHasta` en `app/src/proyectos.js`). Las tres rondas afectadas se recrearon con otro código de activo (`CEDROS2`, `URBAN852`, `HORIZONTE2`), porque el plazo de una ronda no se puede cambiar y un activo solo puede tener un contrato como administrador.

## 2026-11-08 · Se quita la pestaña Demo y las llaves salen del código

- **Decisión:** la pestaña Demo era un atajo para presentar (cuentas de prueba con llaves escritas en el código que creaban rondas, compraban y liberaban). No era parte del producto y traía problemas: un clic completó una ronda real, las llaves quedaban en el repositorio (y en su historial) y no se podía hacer público sin riesgo para las rondas.
- **Qué hay ahora:** las rondas las crea el equipo con `demo/ronda.sh`; los inversionistas son wallets reales (con tres wallets se llena una ronda pequeña); y **la fiduciaria libera y reparte desde el Panel de la fiduciaria de «Seguimiento», firmando con su propia wallet en Freighter** (con confirmación). El reparto se probó en testnet con la misma función de envío que usa la app.
- **Nota:** las llaves que estuvieron en `app/src/demoKeys.js` siguen en el historial de commits de este repositorio. Si el repositorio se hace público, conviene antes crear rondas nuevas con cuentas nuevas.

## 2026-11-08 · Las cifras del catálogo no eran creíbles en pesos

- **Síntoma:** la app mostraba la meta de 1.200 XLM como «$3.600.000 COP»: el cambio de ejemplo era de 3.000 pesos por XLM y ningún proyecto de Bogotá se financia con tres millones y medio.
- **Causa:** los montos del PDF del catálogo estaban pensados en XLM, sin un criterio para pasarlos a pesos.
- **Solución:** (1) un cambio fijo y declarado, 1 XLM de prueba = $100.000 COP; (2) las seis rondas se recrearon con 10 veces más fracciones al mismo precio, para llegar a metas de $1.000 a $1.600 millones con fracciones de $500.000 a $1.500.000; (3) una ficha financiera por proyecto, calculada con datos de Bogotá y supuestos declarados (`app/src/finanzas.js`, `Docs/MODELO_FINANCIERO.md`); (4) el monto sugerido para repartir sale de esa ficha.
- **Nota:** una ronda no se puede modificar, así que las rondas anteriores del catálogo quedaron como historial. Las nuevas usan una cuenta emisora nueva (`emisor-machea`), por eso los activos se llaman otra vez `CEDROS`, `URBAN85`, etc., pero con otro emisor: en Freighter hay que aceptar el activo del emisor nuevo.

## 2026-11-08 · Limpieza: se quita lo que ya nadie usa

- **Qué se quitó:** los scripts `demo/completar.sh`, `demo/repartir.sh` y `app/scripts/repartir.mjs` (la app ya libera y reparte desde el panel de la fiduciaria y las rondas se llenan con wallets reales); dos funciones de `stellar.js` sin usar (`enviarPago` y `trustlineYPago`); seis íconos, los estilos de la pestaña Demo (45 líneas de CSS), exportaciones y `import` que nadie usaba y el script `test` de `package.json` (la app no tiene pruebas propias).
- **Qué se dejó:** `demo/ronda.sh`, porque es la única forma de crear en el repositorio una ronda de plazo corto para la demo del reembolso.
- **Cómo se comprobó que no se rompió nada:** 8 pantallas, en computador y en celular, se compararon píxel por píxel antes y después de la limpieza: las 16 capturas quedaron idénticas.

## 2026-11-10 · La fiduciaria pasa a ser la wallet de Santiago y se agrega el cierre anticipado

- **Por qué:** la fiduciaria era una cuenta de la terminal que había que importar a Freighter, con su llave secreta de por medio. Era una complicación innecesaria para la demo. Además, una ronda que no se llena no tenía forma de cerrarse.
- **Qué se hizo:** (1) se agregó `cerrar` al contrato (solo la fiduciaria, ronda abierta, antes del plazo y con al menos una inversión), con 9 pruebas nuevas (31 en total) y su botón en la app; (2) `init` dejó de pedir la firma de la fiduciaria; (3) se crearon de nuevo las seis rondas del catálogo, con la wallet de Freighter de Santiago como fiduciaria, y una ronda `ENSAYO` para practicar; (4) se actualizaron el catálogo, los docs y la guía de la demo.
- **Por qué hubo que crear rondas nuevas:** la fiduciaria se fija al iniciar la ronda y no se puede cambiar. Además el contrato antiguo no tiene `cerrar`, y el activo de cada ronda solo lo administra el contrato que lo emite. Una cuenta emisora nueva (`emisor-rondas`) evitó choques con los activos viejos.
- **Qué se aprendió:** al principio el `init` exigía la firma de la fiduciaria, y con su wallet de Freighter eso obligaba a firmar cada ronda desde una página temporal. Para simplificar la preparación se quitó esa exigencia (queda una prueba que lo documenta). El costo, explicado en `Docs/DISENO_FONDEO.md`: quien despliega elige la fiduciaria, y en producción se usaría el constructor de Soroban. Por eso las rondas se volvieron a crear con un emisor nuevo (`emisor-rondas`).
- **Qué quedó como historial:** las rondas anteriores siguen en la red, pero ninguna parte de la app o de los docs apunta a ellas.

## 2026-11-11 · «Pulsé invertir y no pasó nada»: la compra sí se hizo, en otra ronda

- **Síntoma:** al ensayar con `ENSAYO`, Santiago pulsó el botón y creyó que no pasaba nada. La cuenta terminó con 8 fracciones de CEDROS y 80 XLM menos.
- **Causas:** (1) la ronda se lee al cargar la página, y un enlace que solo cambia lo que va después de `#` no recarga: la app siguió con la ronda por defecto (Cedros) y la compra se hizo ahí; (2) el aviso («Esperando tu firma…») sale al final de la tarjeta y en pantallas bajas quedaba fuera de la vista; (3) mientras cargaba la ronda, el botón decía «La ronda ya no recibe inversiones».
- **Solución:** el aviso se desplaza a la vista; el botón dice «Cargando la ronda…» mientras llegan los datos; y la guía de la demo explica que hay que recargar con F5 después de pegar un enlace de ronda.
- **Otros cambios del día:** el botón de «Mi portafolio» ahora dice «Ver todos los proyectos» y abre el catálogo; la pestaña **Fiduciaria** aparece en el menú cuando se conecta la wallet de la fiduciaria (cinco pestañas más compactas para que no se pisen con la red).
- **Qué se probó y qué no:** con una Freighter simulada en el navegador se comprobó cada cambio y el flujo hasta pedir la firma. Las firmas reales de cerrar, liberar y repartir con la wallet de Santiago siguen pendientes de ensayo.
- **Nota:** Cedros quedó con 8 fracciones vendidas (80 XLM): ya no está en cero. Una ronda no se puede reiniciar.
