# Ideas aparcadas de Aurum Fit

## Calentamiento y movilidad

Estado: aparcado intencionadamente.

Momento de retomarlo: después de cerrar y validar la parte de Nutrición.

No debe confundirse con los tipos de serie del entrenamiento:

- `Calentamiento` y `Aproximación` describen una serie concreta antes de las
  series efectivas.
- La futura función de calentamiento y movilidad será un bloque propio para
  preparar una sesión, articulación o zona corporal.

Cuando se retome habrá que decidir, con evidencia y límites de salud claros:

- calentamientos generales frente a específicos por entrenamiento;
- movilidad guiada por zona o ejercicio;
- duración, orden y posibilidad de omitir pasos;
- qué contenido requiere revisión profesional;
- cómo evitar prometer prevención de lesiones o tratamiento.

Prioridad vigente: Entrenamiento → Nutrición → Calentamiento y movilidad.
El mapa muscular ya no forma parte de esta cola: ver `docs/MAPA_MUSCULAR.md`.

## Capacidades que requieren una app móvil real

Estado: aparcadas hasta que los tres flujos principales sean estables y se haya
definido la arquitectura de cuentas y sincronización.

- Importar pasos, distancia, frecuencia cardiaca, calorías y entrenamientos desde
  Apple HealthKit y Android Health Connect.
- GPS y rutas para carrera, senderismo, bici y aguas abiertas, incluido desnivel
  calculado y diferencia entre tiempo total y tiempo en movimiento.
- Temporizadores y registro en segundo plano con la pantalla bloqueada.
- Integración futura con Apple Watch, Wear OS y sensores de ciclismo.
- Cámara nativa para códigos de barras y etiquetas nutricionales.
- Notificaciones útiles, configurables y no invasivas.
- Sincronización entre dispositivos con resolución de conflictos y deduplicación
  por origen e identificador externo.

Antes de implementar cualquiera de estos puntos hay que cerrar: cuentas,
backend, permisos, privacidad, fuente de cada métrica y reglas para no duplicar
pasos o actividades importadas y manuales.

## Mapa muscular

Estado: **construido en su primera versión** el 5 de septiembre de 2026. Deja de
estar aparcado. La especificación completa, las decisiones y lo que falta están
en `docs/MAPA_MUSCULAR.md`.

Lo que se resolvió de lo que aquí estaba pendiente:

- músculo principal y secundarios normalizados a 21 regiones propias que cubren
  los 50 valores distintos del dataset;
- el mapa representa un periodo elegible (sesión, semana o mes), con la semana
  por defecto;
- el trabajo directo y la implicación secundaria se muestran separados y no se
  suman nunca;
- no se presenta como diagnóstico, prevención de lesiones ni medida de
  activación, y el aviso vive bajo el mapa;
- legibilidad comprobada en móvil, paletas validadas para daltonismo y
  alternativa en texto mediante la tabla por zona.

Sigue abierto: asignar músculos a los ejercicios personales, llevar el mapa al
resumen de fin de entrenamiento y la revisión profesional del mapeo.

## Imágenes, animaciones y vídeo de ejercicios

Estado: pendiente de estrategia de contenido y licencias; no reutilizar archivos
de terceros sin permiso verificable.

Decisiones previas:

- contenido propio, encargado o con licencia comercial compatible;
- imagen estática, secuencia corta o vídeo según lo que realmente ayude a ejecutar
  el movimiento;
- descarga bajo demanda, peso máximo y funcionamiento sin conexión;
- vista frontal/lateral, instrucciones, errores frecuentes y alternativa accesible
  en texto;
- revisión profesional del contenido y límites de salud.
