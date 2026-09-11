# Mapa muscular

Fecha del primer incremento: 5 de septiembre de 2026.
Última revisión: 5 de septiembre de 2026.

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
- la **implicación secundaria** se marca con un rayado, no con un quinto color, y
  se lee como lo que es: otra cosa, no más de lo mismo. Sobre trazos anatómicos
  finos una línea discontinua se leía como ruido, así que la textura va en el
  relleno;
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

## La figura

Geometría anatómica real, cuatro vistas (hombre y mujer × frontal y posterior),
derivada de **MuscleMap** de Melih Colpan bajo **licencia MIT**. Llegó al
proyecto a través de openGym, que convirtió el Swift original a datos de
trazado. La atribución completa está en `THIRD_PARTY_NOTICES.md` y **es
obligatoria**: la prueba `la figura anatómica cubre las dos vistas y conserva su
atribución` falla si desaparece.

> El código propio de openGym es AGPL v3 y **no** se ha usado. Solo se tomó la
> geometría, que es la parte cubierta por la MIT de MuscleMap. Esa distinción
> importa: incorporar código AGPL obligaría a publicar Aurum Fit entero bajo
> AGPL, incluida la versión servida por web.

### Por qué se abandonó el dibujo propio

Hubo tres intentos de dibujar la figura a mano, y los tres se quedaron lejos:
cápsulas sobre un esqueleto, polígonos con proporciones rectas y polígonos con
cintura en V. Cada uno mejoraba al anterior y ninguno parecía un cuerpo.

La conclusión, por si vuelve a plantearse: **escribir coordenadas no es
dibujar**. Una lámina anatómica creíble necesita criterio de proporción y de
trazo que no sale de teclear pares de números, y el mapa entero dependía de esa
única pieza. Cambiarla por un activo con licencia verificable resolvió en una
sesión lo que tres iteraciones no habían conseguido.

### Qué se cambió respecto a la fuente

- Los nombres de las partes pasaron a nuestras 21 regiones: `deltoids` es
  `shoulders`, `gluteal` es `glutes`, `hamstring` es `hamstrings`.
- `upper-back` venía como **una sola parte** y para nosotros son **dos
  regiones**, con 81 y 88 ejercicios principales. Se separó por área medida con
  `getBBox`: los dos trazos grandes son las alas del dorsal, los pequeños los
  casquetes de la espalda superior. No se decidió a ojo.
- Cabeza, pelo, manos, pies, rodillas y tobillos son silueta inerte: nunca se
  colorean porque no son músculos que se entrenen.
- `abductors` no tiene forma propia. Comparte el trazo del glúteo, porque el
  glúteo medio **es** el abductor de la cadera. Cuando dos regiones comparten
  forma, se pinta con la de más trabajo directo y el título nombra a las dos.

### Figura de hombre o de mujer

Ajuste en `Ajustes > Preferencias de sesión`. Las cuatro vistas viajan en el
shell, así que cambiar de figura no descarga nada ni necesita conexión.

`body-paths.js` pesa 92 KB y es un recurso **obligatorio** del shell, no
opcional: sin él no hay mapa, y el mapa tiene que funcionar sin conexión.

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
- `prefers-reduced-motion` neutraliza toda animación de la app mediante un
  comodín en `styles.css`; el mapa no necesita regla propia (ver `MOTION.md`).

> **Aviso para quien lea el CSS del mapa:** `.muscle-region` declara
> `transition: fill .18s`, pero **esa transición no llega a ejecutarse nunca**.
> `renderMuscleMap()` rehace las figuras enteras con `replaceChildren()` en cada
> render, así que cada región nace ya con su clase de intensidad final y no hay
> valor anterior desde el que transicionar. Las regiones cambian de color de
> golpe. Si algún día se quiere que el color entre progresivamente, hay que
> reutilizar los nodos entre renders, no retocar la transición.

## Sobre la referencia

El mapa nace de lo que Alex vio en Brenzo. La lectura de sus fuentes oficiales
(`docs/REFERENCIA_BRENZO.md`) confirma que allí conviven dos cosas distintas:

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

## Lo que se intentó romper y aguantó

Auditoría adversaria, no confirmatoria: el objetivo era que el mapa mintiera.

- **No cuentan**: calentamiento, aproximación, serie anulada, serie planificada
  sin confirmar, ni el borrador de entrenamiento libre.
- **Una alternativa colorea SU músculo**, no el del ejercicio al que sustituye.
- **Los huecos se declaran**: un ejercicio sin músculos asignados suma al total y
  aparece en `unmappedExercises`; uno con implicación pero sin músculo principal
  va a `indirectOnlyExercises`. Ninguna serie desaparece del recuento.
- **Los límites del periodo son inclusivos** en los dos extremos.
- **El dibujo, el título de cada zona y la tabla dicen lo mismo**, zona por zona,
  y el color cae siempre en el tramo de la leyenda (0 / 1-4 / 5-9 / 10+).
- **Una zona con implicación pero sin trabajo directo se marca con trama**, nunca
  con la escala de color: pintarla diría que la has entrenado.

