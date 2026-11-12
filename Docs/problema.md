# Lienzo del problema

> Basado en las 5 entrevistas del 29 de octubre de 2026 (ver [`entrevistas.md`](<Ruta JaveBlockchain/entrevistas.md>)). **Límite que conviene decir:** fueron de **validación de la propuesta de valor**, no del problema. A cada persona se le contó la idea y se registró su reacción; no se preguntó qué hace hoy ni cuánto le cuesta. Por eso aquí van **resúmenes de las notas, no citas textuales**; las citas exactas siguen por recuperar de las notas originales.

## Usuario

Una persona joven con ahorros pequeños (de unos $500.000 a unos pocos millones de pesos) que quiere empezar a invertir en vivienda en Bogotá, pero **no le alcanza** para comprar un apartamento ni para entrar a un proyecto. Las entrevistas apuntan a dos perfiles: quien está empezando su vida financiera y quien, con pocos recursos, quiere llegar a tener vivienda.

## Situación

Cuando tiene plata ahorrada y quiere que "trabaje" en algo real y conocido como el ladrillo. Mira las opciones y se encuentra con que: comprar vivienda exige millones de pesos de cuota inicial, y las alternativas pequeñas (fondos, plataformas) piden confiar el dinero a un administrador sin poder ver qué pasa con él.

## Dolor

- **No le alcanza** para entrar a un proyecto inmobiliario. Es lo que más apareció en las entrevistas.
- Si entra por un intermediario, entrega su dinero y **no ve** dónde está ni qué pasa si el proyecto no sale. Es nuestra hipótesis inicial y **ningún entrevistado la nombró primero**.
- No sabe si podrá recuperarlo si el proyecto no llega a la meta (también hipótesis; no se preguntó).

Lo que dijeron (resúmenes de las notas, **no son citas textuales**):

- **Rafael (19 años, experiencia en construcción):** la idea tiene mucho potencial porque el poder adquisitivo es cada vez menor y permite empezar a decidir sobre vivienda con un presupuesto más accesible.
- **Laura (19 años):** abre oportunidades para quien empieza su vida financiera y quiere llegar a tener vivienda.
- **Ami (30 años, propietario):** ve potencial para personas de estratos bajos que quieren invertir en vivienda.

> Pendiente: recuperar de las notas originales las frases exactas de estas tres personas.

## Solución actual

| Cómo lo resuelve hoy | Qué le cuesta |
|---|---|
| Fondos de inversión colectiva inmobiliarios | Rinden entre 7 % y 10 % E.A. según [Rankia](https://www.rankia.co/blog/fondos-inversion-colectiva-colombia/4682854-fondos-inmobiliarios-que-son-como-funcionan); la persona confía en el administrador y no ve los activos uno a uno |
| Plataformas de crowdfunding inmobiliario | Hay montos desde $200.000 ([La República](https://www.larepublica.co/finanzas/estas-son-las-empresas-que-hoy-permiten-el-acceso-los-colombianos-al-crowfunding-3427441)); una está autorizada por la Superfinanciera desde 2025 ([LatamFintech](https://www.latamfintech.co/articles/terrenta-plataforma-de-crowdfunding-inmobiliario-recibe-autorizacion-para-iniciar-operaciones)); el dinero lo custodia la plataforma |
| Ahorrar hasta poder comprar | Tiempo: el precio por m² en Bogotá promedia $7,42 millones ([Ciencuadras](https://www.ciencuadras.com/blog/evolucion-del-mercado-de-vivienda/novedades-mercado-inmobiliario-bogota-2026/amp)) |

> **No se preguntó** en las cinco entrevistas (eran de validación de la propuesta). Es lo primero que hay que medir en la siguiente ronda: cómo invierte o ahorra hoy cada persona, cuánto le cuesta y qué ha probado.

## Evidencia

- **Entrevistas hechas:** 5 de 5 (29 de octubre de 2026), todas de validación de la propuesta de valor y hechas por Juan Diego Ortiz Guerrero
- **Patrón que se repitió:** cuatro de cinco (Ami, Laura, Rafael y Carlos, el entrevistado) ven valor en **entrar con poco dinero**. Dos lo asocian a un segmento concreto: quien empieza su vida financiera y las personas de estratos bajos que quieren invertir en vivienda.
- **Lo que contradijo nuestra hipótesis:** nadie habló primero de la **desconfianza** hacia el intermediario, que era el centro de la hipótesis; hablaron del **monto** y del acceso. Aparecieron además dos ideas que no teníamos en el centro: invertir **en grupo** (Carlos, entrevistado) y llevar la idea a **otros países** (Camilo).

## ¿Necesita blockchain?

**Sí, pero solo para una parte del problema.** El dolor central es de **confianza**: la persona no ve qué pasa con su dinero. Eso lo resuelve Stellar de tres formas que una base de datos del equipo no podría:

1. **La regla la cumple el código, no una persona.** El dinero queda en un contrato. Si vence el plazo sin llegar a la meta, cada inversionista recupera lo suyo **sin pedirle permiso a nadie**. Límite de hoy: la fiduciaria puede cerrar la ronda antes del plazo con lo recaudado; el siguiente paso es un mínimo pactado a la vista del inversionista.
2. **Todos lo pueden verificar.** Cuánto se recaudó y quién tiene fracciones se ve en stellar.expert, sin pedirle el dato a un intermediario.
3. **Las fracciones son un activo propio de cada persona.** Están en su wallet y se pueden transferir con un pago normal.

**Lo que blockchain no resuelve:** la parte legal (qué derecho representa una fracción, la fiducia, la regulación). Una fiducia tradicional también puede custodiar dinero; lo que Stellar agrega es la transparencia y el reembolso automático.

## Hipótesis ajustada

**Hipótesis inicial:** una persona con montos pequeños no invierte en proyectos inmobiliarios porque tiene que confiar su dinero a un tercero que lo administra sin que ella vea qué pasa.

**Hipótesis ajustada:** una persona que está empezando su vida financiera, o que tiene pocos recursos, no invierte en proyectos inmobiliarios porque **no le alcanza para entrar**; además, si entra por un intermediario, tiene que confiar su dinero a alguien que no ve.

- **Qué cambió:** el dolor que la gente nombra primero es «no me alcanza», no «no confío en quien administra». En el pitch, el gancho es el monto.
- **Qué se mantiene:** la confianza sigue siendo la razón para usar Stellar (dinero bloqueado a la vista y reembolso automático).
- **Qué no sabemos todavía:** qué hace hoy cada persona, cuánto le cuesta y si pagaría. Las cinco entrevistas fueron reacciones a la idea, no relatos de su comportamiento.
