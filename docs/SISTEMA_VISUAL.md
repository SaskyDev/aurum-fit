# Sistema visual

Fecha: 24 de julio de 2026.
Última revisión: 5 de septiembre de 2026.

## Auditoría de la interfaz anterior

La interfaz original era legible y pequeña, pero todos los paneles tenían un
peso visual parecido. Durante un entrenamiento no destacaban suficientemente
la sesión activa, el siguiente paso ni el guardado. Los formularios de cuatro
columnas funcionaban en escritorio, pero la experiencia seguía pareciendo un
panel genérico y no un producto pensado para usar entre series.

## Dirección aplicada

El sistema busca una sensación fitness moderna y enérgica sin depender del
nombre provisional:

- base negro verdosa para una experiencia compacta de aplicación;
- superficies grafito y bordes discretos;
- negro verdoso para el núcleo de entrenamiento;
- verde lima solo como acento de acción/estado;
- tipografía del sistema, con títulos compactos y fuertes;
- radios y espaciado coherentes mediante variables CSS;
- botones táctiles de 44 px como mínimo;
- navegación inferior fija en móvil;
- sesión activa, guardado y errores con estados explícitos.

No se usan imágenes, gradientes decorativos ni una marca difícil de renombrar.

## Tokens principales

- Color: `--canvas`, `--surface`, `--night`, `--accent`, `--danger`.
- Espaciado: escala de 4, 8, 12, 16, 24, 32 y 48 px.
- Radios: 10, 16 y 24 px.
- Controles: altura mínima de 44 px; acción primaria móvil de 54 px.
- Foco: contorno naranja de 3 px, independiente del color de éxito.

## Componentes reutilizables

- `.surface`: contenedor común.
- `.button-*`: jerarquía primaria, acento, secundaria, silenciosa y destructiva.
- `.notice`: éxito/error accesible mediante `aria-live`.
- `.status-badge` y `.count-badge`: estados breves.
- `.empty-state`: siguiente paso cuando falta contenido.
- `.session-exercise`, `.set-row` y `.set-form`: registro durante la sesión.
- `.routine-card`, `.routine-day` y `.routine-exercise-row`: plan editable y
  ordenado.
- `.period-tabs` y `.exercise-chart`: periodos y evolución descriptiva por ejercicio.
- `.nutrition-overview`: resumen básico de calorías y macronutrientes.
- `.daily-summary`, `.weekly-ring` y `.today-plan`: jerarquía compacta del Diario.
- `.active-session-resume` y `.free-workout-option`: rutinas como entrada
  principal, continuación de sesión explícita y entrenamiento libre secundario.
- `.exercise-rest-timer`: temporizador reducido dentro del único ejercicio abierto.
- `.catalog-controls`: búsqueda progresiva y filtros de categoría, equipo y
  músculo para consultar 1.317 ejercicios sin mostrar el catálogo completo.
- `.catalog-review-pending`: aviso breve `Sin revisión profesional todavía` en
  las tarjetas del catálogo cuyo `reviewStatus` sigue pendiente.
- `.dialog-overlay`, `.dialog-box`, `.dialog-title`, `.dialog-message` y
  `.dialog-actions`: confirmación propia y accesible que sustituye a
  `window.confirm`. El fondo de la aplicación se bloquea con `.overlay-open`.
- `.muscle-map`, `.muscle-figure`, `.muscle-region` y `.muscle-map-legend`: mapa
  muscular del Diario. Escala secuencial de un solo tono en cuatro tramos, con
  paletas propias validadas para claro y oscuro, y trama en vez de color para la
  implicación secundaria. Detalle completo en `docs/MAPA_MUSCULAR.md`.

## Confirmaciones destructivas

Las nueve confirmaciones de la aplicación usan `confirmDialog`, no el diálogo
del navegador: borrar comida, quitar un ejercicio de un día de rutina, eliminar
una rutina del plan, borrar una serie, descartar la sesión en curso, finalizar
el entrenamiento, cargar la demo, quitar la demo e importar una copia. El
componente:

- se anuncia como `role="alertdialog"` con `aria-modal="true"` y describe título
  y mensaje mediante `aria-labelledby` y `aria-describedby`;
- atrapa el foco entre `Cancelar` y la acción principal, en ambos sentidos del
  tabulador;