**Un agujero encontrado y cerrado:** `computeMuscleVolume(state, { sessionId })`
no comprobaba el estado de la sesión —el filtro vivía solo en la rama del
periodo—, así que preguntar por el id de un borrador colaba sus series en el
mapa. Ningún sitio de la app lo pedía, pero la garantía no puede depender de que
todos los que llamen se acuerden.

**Excepción conocida y aceptada:** los abductores comparten trazo con el glúteo,
porque el glúteo medio *es* el abductor de cadera. Al compartir forma manda la
región con más volumen directo, así que el dibujo puede mostrar los abductores
coloreados con 0 series propias. El título del grupo declara los números de cada
región por separado, y el resumen en texto nombra la que manda. Hay pruebas que
se ponen rojas si alguna de esas dos cosas desaparece.

## La escala de color

Brasa: teja → ámbar → lima. El paso 0 se queda neutro a propósito: "sin
trabajo" no es una cantidad pequeña, es ausencia, y darle tono la convertiría
en un tramo más.

| | 0 | 1-4 | 5-9 | 10+ |
|---|---|---|---|---|
| oscuro | `#232c25` | `#8a5220` | `#d98324` | `#e8e84a` |
| claro | `#e2e7dd` | `#c9a227` | `#b05c17` | `#4f2d0d` |

**No hay rojo en ninguno de los dos temas, y es deliberado.** La versión
original de esta escala arrancaba en rojo ladrillo (`#8c3b2f`) y terminaba en
granate (`#6b2016`) en claro. Las dos cosas se cambiaron:

- **El paso bajo en oscuro es cobre**, no ladrillo. Con ladrillo, las piernas
  poco entrenadas salían rojas: lo que MENOS trabajo tiene se pintaba del color
  de alarma, que es la lectura al revés.
- **El paso alto en claro es marrón quemado**, no granate. Sobre blanco el paso
  alto es el más oscuro, y un granate ahí pintaba de color sangre justo el
  músculo más entrenado.

Un músculo rojo sobre una figura humana se lee como dolor o lesión, y la app no
diagnostica. Además el cobre es lo que más margen da de todo lo probado: protan
ΔE 18,4, frente a 12,4 del ladrillo y 15,2 de los verdes anteriores.

**Lo que no sirve es verde → amarillo → naranja → rojo**, que es lo primero que
pide el cuerpo. Medido: su luminosidad hace `0.282 → 0.673 → 0.886 → 0.608`,
sube y luego baja, así que "10+" y "1-4" se confunden en escala de grises y con
daltonismo. `check-muscle-palette.mjs` la rechaza.

La escala sube en luminosidad de forma monótona en los dos temas y separa todos
los pares por encima del umbral: el peor caso es protan ΔE 18,4 sobre un mínimo
de 8, y visión normal 18,4 sobre un mínimo de 15.

### Por qué la dirección se invierte entre temas

La intuición razonable es **más oscuro = más trabajo**, y el tema claro la
respeta. El oscuro la invierte por fuerza, no por gusto:

| | sin trabajo | tarjeta | margen que queda |
|---|---|---|---|
| oscuro | 0.282 | 0.217 | **0.065 hacia abajo** |
| claro | 0.921 | 1.000 | 0.079 hacia arriba |

En tema oscuro el "sin trabajo" ya está pegado al suelo: por debajo quedan 0.065
de luminosidad antes de confundirse con la propia tarjeta. Tres tramos no caben
ahí, y el "10+" acabaría siendo lo menos visible del mapa justo donde más
trabajo hay. La escala tiene que alejarse del "sin trabajo" hacia donde haya
recorrido, y en oscuro eso es hacia arriba.

Por eso la leyenda es **una barra continua con "menos" y "más" en los extremos**
en vez de cuatro muestras sueltas: la dirección se ve, no hay que deducirla de
los números ni acertar con la intuición.

## El detalle por zona

Cada zona se despliega para ver **los ejercicios que la trabajaron**, en dos
grupos: trabajo directo y con implicación. El número dice cuánto; el ejercicio
dice de dónde viene, que es lo que permite decidir qué cambiar. Los datos ya los
devolvía `computeMuscleVolume` en `byRegion[id].exercises`, ordenados por
series: la tabla no recalcula nada.

**Van plegados, una zona cada vez.** Abiertos todos a la vez eran cuarenta
líneas seguidas, con los mismos nombres repetidos en cada zona que tocan, y la
tabla dejaba de poderse recorrer de un vistazo. Y los dos tipos van separados
con su título: mezclados, un ejercicio directo y uno de implicación con el mismo
número parecían aportar lo mismo a la zona.

La figura (hombre o mujer) se cambia **desde el propio mapa**, no solo en
Ajustes. Es la misma preferencia `mapFigure`, escrita desde otro sitio: no hay
un ajuste nuevo que pueda contradecir al viejo. No se deduce de ningún campo de
sexo en el perfil, porque no existe: la app no pide ese dato para nada más y no
va a pedirlo solo para elegir un dibujo.
