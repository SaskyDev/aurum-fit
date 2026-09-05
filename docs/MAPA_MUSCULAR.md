# Mapa muscular

Fecha del primer incremento: 5 de septiembre de 2026.

## Qué es y qué no es

Es un **recuento de series efectivas por zona del cuerpo**, dibujado sobre una
figura estilizada. Sirve para responder a una pregunta concreta: *¿qué me estoy
dejando esta semana?*

No es una lámina anatómica, no mide activación muscular, no estima daño ni
recuperación y no sustituye una valoración profesional. La figura es
deliberadamente esquemática para que no se lea como un diagrama médico. El aviso
aparece siempre bajo el mapa, no escondido en ajustes.

## Vocabulario propio

El dataset trae tres campos de músculo con vocabularios incompatibles:

| Campo | Valores distintos | Estado |
|---|---|---|
| `target` | 19 | limpio, ya traducido en `targetEs` |
| `secondaryMuscles` | 40 | inglés, con cola de ruido (`grip muscles`, `feet`, `shins`) |
| `muscleGroup` | 29 | duplicados incoherentes (`traps`/`trapezius`, `quads`/`quadriceps`) |

Los 50 valores distintos se reducen a **21 regiones canónicas** en
`MUSCLE_REGIONS` (core.js), con una tabla de sinónimos que los cubre todos. El
vocabulario es propio a propósito: es el que se guarda en el historial y tiene
que sobrevivir a futuras versiones del catálogo.

`cardiovascular system` se reconoce y se descarta de forma explícita: **el cardio
no pinta músculos**.

La prueba `el vocabulario muscular cubre el dataset entero sin valores sueltos`
falla si el catálogo introduce un músculo que el mapa no sabe traducir, y también
si alguna región deja de tener ejercicios que la alcancen.

## Regla central: directo y secundario no se suman

En el dataset, `shoulders` aparece como músculo secundario en **444 de 1.317**
ejercicios, e `hamstrings` en 287. Si la implicación secundaria se sumara al
trabajo directo, el mapa estaría encendido casi siempre y dejaría de informar.

Y cualquier coeficiente de activación que inventásemos (0,3 · secundaria, 0,5 ·
secundaria...) no tendría respaldo: convertiría el mapa en una medida fisiológica
que no es. Es el mismo criterio que ya rige el Diario, que no muestra porcentajes
de progreso inventados.

Por eso:

- el **color** solo codifica series directas;
- la **implicación secundaria** se marca con trama, no con un quinto color, y se
  lee como lo que es: otra cosa, no más de lo mismo;
- la tabla por zona muestra las dos columnas separadas y nunca un total mezclado.

Solo cuentan las **series efectivas**: calentamiento y aproximación preparan, no
son volumen. Es la misma regla que ya usa la gráfica de progreso.

## Tramos, no gradiente

`MUSCLE_INTENSITY_STEPS` define cuatro tramos: 0, 1-4, 5-9 y 10 o más series
directas. Se eligieron tramos y no un gradiente continuo porque el objetivo es
leer "esto lo tengo cubierto" o "esto lo estoy dejando", no comparar 7 series
contra 8 con una precisión que el dato no tiene.

## Dónde vive

Decidido con Alex el 5 de septiembre: **el Diario**, junto al resto del resumen
del día, con el periodo **semanal por defecto** y conmutador a Sesión y Mes.

El razonamiento: el mapa semanal es el que detecta desequilibrios accionables, y
el Diario es la pantalla de inicio, así que se ve a diario sin abrir nada.

Los periodos por fecha incluyen la **sesión en curso**: lo que ya has hecho hoy
es trabajo hecho, y el mapa se mueve mientras entrenas en lugar de esperar a que
finalices.

El siguiente candidato, ya evaluado y descartado *para este incremento*, es el
resumen al finalizar el entrenamiento: es el momento de máxima recompensa. El
componente se construyó para poder reutilizarse tal cual ahí, pasando un periodo
de sesión en lugar de semanal. Se hará cuando este primer sitio se haya usado lo
suficiente para saber si gusta.

Descartado por ahora: mostrarlo dentro de la sesión activa. Esa pantalla ya está
cargada (acordeón, temporizador, series) y en móvil el mapa competiría por el
espacio útil entre series.

## Dónde se guardan los músculos

En el **ejercicio**, no en el catálogo:

```js
exercise.muscles = { direct: ["chest"], secondary: ["triceps", "shoulders"] }
```

Se copian al añadir el ejercicio desde el catálogo. El motivo es que el mapa lee
el historial, y el historial tiene que poder leerse **sin conexión y sin
catálogo**. Si el mapa cruzara contra el catálogo al renderizar, offline se
quedaría en blanco y los ejercicios que desaparecieran de una futura versión del
dataset perderían su historial.

`backfillExerciseMuscles()` rellena una sola vez los ejercicios guardados antes
de que existiera el mapa, en cuanto el catálogo está disponible.

Los **ejercicios personales que no están en el catálogo se quedan sin músculos a
propósito**. El mapa lo declara en lugar de disimularlo: sus series aparecen como
"no repartidas" bajo el mapa, con el nombre de los ejercicios. Es preferible un
hueco visible a una asignación inventada. Dejar que el usuario asigne músculos a
sus ejercicios propios es la mejora natural, y está pendiente.

Hay un segundo hueco que también se declara: los ejercicios que tienen
implicación pero **ningún músculo principal**. El dataset marca así sus 29
ejercicios de cardio, y un burpee es el caso típico. Sus series no colorean
ninguna zona, así que el aviso las cuenta aparte en lugar de dejarlas
desaparecer entre el total de series efectivas y un mapa apagado.

## Geometría

