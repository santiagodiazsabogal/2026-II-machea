# Preguntas probables del jurado · Equipo Machea

> Para que **cualquiera de los tres** pueda responder. Salen de la revisión técnica del 12 de noviembre de 2026. La regla: decir lo que el contrato hace hoy, y después lo que sigue.

| Pregunta | Respuesta corta |
|---|---|
| ¿Esto es legal en Colombia? | Es un prototipo en testnet. Una fracción con expectativa de retorno se parece a un valor, y la financiación colaborativa está regulada desde el Decreto 1357 de 2018: solo la hacen entidades autorizadas por la Superintendencia Financiera. Nuestra ruta es aliarnos con una fiduciaria o una plataforma autorizada. |
| ¿Qué impide que la fiduciaria se lleve el dinero? | El dinero nunca va a la fiduciaria: del contrato solo sale a la constructora o de vuelta a los inversionistas. Límite de hoy: la fiduciaria puede cerrar la ronda antes del plazo con cualquier monto. Siguiente paso: un mínimo de cierre pactado, que el inversionista ve antes de invertir, y multifirma en la cuenta de la fiduciaria. |
| ¿Quién puede crear fracciones? | Hoy, el contrato (cuando alguien paga) y la cuenta emisora, que conserva su llave. Siguiente paso: bloquear la emisora en cada ronda; desde ahí, ni nosotros podemos crear fracciones: solo el contrato, y solo cuando alguien paga. |
| ¿Por qué blockchain y no una fiducia con una página web? | Custodia con reglas públicas, fracciones que el inversionista tiene en su propia wallet y puede ceder con un pago normal, y reembolso sin pedirle permiso a nadie cuando vence el plazo. |
| ¿Qué pasa después de liberar? ¿Cómo sé que construyen? | Hoy no se controla. Hoja de ruta: liberación por hitos de obra, aprobados por la fiduciaria. |
| ¿Cómo entra y sale un inversionista en pesos? | En producción el pago sería en una moneda estable (stablecoin), no en XLM, y la entrada y salida a pesos sería con anchors o exchanges locales. |
| ¿Cómo se reparten las ganancias? | Hoy las paga la fiduciaria desde su wallet, en una transacción, según el porcentaje de fracciones. Tiene límites (200 tenedores, 100 pagos). Siguiente paso: reparto «pull» dentro del contrato, donde cada tenedor reclama su parte. |
| ¿Qué pasa si la fiduciaria pierde su llave con la ronda completa? | Hoy el dinero quedaría en el contrato. Siguiente paso: un plazo de liberación; si pasa sin liberar, la ronda vuelve a ser reembolsable. |

## Lo que cada uno debe poder explicar

- **Juan Diego y Carlos (qué hace el contrato):** invertir = pagas y recibes fracciones en tu wallet; liberar = el dinero sale a la constructora; reembolsar = devuelves fracciones y recuperas tu dinero si venció el plazo sin meta. El contrato es el administrador del activo: emite al invertir y destruye al reembolsar.
- **Santiago (modelo de negocio):** quién usa primero, cómo se sostendría (ver [`modelo.md`](modelo.md)) y qué falta validar con entrevistas.
