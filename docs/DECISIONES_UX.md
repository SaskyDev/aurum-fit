# Decisiones de experiencia de uso

Lo que hemos decidido nosotros y por qué. Lo que viene de mirar Brenzo está en
`REFERENCIA_BRENZO.md`; aquí solo queda lo que ya es nuestro.

Actualizado: 11 de septiembre de 2026.

## Decisiones aplicadas

- La navegación principal mantiene solo `Rutinas`, `Diario` y `Nutrición`.
- `Diario` es la entrada motivacional y resume el día real, no un porcentaje
  semanal ficticio.
- `Plan de hoy` abre exactamente el día programado de su rutina.
- La rutina se edita antes de empezar; los extras del entrenamiento no modifican
  el plan original.
- Cada ejercicio agrupa `Historial`, `Actual` y `Progreso`, manteniendo el
  registro de hoy como vista central.
- Una serie se puede duplicar, pero la copia recibe su propio identificador para
  poder editarla o borrarla de forma independiente.
- El catálogo no vuelca 1.317 resultados de golpe: exige búsqueda o filtros y
  amplía la lista solo cuando el usuario lo pide.
- El entrenamiento libre se prepara como borrador persistente: no inicia el
  tiempo ni crea hechos en el Diario hasta que se pulsa **Empezar**. Es puntual,
  no se convierte en rutina reutilizable.

## Límites y preguntas abiertas

- No se copian iconos, ilustraciones o composición propietaria de Brenzo.
- Antes de añadir gestos laterales entre Historial, Actual y Progreso hay que
  comprobar en móvil que no compitan con el desplazamiento o el gesto de volver.
- ~~Queda abierto si rellenar de verdad los valores anteriores o mantener la
  sugerencia.~~ **Respondido por las dos modalidades** (ver abajo): en modo
  registro siguen siendo sugerencia, en modo guiado la serie viene con sus
  números. Lo que no cambia en ninguno de los dos: **nunca se registra como
  realizado algo que el usuario no haya confirmado.**

## Decisiones aplicadas · rutinas guiadas

Construidas y verificadas en los diez commits `Paso 1` a `Paso 10` de la rama
`claude/gifted-thompson-45fcwz`. El recorrido está en `PRUEBAS_MANUALES.md` y la
evidencia automática y visual en `RUTINAS_GUIADAS_QA.md`.

### Dos modalidades de rutina

Origen: varios amigos que empiezan a entrenar dieron, **por separado**, el mismo
feedback. No saben qué números poner. Piden que la rutina los lleve ya y que
entrenar sea marcar ✓ serie a serie.

La app hoy solo atiende a un tipo de usuario: el que ya sabe lo que va a hacer y
solo quiere dejar constancia. Se añade el otro **sin sustituir al primero**:

- **Solo registro** (actual, por defecto): la rutina lista ejercicios; los
  números se escriben entrenando.
- **Guiada**: la rutina lleva series, repeticiones y peso; entrenar es marcar.

Se puede pasar de registro a guiada, pero no al revés, para no borrar números ya
puestos.

### El plan no cuenta como hecho

**Esta es la regla que sostiene todo lo demás:**

> Una serie planificada no cuenta como realizada en ningún sitio hasta que se
> marca. Ni en volumen, ni en el mapa muscular, ni en récords, ni en el diario.

Es la regla de no inventar métricas aplicada aquí. Un objetivo que aún no has
cumplido no es un hecho.

### Por qué esto revierte una decisión anterior

`tests/core.test.js` tiene una prueba llamada **"la rutina solo copia ejercicios
y la sesión empieza sin objetivos ficticios"**. Que el plan de la rutina no
viajara a la sesión fue deliberado, por ese mismo motivo: no meter objetivos que
no son hechos.

Sigue siendo correcto **en modo registro**, y ahí se mantiene. En modo guiado el
plan sí viaja, pero como lista de intención claramente separada de lo registrado,
nunca como serie hecha.

**Esa prueba no se borra: se acota al modo registro**, y otra nueva cubre el
guiado. Si algún día alguien la encuentra y le parece contradictoria, esto es lo
que hay que leer antes de tocarla.

### La app pregunta, el usuario decide

Cuando lo que haces se desvía del plan —hacia abajo o hacia arriba— la app
pregunta si ese número pasa a ser el nuevo por defecto. **No lo cambia sola.**

Esto evita **arrastrar un mal día**: que una mala noche baje tu plan de forma
permanente sin que nadie lo haya decidido, que es el fallo típico de las apps que
progresan solas. Y pregunta también al subir, porque un día en el que te vienes
arriba tampoco es tu nivel real.

### La serie planificada que no se hace

Se puede anular, y queda en el diario **tachada y en gris, nunca en rojo**.

Razón de Alex: *"es importante saber que fallaste, es el sitio de donde sacarás
la motivación para la siguiente sesión"*. El gris tachado se lee como *previsto
y no salió*; el rojo culpabiliza, y un día flojo no es un error.

### La primera vez: tomar referencia

Un principiante no sabe qué peso poner, y pedírselo en un formulario es pedirle
que adivine algo que solo se sabe entrenando. La rutina guiada se crea con series
y repeticiones, y el peso puede quedar vacío: la primera vez que toca ese
ejercicio se presenta como **"primera vez: vamos a tomar tu referencia"**.

No es un hueco en un formulario, es un paso del método. Y encaja con la regla de
declarar el hueco en vez de rellenarlo con una suposición: la app **no** propone
un peso inicial inventado.

