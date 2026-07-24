# Modelo local v2

Fecha: 24 de julio de 2026.

## Objetivo del incremento

Los dos primeros cortes verticales permiten:

- iniciar un entrenamiento libre;
- crear rutinas con días y ejercicios ordenados;
- iniciar desde el día sugerido o elegir otro día;
- registrar series independientes;
- recuperar la sesión al recargar y finalizarla.

No incluye todavía omitir/sustituir/reordenar ejercicios durante una sesión ni
nutrición por etiqueta.

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
│   └── id = "local-user"
├── legacy
│   └── days (copia compatible del prototipo)
├── training
│   ├── exercises
│   ├── routines
│   │   └── days
│   │       └── exercises
│   ├── sessions
│   │   └── exercises
│   │       └── sets
│   ├── activeSessionId
│   └── undo
└── meta
```

Cada entidad histórica lleva `userId` aunque solo exista el usuario local. Esto
prepara la propiedad futura sin introducir cuentas, autenticación o backend.

Una rutina es un plan mutable. Cada rutina contiene días ordenados, un día
sugerido y ejercicios ordenados.

Al iniciar desde un día, la sesión copia:

- nombre de la rutina;
- nombre del día;
- identidad, nombre y orden de cada ejercicio.

Por eso añadir o reordenar ejercicios posteriormente en la rutina no puede
reescribir el pasado.

## Reglas de seguridad

- La serie es la unidad guardada y tiene estado `completed`.
- Repeticiones: entero entre 1 y 1000.
- Peso opcional: entre 0 y 2000 kg.
- RPE opcional: entre 1 y 10, en pasos de 0,5.
- Nota opcional: máximo 300 caracteres.
- Todo texto del usuario se representa con `textContent`, no con `innerHTML`.
- Una sesión vacía no puede finalizarse.
- Un día de rutina vacío no puede iniciarse.
- No se permiten rutinas, días o ejercicios duplicados dentro del mismo contexto.
- La referencia anterior solo usa sesiones finalizadas del mismo ejercicio.
- Importar exige una estructura v2 válida o una copia reconocible del prototipo.

## Fundamento que Alex debe comprender

La rutina es un plan mutable. La sesión es un hecho histórico. La serie es la
unidad mínima completada. Separarlas evita que cambiar el plan modifique lo que
realmente ocurrió.
