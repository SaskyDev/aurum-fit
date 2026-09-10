# Decisiones de experiencia de uso

Lo que hemos decidido nosotros y por qué. Lo que viene de mirar Brenzo está en
`REFERENCIA_BRENZO.md`; aquí solo queda lo que ya es nuestro.

Actualizado: 10 de septiembre de 2026.

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

## Límites y preguntas abiertas

- No se copian iconos, ilustraciones o composición propietaria de Brenzo.
- Antes de añadir gestos laterales entre Historial, Actual y Progreso hay que
  comprobar en móvil que no compitan con el desplazamiento o el gesto de volver.
- ~~Queda abierto si rellenar de verdad los valores anteriores o mantener la
  sugerencia.~~ **Respondido por las dos modalidades** (ver abajo): en modo
  registro siguen siendo sugerencia, en modo guiado la serie viene con sus
  números. Lo que no cambia en ninguno de los dos: **nunca se registra como
  realizado algo que el usuario no haya confirmado.**

## Decidido y pendiente de construir

> Lo de aquí abajo está acordado pero **todavía no existe en la app**. Se mueve a
> "Decisiones aplicadas" cuando esté construido y verificado.

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
