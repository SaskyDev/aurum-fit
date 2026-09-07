# Motion

Qué se mueve en Aurum Fit, por qué, y qué queda pendiente. Auditoría completa
del inventario de animación hecha sobre `2465de8`. Aplicados P1 y P2 (`dce5819`)
y P4.

Última revisión: 7 de septiembre de 2026.

## El principio

**El motion sigue a la frecuencia de uso.** Cuando se auditó esto, la app tenía
7 `@keyframes` y **5 eran la misma cosa**: la barra de navegación. Cambiar de
pestaña disparaba cinco animaciones coordinadas de 620-720 ms. Guardar una
serie —el gesto que se repite cuarenta veces por sesión— no disparaba ninguna.

Ese desequilibrio es el criterio para decidir dónde invertir: lo que más se
usa es lo que más merece cuidado, y la navegación no es el sitio donde lucirse.

## La restricción que condiciona todo lo demás

`commit()` llama a `render()`, que reconstruye los diez paneles enteros. Cada
lista se rehace con `replaceChildren()` (36 usos en `app.js`), que **destruye y
recrea los nodos**.

Consecuencias reales, medidas, no hipótesis:

- **`transition: fill .18s` en `.muscle-region` no anima nunca.** Es la línea
  4436 de `styles.css` y parece que colorea las regiones progresivamente.
  No lo hace: `renderMuscleMap()` rehace las figuras con
  `figures.replaceChildren(...)` y cada región nace ya con su clase de
  intensidad final, así que no hay valor anterior desde el que transicionar.
  **Ojo al leer el código del mapa muscular creyendo que esa línea hace algo.**
- **No es posible animar la entrada ni la salida de elementos de lista** sin
  trabajo previo: el nodo es nuevo en cada render, así que "acaba de aparecer"
  y "ya estaba" son indistinguibles para el DOM.
- Ya hay una cicatriz de esto: `diaryOpenGroups` es un `Set` a nivel de módulo
  que existe solo para que los desplegables del diario no se cierren solos en
  cada render.

Cualquier **transición** sobre listas exige antes una forma de identificar nodos
entre renders. Una **animación de keyframes, no**: se reproduce sola al crearse
el elemento, y la fila es nueva en cada render. Es la diferencia que hizo que P4
saliera sin tocar el render, al contrario de lo que decía el plan inicial. Si
algún día se quieren transiciones de entrada y salida, entonces sí hará falta
dar un `data-id` estable a las filas y reutilizar el nodo existente.

## Reglas vigentes

**El arrastre va sin transición; la vuelta, con ella.** Mientras el dedo
arrastra, el elemento va clavado a él: cualquier transición sobre `transform`
convierte cada `pointermove` en una interpolación y el elemento persigue a la
mano. Al soltar se quita la clase de arrastre y el muelle de vuelta sí se
anima. Lo implementan `.routine-swiping` y `.swipe-set-row.is-dragging`.

**La reducción de movimiento se aplica con un comodín, no con una lista.** El
bloque `prefers-reduced-motion` de `styles.css` usa `*, *::before, *::after`.
Es deliberado: cuando era una lista de selectores escritos a mano, cada
animación nueva nacía sin proteger salvo que alguien se acordara de añadirla.
El comodín invierte lo que hay que recordar, y excluir algo se nota al
escribirlo. Se usa `.01ms` y no `0` para que `animationend` y `transitionend`
sigan disparando.

**El CSS no alcanza al scroll pedido desde JS.** `scrollTo` y `scrollIntoView`
deciden el `behavior` en JavaScript y se saltan la media query. Por eso existe
`scrollBehavior()` en `app.js`: todo punto de scroll pasa por ahí.

**Una animación no puede afirmar lo que el dato no dice.** Vale un destello de
"guardado", porque el guardado ocurrió. No vale uno de "récord" mientras el
récord personal no exista en el modelo. Es la regla de no inventar métricas
aplicada al movimiento.

## Hecho