- se cierra con `Escape` o pulsando fuera de la caja, y ambos caminos equivalen
  a cancelar;
- devuelve el foco al elemento que abrió la confirmación;
- pinta la acción principal con `.button-danger` cuando la operación destruye
  datos, y con `.button-primary` cuando no.

El motivo es doble: `window.confirm` no es coherente con el sistema visual, y en
una PWA instalada bloquea el hilo y aparece con el estilo del navegador, lo que
rompe la sensación de aplicación.

## Color como magnitud

El mapa muscular es el primer componente que usa el color para codificar una
cantidad y no un estado. La regla que se aplicó, y que vale para lo que venga
después: magnitud significa **una sola tinta con la luminosidad creciendo de
forma monótona**, nunca un arcoíris, y cada modo tiene sus propios pasos en lugar
de voltear los del otro. Cuando los tramos oscuros no llegan a 3:1 contra la
superficie, la leyenda y la tabla dejan de ser opcionales.

## Tema claro

El tema claro **no es el oscuro con menos brillo**: tiene sus propios tonos, y
durante mucho tiempo fue una pila de parches por componente sobre los colores
del oscuro. La auditoría del 5 de septiembre de 2026 midió el contraste de cada
texto de la aplicación y encontró tres fallos de fondo:

1. **El acento neón como texto.** `#c7f464` sobre una tarjeta blanca da
   **1,24:1**: el encabezado del plan del día y su flecha eran prácticamente
   invisibles.
2. **Los seis colores de rutina no tenían variante clara.** Son neones pensados
   sobre negro y sobre blanco caían entre 1,2:1 y 2,2:1. Con ellos se pintan el
   nombre del plan del día, los puntos del calendario y los bordes de tarjeta.
3. **No había elevación.** El lienzo y las tarjetas se diferenciaban 1,10:1, y
   la sombra de las superficies era un brillo interior blanco heredado del modo
   oscuro. Todo se leía plano.

Las reglas que salieron de ahí, y que valen para lo que venga:

- **Un tono rellena y otro escribe.** `--accent` es el relleno (con texto blanco
  encima) y `--accent-ink` el texto. Sobre el lienzo claro, el tono del relleno
  se queda en 4,15:1 como texto. Nunca se usa `color: var(--accent)`.
- **Cada color con su equivalente claro.** Ningún neón del modo oscuro se sirve
  tal cual en claro: ni los de rutina, ni el naranja, ni el azul de pasos, ni el
  violeta de grasas.
- **La elevación se gana con lienzo más oscuro y sombra real**, no con degradados
  teñidos. Los paneles de color pasaron de lavados sucios a un filo de color
  sobre superficie blanca.
- **Nada se deja al estilo por defecto del navegador.** Las barras de progreso
  solo llevaban `accent-color`, que colorea el relleno pero no el canal, y
  Chromium lo pintaba con su gris oscuro.

Todo esto está comprobado, no confiado a la vista:

```bash
node scripts/check-theme-contrast.mjs
```

La prueba `la paleta del tema claro cumple el contraste y coincide con el código`
lo ejecuta y además verifica que los valores del comprobador sean los que están
de verdad en `styles.css` y `app.js`, para que no se separen.

## Verificación visual

Se comprobó en navegador:

- escritorio a 1280 px: jerarquía, dos columnas de catálogo e historial;
- móvil a 390 × 844 px: navegación fija, una columna, controles grandes;
- navegación inferior de tres destinos en el orden Entrenamiento, Diario y Nutrición;
- Diario como inicio, sin porcentaje de progreso inventado;
- ausencia de desbordamiento horizontal;
- alturas visibles de controles entre 44 y 54 px;
- sesión activa en acordeón, catálogo y formulario accesibles sin ampliar la pantalla;
- editor de rutina en una sola columna a 390 px, sin scroll horizontal;
- consola sin errores en la carga inicial.

La prueba descubrió que buscar `press banca` no encontraba `Press de banca con
barra`. Se cambió la búsqueda literal por coincidencia de todas las palabras.

## Límite del incremento

El rediseño completa el flujo base de rutina a sesión, incluye sustitución solo
para hoy, aproxima el Diario a la referencia y añade una base verificable de
etiquetas y recetas. La foto se conserva localmente, pero no se simula OCR ni se
calculan objetivos médicos.
