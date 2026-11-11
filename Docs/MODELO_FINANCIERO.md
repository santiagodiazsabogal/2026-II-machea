# Modelo financiero de los proyectos

Esta página explica de dónde salen los números de la app: qué es dato real, qué es supuesto, cómo se calcula cada cifra y qué no se modela. Las fórmulas están en [`app/src/finanzas.js`](../app/src/finanzas.js) y los supuestos de cada proyecto en [`app/src/proyectos.js`](../app/src/proyectos.js).

> Los proyectos, las imágenes y las cifras son **ficticios**. Todo son **estimaciones con supuestos**, no una promesa de rentabilidad ni una oferta de inversión.

## ¿Qué compra una persona?

**No compra un apartamento ni el edificio.** Compra una **parte de la ronda**, y la ronda financia una parte del proyecto:

- En los cinco proyectos de **desarrollo y venta**, la ronda aporta una parte del costo (por ejemplo, el 11,7 % en Mirador de los Cedros) y, por eso, se lleva la misma parte de la utilidad cuando se venden los apartamentos. Quien tiene 10 fracciones ($10 millones) pone el 0,098 % del costo del proyecto y recibe esa parte de la utilidad. No es dueño de ninguna unidad.
- En **Urban 85** (renta), la ronda es dueña de una parte del edificio completo (el 22 %), no de un apartaestudio concreto, y paga esa parte del arriendo cada mes.

Cada fracción es un token de Stellar que representa **la participación en la ronda**: no es una escritura ni un título de propiedad. En la vida real, una fiducia o una sociedad aparte guardaría los bienes y el token sería el derecho sobre lo que ella reparte; esa parte legal no está resuelta en este prototipo.

En la app, «Mi participación» muestra las dos cosas: el porcentaje **de la ronda** y el porcentaje **del proyecto** que eso representa.

## ¿VIS o No VIS?

La app muestra, en cada proyecto, si sus apartamentos son de **vivienda de interés social (VIS)** o **No VIS**. No se pone a mano: **se calcula** con el precio de cada apartamento (área × precio por m²) frente al tope legal.