## Iconografía

La interfaz usa una selección local de Lucide Icons bajo licencia ISC. Esto da
coherencia visual y evita depender de descargas externas durante el entrenamiento.
La atribución se conserva en `THIRD_PARTY_NOTICES.md`.

## Cierre del entrenamiento compacto

- Las acciones de ejercicio son siempre icono + texto. En escritorio llenan el
  ancho disponible; en móvil se distribuyen en dos filas equilibradas, nunca
  quedan abandonadas a la izquierda.
- `Solo registro` no se trata como una versión menor: usa una etiqueta azul
  informativa y conserva Guía, Nota, Cambiar y Hoy no con la misma jerarquía que
  una rutina Guiada.
- Un modo sin series registradas no muestra un mensaje vacío entre las
  cabeceras y la primera fila; la primera acción útil debe quedar inmediatamente
  debajo de `Set · Peso · Reps · RIR`.
- El catálogo de una sesión no vuelve a sugerir ejercicios ya añadidos, salvo
  en el flujo explícito de sustituir un ejercicio solo hoy.

## Revisión posterior al rediseño compacto

Cuatro cosas que la revisión encontró y que quedan cerradas. Ninguna era
estructural: el modelo aguantó (una serie planificada no existe como objeto
hasta que se resuelve, así que no hay nada que filtrar para que no cuente).

- **La tinta sobre un relleno de color se decide por tema, nunca a mano.**
  `--ink-on-fill` vale `#071009` en oscuro y `#ffffff` en claro. El ✓ de la
  serie hecha la llevaba fija en `#071009`, elegida para el neón del tema
  oscuro, y en claro daba 2,78:1. `check-theme-contrast.mjs` ahora lee los
  rellenos del código y comprueba los dos temas.
- **El relleno de ese ✓ es `--success`, no `--accent`.** Atarlo al acento de la
  rutina hacía que una rutina roja pintara de rojo cada serie completada. Una
  serie hecha significa lo mismo en todas las rutinas.
- **Una serie anulada no cuenta como trabajo en ningún recuento.** Ni en el
  selector de ejercicios de Progreso, donde entraba porque el `?? "effective"`
  la daba por efectiva al no llevar `setType`, ni en el "N series" del historial
  del ejercicio.
- **El catálogo conserva su reserva donde se muestra el dato.** El origen del
  ejercicio dice "Catálogo auditado · revisión pendiente", y la hoja de `Guía`
  lleva el mismo descargo que el catálogo: *"pendiente de revisión profesional.
  No es consejo médico"*. Bajo un botón llamado Guía ese texto gana una
  autoridad que no tiene.

**Decidido y no cambiado:** confirmar una serie guiada sigue pidiendo dos
toques, el ✓ y el tipo de serie. Alex: *"no quita más de un segundo y así la app
no decide por defecto qué tipo de serie has hecho"*. Encaja con no inventar
datos. No se reabre.

**Sin probar en hardware:** los recorridos de navegador despachan `PointerEvent`
sintéticos, sin inercia real ni conflicto de `touch-action`. Siguen pendientes
de un iPhone el check contra el gesto de arrastre y la rueda numérica a media
inercia.

## Las dos pantallas que deciden por el usuario

Dos sitios donde la app hace una pregunta. En los dos, la regla es la misma: si
la pregunta no dice los números concretos, no es una pregunta, es un trámite.

### Elegir el modo al crear la rutina

La pregunta es **"¿quién pone los números?"**, no "cómo quieres entrenar". Cada
modalidad explica en su propia tarjeta qué pasa al entrenar, no comparten una
línea de texto debajo: es la decisión que más cuesta a quien empieza y tiene que
poder compararse de un vistazo.

Y se dice que la conversión va en un solo sentido, con la recomendación de
empezar por el modo simple. Saber que no cierras ninguna puerta es lo que
permite elegir sin miedo.

### La hoja de desviación del plan

Se abre al plegar el ejercicio y al finalizar la sesión, nunca al guardar una
serie: hasta que no has terminado el ejercicio no se sabe si te has desviado.

- **Enseña la comparación**: `Plan: 50 kg → Hoy: 42,5 kg`. Decía "tus N series se
  alejan del plan actual", sin decir de qué a qué, y no se entendía para qué
  aparecía.
- **Solo lo que se ha movido.** Si el peso cambió y las repeticiones no, no
  pregunta por las repeticiones. Enseñar tres campos convierte una decisión de
  un segundo en un formulario.
- **Los botones nombran el resultado**: *Dejar el plan en 50 kg* / *Cambiar el
  plan a 42,5 kg*. No "mantener" ni "actualizar", que no dicen qué queda.
- **No se cierra tocando fuera.** Antes sí, y valía como "no". La firma de la
  desviación se marca como preguntada *antes* de abrir la hoja, así que un toque
  despistado contestaba por el usuario y la pregunta no volvía a salir nunca
  para esos mismos números. Es una decisión, no un desplegable.
- **El foco va al botón, no a un campo**: enfocar un número abre el teclado del
  móvil justo encima de la propia pregunta.

Comprobado en navegador que la respuesta se aplica de verdad: rechazar deja el
plan en 50 kg, aceptar lo pasa a 42,5, y en los dos casos la serie registrada
sigue siendo 42,5 × 10 y la sesión de hoy conserva su plan original. Editar el
plan no reescribe lo que hoy dijo.
