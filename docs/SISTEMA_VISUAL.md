# Sistema visual

Fecha: 24 de julio de 2026.

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
