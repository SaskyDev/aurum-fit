# Decisiones de experiencia de uso

Lo que hemos decidido nosotros y por qué. Lo que viene de mirar Brenzo está en
`REFERENCIA_BRENZO.md`; aquí solo queda lo que ya es nuestro.

Actualizado: 5 de septiembre de 2026.

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