- **VIP** (prioritaria): hasta 90 salarios mínimos.
- **VIS**: hasta **135 salarios mínimos**. Con el salario mínimo de 2026 ($1.750.905) son **$236.372.175** ([Tributi](https://www.tributi.com/mis-finanzas-personales/salario-minimo-2026-y-vivienda-de-interes-social-en-colombia)).
- **No VIS**: si el apartamento cuesta más.

| Proyecto | Apartamento tipo | Precio | Tipo |
|---|---|---|---|
| Mirador de los Cedros | 72 m² | $533 millones | No VIS |
| Urban 85 | 30 m² | $273 millones | No VIS |
| Reserva del Salitre | 68 m² | $442 millones | No VIS |
| Horizonte Verde | 45 m² | $225 millones | **VIS** |
| Altos de Rosales | 120 m² | $1.680 millones | No VIS |
| Colina Park Living | 65 m² | $449 millones | No VIS |

**Un detalle sobre el tope:** hoy se aplica 135 salarios mínimos de forma general, y el Ministerio de Vivienda publicó en 2026 un borrador de decreto para unificarlo. Antes había un tope de 150 en las ciudades principales. No confirmé si el decreto ya se expidió. Con cualquiera de los dos topes (135 o 150 salarios, unos $263 millones) la clasificación de los seis proyectos es la misma.

**Por qué importa:** la vivienda de interés social deja **menos margen** (12 % en nuestro supuesto, frente al 20 %), y por eso Horizonte Verde rinde menos (5,2 % E.A.). Qué se está financiando también cambia para quien invierte: el cliente final de una VIS tiene acceso a subsidios y créditos con condiciones especiales, lo que no se modela en este prototipo.

## 1. El cambio a pesos

El XLM de testnet no vale nada, y mostrar «1.200 XLM» no le dice nada a un inversionista colombiano. Por eso usamos un cambio fijo y declarado:

**1 XLM de prueba = $100.000 COP** (supuesto, en `TASA_COP_POR_XLM`).

Con eso cada fracción cuesta entre **$500.000 y $1.500.000** (un monto de persona común: las otras plataformas del mercado aceptan desde unos $200.000) y cada ronda reúne entre **$1.000 y $1.600 millones**.

## 2. Los dos modelos

### Desarrollo y venta (cinco proyectos)

Los inversionistas financian una parte del costo del proyecto y reciben la misma parte de la utilidad cuando se venden los apartamentos.

```
ventas    = apartamentos × área × precio por m²
costo     = ventas × (1 − margen)
utilidad  = ventas − costo
retorno   = utilidad ÷ costo
retorno anual (E.A.) = (1 + retorno)^(12 ÷ meses) − 1

la ronda financia   meta ÷ costo   del proyecto
la ronda se lleva   meta × retorno   de utilidad
```

**Ejemplo, Mirador de los Cedros:** 24 apartamentos × 72 m² × $7.400.000 = **$12.787 millones** de ventas. Con un margen de 20 %, el costo es $10.230 millones y la utilidad $2.557 millones (25 % sobre el costo). La ronda aporta $1.200 millones, el 11,7 % del costo, y se lleva $1.200 millones × 25 % = **$300 millones** de utilidad. A 24 meses son **11,8 % efectivo anual**. Quien compra 10 fracciones ($10 millones) recibe $12,5 millones al final.

### Renta (Urban 85)

Los inversionistas son dueños de una parte del edificio y reciben su parte del arriendo neto, cada mes.

```
valor del edificio = apartaestudios × área × precio por m²
arriendo bruto     = apartaestudios × área × arriendo por m² × 12
arriendo cobrado   = bruto × (12 − meses sin arrendar) ÷ 12
arriendo neto      = cobrado × (1 − costos de operación)
rendimiento        = neto ÷ valor del edificio
la ronda se lleva  meta × rendimiento   al año
```

**Ejemplo:** 20 apartaestudios × 30 m² × $9.100.000 = $5.460 millones. Arriendo bruto: 600 m² × $55.000 × 12 = $396 millones. Cobrado (un mes vacío): $363 millones. Neto (18 % de costos): $297,7 millones, o sea **5,5 % anual** del valor del edificio. La ronda ($1.200 millones, el 22 % del edificio) recibe unos **$5,45 millones al mes**, es decir 54,5 XLM.

## 3. Los seis proyectos

| Proyecto | Modelo | Ventas o valor | Costo | Meta | Fracciones × precio | La ronda es | Retorno estimado |
|---|---|---|---|---|---|---|---|
| Mirador de los Cedros | venta | $12.787 M | $10.230 M | $1.200 M | 1.200 × $1.000.000 | 11,7 % del costo | 11,8 % E.A. (24 meses) |
| Urban 85 | renta | $5.460 M | — | $1.200 M | 1.500 × $800.000 | 22 % del edificio | 5,5 % anual neto |
| Reserva del Salitre | venta | $7.956 M | $6.365 M | $1.200 M | 800 × $1.500.000 | 18,9 % del costo | 10,0 % E.A. (28 meses) |
| Horizonte Verde (VIS) | venta | $13.500 M | $11.880 M | $1.000 M | 2.000 × $500.000 | 8,4 % del costo | 5,2 % E.A. (30 meses) |
| Altos de Rosales | venta | $16.800 M | $13.440 M | $1.200 M | 1.000 × $1.200.000 | 8,9 % del costo | 9,3 % E.A. (30 meses) |
| Colina Park Living | venta | $17.940 M | $14.352 M | $1.600 M | 1.600 × $1.000.000 | 11,1 % del costo | 7,7 % E.A. (36 meses) |

*(M = millones de pesos.)* Para tener una referencia: los fondos inmobiliarios en Colombia rinden entre 7 % y 10 % efectivo anual según Rankia, y el arriendo bruto promedio de Bogotá ronda el 7,7 % anual (cálculo propio con datos de Ciencuadras). Los retornos de la tabla quedan en ese orden de magnitud.

## 4. Qué es dato y qué es supuesto

**Datos reales (con fuente):**

| Dato | Valor | Fuente |
|---|---|---|
| Salario mínimo 2026 | $1.750.905 | [Consultorsalud](https://consultorsalud.com/aumento-del-salario-minimo-en-colombia-2026/) |
| Tope de la vivienda de interés social | 135 salarios mínimos ≈ $236 millones | [Tributi](https://www.tributi.com/mis-finanzas-personales/salario-minimo-2026-y-vivienda-de-interes-social-en-colombia) |
| Precio de venta por m² en Bogotá (1.er trimestre de 2026) | promedio $7,42 M; Chapinero ≈ $9,07 M; Usaquén ≈ $7,38 M; Suba ≈ $6,41 M | [Ciencuadras](https://www.ciencuadras.com/blog/evolucion-del-mercado-de-vivienda/novedades-mercado-inmobiliario-bogota-2026/amp) |
| Arriendo por m² en Bogotá | entre $38.000 y $55.000 al mes | [RCN](https://newsroom.rcnradio.com/actualidad/estos-son-los-barrios-mas-baratos-para-vivir-en-arriendo-en-bogota-2026) |
| Rendimiento de fondos inmobiliarios | 7 % a 10 % E.A. | [Rankia](https://www.rankia.co/blog/fondos-inversion-colectiva-colombia/4682854-fondos-inmobiliarios-que-son-como-funcionan) |
| Inversión mínima en otras plataformas | desde $200.000 | [La República](https://www.larepublica.co/finanzas/estas-son-las-empresas-que-hoy-permiten-el-acceso-los-colombianos-al-crowfunding-3427441) |
| Plataforma regulada de crowdfunding inmobiliario | Terrenta, autorizada por la Superfinanciera en 2025 | [LatamFintech](https://www.latamfintech.co/articles/terrenta-plataforma-de-crowdfunding-inmobiliario-recibe-autorizacion-para-iniciar-operaciones) |

**Supuestos nuestros (sin fuente propia, a revisar):**
- Las **unidades y las áreas** de cada proyecto.
- El **precio por m²** de Fontibón ($6,5 M), Rosales ($14 M) y Colina Campestre ($6,9 M). No encontré datos por zona. Horizonte Verde usa $5 M, y cada apartamento de 45 m² queda en $225 millones, por debajo del tope VIS.
- El **margen**: 20 % sobre las ventas, y 12 % en la vivienda de interés social, que deja menos.
- Los **plazos** de venta (24 a 36 meses).
- En Urban 85: el **arriendo** de $55.000 por m² (el extremo alto del rango de Bogotá), **un mes sin arrendar** al año y **18 % de costos de operación**.
- El **costo de construcción** no se calcula aparte: se deduce del margen. No encontré un dato confiable por m² para Bogotá.

## 5. Dónde se ve en la app

- **Proyectos:** cada tarjeta muestra fracciones, precio por fracción en pesos, meta y retorno estimado.
- **Invertir:** la **ficha financiera** del proyecto, con «¿Cómo se calcula?» y las cuentas con los números reales. Y debajo de «Total a pagar», la **proyección** para las fracciones que vas a comprar: tu aporte en pesos y tu retorno estimado (o tu arriendo mensual).
- **Seguimiento, panel de la fiduciaria:** el **monto pactado** para repartir ya no es un número que la fiduciaria escriba: es la utilidad de la ronda (venta) o el arriendo neto del mes (renta). Ejemplo: 3.000 XLM ($300 millones) en Mirador de los Cedros.

## 6. Lo que NO se modela

- **El regreso del capital:** el reparto del contrato solo distribuye ganancias. Devolver el capital al vender se haría por otra vía (fuera de este prototipo).
- **Impuestos, comisión de la fiducia y de la plataforma, y costos de la sociedad que agrupa a los inversionistas.**
- **Riesgo:** atrasos de obra, ventas por debajo del precio esperado o sobrecostos. El retorno es un escenario esperado, no un mínimo.
- **El valor del dinero en el tiempo:** no hay tasa de descuento, solo el retorno efectivo anual.
- **Lo legal y regulatorio:** no resuelto en este prototipo.

## 7. Cómo explicarlo en un minuto

> «Cada proyecto tiene una ficha con cuentas simples. Tomamos cuántos apartamentos hay, su área y el precio real por metro cuadrado de la zona en Bogotá, y de ahí sale el valor de las ventas. Restamos un margen y queda el costo y la utilidad. La ronda financia una parte del costo, así que se lleva la misma parte de la utilidad. De ahí sale el retorno que ves, comparable con los fondos inmobiliarios. Como el XLM de prueba no vale nada, usamos un cambio fijo de $100.000 por XLM para hablar en pesos. Las cifras de los proyectos son ficticias y los supuestos están declarados; y cuando la fiduciaria reparte ganancias, el monto sugerido sale de la misma cuenta.»
