# Motion

Qué se mueve en Aurum Fit, por qué, y qué queda pendiente. Auditoría completa
del inventario de animación hecha sobre `2465de8`; P1 y P2 aplicados en
`dce5819`.

Última revisión: 6 de septiembre de 2026.

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

Cualquier trabajo de motion sobre listas exige antes una forma de identificar
nodos entre renders. No hace falta reescribir el render: basta con dar un
`data-id` estable a las filas y reutilizar el nodo si ya existe.

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

**P4 · Guardar una serie no tiene ninguna respuesta visual.** Es el hueco más
grande y el más caro, porque depende de la restricción de arriba. Por trozos:
(a) dar `data-set-id` a la fila y reutilizar el nodo entre renders, sin
animación y con las pruebas en verde; (b) marcar la fila guardada con
`is-fresh` y un destello de ~220 ms sin desplazamiento; (c) opcional, un
`scale` breve en el número de serie, midiendo antes si aporta o distrae.

## Qué sobrevive a una app nativa

Si la migración a Swift/iOS se acerca, esto cambia el orden de trabajo.

**Se tira entero:** los 7 `@keyframes`, todas las transiciones CSS, el andamiaje
de `data-set-id` de P4, el aro SVG de P6 y la mecánica `display: none`/`block`
de P5.

**Sobrevive como decisión:** las duraciones y curvas elegidas, la regla del
arrastre directo con vuelta animada, respetar la reducción de movimiento
(`@Environment(\.accessibilityReduceMotion)` es el equivalente), y el criterio
de que el motion siga a la frecuencia de uso.

**Conclusión práctica: no invertir en P4 ni P6 si la migración está cerca.**
P1 y P2 valían igualmente porque arreglaban defectos que alguien sufría hoy.
