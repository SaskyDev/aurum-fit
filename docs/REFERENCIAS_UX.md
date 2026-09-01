# Referencias de experiencia de uso

Este documento recoge patrones útiles sin copiar identidad visual, recursos de
marca, código ni una interfaz completa de terceros. Las imágenes de referencia
elegidas por Alex siguen siendo la meta visual principal de Aurum Fit.

## Brenzo

Fuentes oficiales revisadas:

- https://brenzo.app/
- https://brenzo.app/ayuda
- https://apps.apple.com/ca/app/brenzo-workout-planner/id6770596076

Patrones observados que encajan con Aurum Fit:

- uso cómodo con una mano y controles grandes durante el entrenamiento;
- confirmar una serie con muy pocos pasos;
- mostrar o reutilizar como referencia los valores del entrenamiento anterior;
- colocar el temporizador de descanso dentro del flujo del ejercicio;
- separar creación de rutinas, entrenamiento activo, historial y progreso;
- funcionamiento local/offline para no depender de cobertura en el gimnasio.

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

## Iconografía

La interfaz usa una selección local de Lucide Icons bajo licencia ISC. Esto da
coherencia visual y evita depender de descargas externas durante el entrenamiento.
La atribución se conserva en `THIRD_PARTY_NOTICES.md`.