Dos cuerpos facetados, frontal y posterior, con **cada músculo como polígono
propio**: pectoral en dos haces, recto abdominal en cuatro filas por lado,
cuádriceps en vasto lateral, recto femoral y vasto medial, isquiotibiales en dos
vientres, gemelos en dos cabezas, deltoides, dorsales en ala, trapecio en dos
porciones. Son setenta polígonos, y la mitad es el espejo de la otra.

La figura ha pasado por tres versiones, y las dos primeras se descartaron por el
mismo motivo: no parecían un cuerpo.

1. **Cápsulas sobre un esqueleto de articulaciones.** No distinguía el
   cuádriceps del aductor: el mapa perdía justo la información que lo hace útil.
2. **Polígonos con proporciones rectas.** Torso de lados paralelos, hombros que
   no sobresalían y músculos rectangulares. Leía como una armadura por placas.
3. **La actual.** Lo que cambió no fueron los músculos sino las proporciones:
   cintura en V, deltoides coronando el hombro como punto más ancho del cuerpo,
   brazos colgando separados del tronco con su propio contorno, y vientres
   afilados de cinco o seis vértices en lugar de rectángulos.

La lección, por si hay una cuarta: en una figura anatómica el realismo está en la
silueta y en el afilado de cada vientre, no en el número de polígonos.

Sigue sin ser una lámina anatómica, y no pretende serlo. Alcanzar ese nivel
exigiría un dibujo encargado o con licencia comercial verificable, que es la
misma decisión pendiente que bloquea las imágenes de ejercicios.

El estilo facetado (polígonos de líneas rectas) es deliberado: **se declara como
diagrama y no finge ser una lámina anatómica**, que es exactamente lo que este
documento exige no prometer. Y es dibujo propio: no entra arte de terceros, ni
de Brenzo ni de ningún atlas con licencia dudosa.

```bash
node scripts/generate-muscle-map.mjs           # imprime el bloque para app.js
node scripts/generate-muscle-map.mjs --json     # vuelca la geometría
node scripts/generate-muscle-map.mjs --check    # falla si app.js se desvió
```

El script define solo el lado izquierdo de cada músculo par y espeja el otro, así
que un retoque no puede dejar los dos lados distintos. Editar las coordenadas a
mano en `app.js` rompe esa garantía, y `--check` lo detecta.

## Color

Escala **secuencial de un solo tono** (el verde de la marca), no un arcoíris: la
intensidad es magnitud, y la luminosidad crece de forma monótona para que se lea
igual con daltonismo.

| Tramo | Oscuro | Claro |
|---|---|---|
| 0 series | `#232c25` | `#e2e7dd` |
| 1-4 | `#3d5a2a` | `#9cc93f` |
| 5-9 | `#79ab3f` | `#5f8a1a` |
| 10+ | `#c7f464` | `#365008` |

El modo claro no es un volteo automático del oscuro: son sus propios pasos.

La garantía es comprobable, no una afirmación:

```bash
node scripts/check-muscle-palette.mjs
```

Verifica que la luminosidad sea monótona y que dos tramos contiguos se separen
por encima del umbral en visión normal, protanopía, deuteranopía y tritanopía
(ΔE en OKLab ×100, simulación de Machado, Oliveira y Fernandes). La prueba
`la escala del mapa muscular es legible y coincide con la hoja de estilos` lo
ejecuta y además compara los valores con `styles.css`, para que nadie retoque un
color allí sin volver a validarlo.

Dos tramos quedan por debajo de 3:1 de contraste contra la superficie. Eso
**obliga** a un desahogo, y por eso la leyenda y la tabla por zona no son
opcionales: son la lectura alternativa del mismo dato. La prueba
`el mapa muscular vive en el Diario con periodo propio y alternativa en texto`
falla si alguien las quita.

## Accesibilidad

- Cada figura es un `role="img"` con `aria-label` que enumera el trabajo directo.
- Cada región lleva `<title>` con sus series directas y con implicación.
- La tabla por zona es la alternativa textual completa.
- La trama de implicación secundaria es codificación no cromática.
- `prefers-reduced-motion` desactiva la transición de color.
- La miniatura compacta no dibuja la trama: a ese tamaño es ruido.

## Sobre la referencia

El mapa nace de lo que Alex vio en Brenzo. La lectura de sus fuentes oficiales
(`docs/REFERENCIAS_UX.md`) confirma que allí conviven dos cosas distintas:

- **volumen y distribución del trabajo por grupo muscular**, que es lo que hemos
  construido;
- **`Body Rank`**, que compara tu condición con la de personas de tu edad, sexo y
  peso para señalar grupos desatendidos.

Lo segundo queda descartado a propósito: exige datos poblacionales de referencia
que no tenemos. Inventar ese percentil sería la métrica fabricada que el resto
del producto evita. Nuestro mapa responde a "qué me estoy dejando", no a "cómo
estoy respecto a los demás".

## Pendiente

- **Logros.** Decidido con Alex: solo hechos verificables recalculables desde el
  historial exportado (récord de peso por ejercicio, racha de días y semanas
  entrenando, primera semana cubriendo las zonas principales). Descartado el
  sistema de niveles por músculo: premiaría el volumen bruto, que es el incentivo
  equivocado. No construido todavía.
- **Resumen al finalizar el entrenamiento** con el mapa de la sesión.
- **Asignar músculos a los ejercicios personales.**
- **Revisión profesional** del mapeo músculo-ejercicio: hoy proviene del dataset
  y hereda su marca `pending_professional_review`.
- **El vídeo de referencia** que Alex grabó no está en el repositorio ni ha
  llegado al entorno de trabajo, así que la parte de "zona de entrenamiento" de
  su encargo sigue sin especificar. El nivel de calidad al que se refiere no se
  ha podido contrastar contra la referencia real.