**P1 · La fila de serie se arrastraba con retardo.** `.set-row-content`
transicionaba `transform` 160 ms mientras `attachSetSwipe` escribía el
transform en cada `pointermove`. Medido en Chromium a 390 px: el desfase crecía
con la distancia hasta **44 px** a los 70 px de recorrido. Con el arreglo, 0 px
en los cuatro tramos medidos. El swipe de rutinas ya lo hacía bien; al de
series se le había quedado sin portar.

**P2 · La reducción de movimiento solo cubría cinco selectores.** Quedaban
fuera la animación de las subvistas de Ajustes, el swipe de series, las
tarjetas de cardio y las nueve llamadas de scroll suave desde JS.

**P4 · Guardar una serie no tenía ninguna respuesta visual.** Ahora la fila
recién guardada se tiñe brevemente (`set-saved`, 320 ms) y, si la serie superó
un récord, más y durante más rato (`set-record`, 900 ms). Salió sin tocar el
render: las animaciones no necesitan identidad de nodo.

Tres decisiones que lo sostienen:

- **Se consume una sola vez.** `freshSet` se vacía al pintar la fila. Sin eso,
  arrancar el descanso o corregir otra serie repetirían el destello y dejaría de
  significar "acabas de guardar esto". Las clases se retiran además en
  `animationend`, porque cambiar de pestaña no relanza `render()` y la fila se
  quedaría marcada.
- **Solo color.** Nada de desplazamiento ni escala: empujaría las filas de abajo
  justo cuando estás mirando el número que acabas de escribir.
- **Corregir una serie no destella.** Misma regla que el descanso automático:
  ahí no acabas de entrenar, estás arreglando un número.

Y una trampa que costó encontrar: el tinte va con `box-shadow` interior y no con
`background`, porque `--set-row-bg` es un `linear-gradient` y `color-mix()` con
una imagen es inválido. El navegador descarta la declaración entera y el fondo
se queda transparente, dejando ver las etiquetas del swipe por debajo. No lo
cazó ninguna prueba de código: se vio mirando la fila en el navegador. Ahora hay
una prueba que lo impide.

Con movimiento reducido el destello dura 0,01 ms pero el aviso del récord sigue
apareciendo: se quita el movimiento, no la información.

## Pendiente, por orden

**P5 · La pestaña cambia de golpe y la barra tarda 720 ms.** `.panel` alterna
`display: none`/`block`, así que el contenido aparece instantáneo mientras la
barra sigue medio segundo más. Decidido: **bajar la barra a ~300 ms** en vez de
subir el panel; 720 ms es largo para algo que se hace constantemente. Arrastra
una deuda: `navAnimationTimer` repite a mano los 720 ms del CSS en `app.js`,
dos fuentes de verdad que se desincronizan en cuanto se toque una. Cambiar a
`animationend` al pasar por ahí.

**P3 · El aviso entra animado y desaparece de golpe.** `.notice` tiene
`toast-in`, pero `showNotice` lo oculta a los 4200 ms con `hidden = true`. Una
entrada cuidada seguida de un corte seco se lee como un fallo. Hace falta
`toast-out` con `animationend`, y cancelar la salida si llega un aviso nuevo
mientras el viejo se va.

**P6 · El descanso en marcha no tiene movimiento.** `.timer-display.timer-running`
solo cambia de color. Un aro de progreso SVG con `stroke-dashoffset`, alimentado
por el `setInterval` de 1 s que ya existe, es dato real y no choca con nada.

## Qué sobrevive a una app nativa

Si la migración a Swift/iOS se acerca, esto cambia el orden de trabajo.

**Se tira entero:** los `@keyframes`, todas las transiciones CSS, el aro SVG de
P6 y la mecánica `display: none`/`block` de P5.

**Sobrevive como decisión:** las duraciones y curvas elegidas, la regla del
arrastre directo con vuelta animada, respetar la reducción de movimiento
(`@Environment(\.accessibilityReduceMotion)` es el equivalente), y el criterio
de que el motion siga a la frecuencia de uso.

Con la migración nativa aún lejos (decidido en septiembre de 2026), el orden lo
manda el valor de uso y no la caducidad. Lo que queda —P5, P3, P6— es CSS que se
tirará, así que conviene hacerlo barato: P5 es media hora y se nota en cada uso;
P3 y P6 pueden esperar.
