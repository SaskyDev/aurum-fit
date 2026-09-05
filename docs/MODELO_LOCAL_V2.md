# Modelo local v2

Fecha: 24 de julio de 2026.
Última revisión: 5 de septiembre de 2026.

## Objetivo del incremento

Este corte permite:

- iniciar un entrenamiento libre;
- crear rutinas con días y ejercicios ordenados;
- revisar una rutina y empezar uno de sus días;
- registrar series independientes;
- recuperar la sesión al recargar y finalizarla.
- asignar cada día de rutina a un día de la semana sin conflictos entre rutinas;
- registrar RIR opcional de 0 a 5, manteniendo lectura de datos antiguos con RPE;
- usar un temporizador manual por ejercicio de 30 s, 1, 2 o 3 minutos;
- consultar Diario por periodo con actividad, nutrición, sesiones y progreso por
  ejercicio;
- distinguir series efectivas, de aproximación y de calentamiento;
- omitir o sustituir un ejercicio previsto, o añadir uno extra solo a la sesión actual;
- impedir cualquier edición después de finalizar la sesión.

Incluye una base local de recetas y etiquetas por marca. Todavía no incluye OCR,
cálculo automático de objetivos ni sincronización entre dispositivos.

## Claves de almacenamiento

- `fit-tracker-v1`: datos originales del prototipo. La migración nunca los borra ni
  los sobrescribe.
- `aurum-fit-v2`: estado versionado que utiliza la aplicación a partir de este
  incremento.
- `aurum-fit-v2-backup`: copia del estado v2 inmediatamente anterior a cada
  guardado.
- `aurum-fit-v2-corrupt-<fecha>`: copia de un valor v2 ilegible o incompatible
  antes de iniciar un estado recuperable.

## Estructura resumida

```text
estado v2
├── schemaVersion
├── owner
│   ├── id = "local-user"
│   ├── profile (fecha, altura y peso opcionales)
│   └── targets (calorías, proteína y pasos manuales)
├── legacy
│   └── days (copia compatible del prototipo)
├── training
│   ├── exercises  (name, source, category, equipment, muscles)
│   ├── routines
│   │   └── days
│   │       └── exercises
│   ├── sessions
│   │   └── exercises
│   │       └── sets
│   ├── activeSessionId
│   └── undo
├── nutrition
│   ├── recipes
│   └── labels
└── meta
```

Cada entidad histórica lleva `userId` aunque solo exista el usuario local. Esto
prepara la propiedad futura sin introducir cuentas, autenticación o backend.

Una rutina es un plan mutable. Cada rutina contiene bloques/días con ejercicios
ordenados. Un mismo bloque puede repetirse varios días de la semana mediante
`weekdays` para evitar tres copias idénticas de una rutina full body. El campo
antiguo `weekday` se conserva como compatibilidad y representa el primer día
asignado cuando existe.

El plan decide qué ejercicios corresponden al día, pero no prescribe series,
repeticiones, peso ni RIR.

Al iniciar desde un día, la sesión copia:

- nombre de la rutina;
- nombre del día;
- identidad, nombre y orden de cada ejercicio.
- una sesión vacía para registrar únicamente lo que se haga ese día.

Por eso añadir o reordenar ejercicios posteriormente en la rutina no puede
reescribir el pasado.

## Músculos del ejercicio

Desde el 5 de septiembre de 2026 cada ejercicio puede llevar:

```js
muscles: { direct: ["chest"], secondary: ["triceps", "shoulders"] }
```

Se copian del catálogo al añadir el ejercicio, con el vocabulario propio de 21
regiones. Viven en el ejercicio y no se recalculan al pintar, porque el historial
tiene que poder leerse sin conexión y sin catálogo, y porque un ejercicio que
desaparezca de una futura versión del dataset no puede perder su historial.

El campo es opcional: un ejercicio personal que no esté en el catálogo se queda
sin músculos y sus series se declaran como no repartidas. Es compatible hacia
atrás y no cambia `schemaVersion`. Ver `docs/MAPA_MUSCULAR.md`.

## Reglas de seguridad

- La serie es la unidad guardada y tiene estado `completed`.
- Cada serie tiene un único tipo: `effective`, `approach` o `warmup`.
- Solo las efectivas completan las series previstas y alimentan la gráfica
  principal de peso/repeticiones.
- Repeticiones: entero entre 1 y 1000.
- Peso opcional: entre 0 y 2000 kg.
- RIR opcional: entero entre 0 y 5. Los datos importados con RPE antiguo se
  conservan para compatibilidad, pero la interfaz nueva usa RIR.
- Nota opcional: máximo 300 caracteres.
- Todo texto del usuario se representa con `textContent`, no con `innerHTML`.
- Una sesión vacía no puede finalizarse.
- Una sesión finalizada no admite corregir, borrar ni añadir series.
- Un ejercicio con series completadas no puede marcarse después como omitido.
- Una sustitución conserva el ejercicio original en `substitutedFrom`, afecta solo
  a la sesión activa y se bloquea en cuanto existe una serie completada.
- Un día de rutina vacío no puede iniciarse.
- No se permiten rutinas, días o ejercicios duplicados dentro del mismo contexto.
- Dos rutinas activas no pueden compartir el mismo día de la semana.
- La referencia anterior solo usa sesiones finalizadas del mismo ejercicio.
- Importar exige una estructura v2 válida o una copia reconocible del prototipo.
- Los registros de demostración llevan `isDemo` y pueden eliminarse sin tocar
  entidades reales. `meta.demoSeedVersion` identifica la semilla cargada.
- La foto de una etiqueta se reduce antes de guardarse y se rechaza si sigue
  siendo demasiado grande para el almacenamiento local.
- El trabajo directo y la implicación secundaria de un músculo nunca se suman ni
  se ponderan: son dos recuentos separados.
- Solo las series efectivas cuentan como volumen en el mapa muscular.
- El estado del temporizador es efímero: no altera la rutina, las series ni el
  historial, y se pausa al cambiar de ejercicio.

## Fundamento que Alex debe comprender

La rutina es un plan mutable. La sesión es un hecho histórico. La serie es la
unidad mínima completada. Separarlas evita que cambiar el plan modifique lo que
realmente ocurrió.
