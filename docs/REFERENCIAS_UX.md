# Referencias de experiencia de uso

Este documento recoge patrones útiles sin copiar identidad visual, recursos de
marca, código ni una interfaz completa de terceros. Las imágenes de referencia
elegidas por Alex siguen siendo la meta visual principal de Aurum Fit.

## Brenzo

Fuentes oficiales:

- https://brenzo.app/ y https://brenzo.app/ayuda
- https://apps.apple.com/ca/app/brenzo-workout-planner/id6770596076
- https://play.google.com/store/apps/details?id=app.brenzo

Alex confirmó el 5 de septiembre de 2026 que **el mapa muscular y la pantalla de
entrenamiento de Aurum Fit nacen de lo que vio en Brenzo**, y que el listón de
calidad de esa app es el mínimo aceptable. La instrucción, repetida, es que
Aurum Fit no sea una copia: para eso ya está Brenzo.

> Nota sobre esta revisión: el entorno de trabajo tiene la salida de red
> restringida y no permite abrir `brenzo.app` ni las fichas de las tiendas. Lo
> que sigue procede de las descripciones oficiales de las tiendas recuperadas
> mediante búsqueda, no de uso directo de la app. Hay que tratarlo como una
> lectura de segunda mano y corregirlo cuando se pueda ver de primera mano.

Patrones observados que encajan con Aurum Fit:

- uso cómodo con una mano y controles grandes durante el entrenamiento;
- confirmar una serie con muy pocos pasos;
- mostrar o reutilizar como referencia los valores del entrenamiento anterior;
- colocar el temporizador de descanso dentro del flujo del ejercicio;
- separar creación de rutinas, entrenamiento activo, historial y progreso;
- funcionamiento local/offline para no depender de cobertura en el gimnasio.

## Lo que hace Brenzo, contrastado con lo que tenemos

| Función de Brenzo | Estado en Aurum Fit |
|---|---|
| Volumen y distribución del trabajo por grupo muscular | **Hecho** — mapa muscular del Diario (`docs/MAPA_MUSCULAR.md`) |
| Registrar series, repeticiones, peso, descanso y notas | **Hecho** |
| Recordar peso y repeticiones del entrenamiento anterior | **Parcial y a propósito** — se muestran como sugerencia visible, no se rellenan solos (ver límites abajo) |
| El temporizador de descanso arranca solo al guardar la serie | **Falta** — hoy hay que iniciarlo a mano |
| Aviso de récord personal al superarlo | **Falta** — no existe el concepto de récord en el modelo |
| Historial, progresión de fuerza y volumen semanal | **Hecho** |
| Rutinas por objetivo y splits (PPL, Torso/Pierna, Full Body) | **Parcial** — las rutinas son libres, sin plantillas por objetivo |
| Más de 400 ejercicios con animaciones | **Parcial** — 1.317 ejercicios, sin animaciones (aparcado por licencias) |
| `Body Rank`: te compara con personas de tu edad, sexo y peso | **Descartado, ver abajo** |
| Consejos personalizados de `Brenzo AI` | **Descartado, ver abajo** |
| Entrenamiento nuevo cada día y programas guiados (de pago) | Fuera del alcance actual |

### Lo que no vamos a copiar, y por qué

- **`Body Rank`.** Comparar tu condición con la de personas de tu edad, sexo y
  peso exige datos poblacionales de referencia que no tenemos, y cuentas y
  backend que no existen. Fabricar ese percentil sería exactamente la métrica
  inventada que el resto del producto evita. Si algún día se hace, será con una
  fuente citable, no con una fórmula nuestra.
- **Consejos automáticos de entrenamiento.** Rozan el consejo de salud. Sin
  revisión profesional y sin límites claros, no.
- **Identidad visual, iconos, ilustraciones y composición.** Ya estaba dicho y
  sigue vigente.

### Lo que sí merece la pena tomar

1. **Que el temporizador de descanso arranque al guardar la serie.** Es el gesto
   que más fricción quita durante el entrenamiento y no registra nada por su
   cuenta, así que no choca con nuestros límites. Falta decidir si arranca
   siempre o solo en las series efectivas.
2. **El récord personal como hecho, no como insignia.** Encaja con los logros ya
   decididos (`docs/MAPA_MUSCULAR.md`): superar tu mejor peso en un ejercicio es
   un dato recalculable desde el historial, no una recompensa inventada.
3. **Plantillas de split** (PPL, Torso/Pierna, Full Body) como punto de partida
   al crear una rutina, sin impedir la rutina libre.

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
- El autocompletado de valores anteriores debe seguir siendo una ayuda explícita;
  nunca puede registrar como realizado algo que el usuario no haya confirmado.
  Hoy los valores anteriores aparecen como sugerencia en el campo, no rellenos.
  Brenzo sí los rellena. Queda abierto si rellenarlos de verdad (guardar la serie
  sigue siendo un acto explícito) o mantener la sugerencia; decidirlo mirando el
  vídeo de referencia y probándolo entre series, no en abstracto.

## Iconografía

La interfaz usa una selección local de Lucide Icons bajo licencia ISC. Esto da
coherencia visual y evita depender de descargas externas durante el entrenamiento.
La atribución se conserva en `THIRD_PARTY_NOTICES.md`.
