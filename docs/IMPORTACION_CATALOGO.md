# Importación reproducible del catálogo

Fecha: 24 de julio de 2026.

## Decisión

El primer catálogo incluye 23 ejercicios útiles para validar búsqueda, filtros y
registro con los usuarios iniciales. No se copian 1.324 registros dentro de la
interfaz.

La fuente es `hasaneyldrm/exercises-dataset`, fijada al commit registrado en
`data/exercises.es.json`. Se importan únicamente metadatos y textos cubiertos por
MIT. Se excluyen de forma explícita:

- `image`
- `gif_url`
- `media_id`
- `attribution` de los medios
- todos los archivos de `images/` y `videos/`

El registro `3211` (`Flexiones con apoyo de rodillas`) se excluye de la muestra.
La fuente comienza describiendo una posición arrodillada, pero después indica
extender las piernas y apoyar las puntas de los pies; esa contradicción describe
otra variante. La exclusión queda registrada en `policy.excludedRecords` y se
reproduce desde el script, sin inventar una corrección ni presentarlo como
consejo médico.

Las imágenes y GIF pertenecen a Gym Visual. Clonar el repositorio fuente no
concede permiso para reutilizarlos.

## Proceso

1. Clonar o actualizar el repositorio fuente.
2. Anotar el commit exacto con `git rev-parse HEAD`.
3. Ejecutar:

```bash
node scripts/import-exercise-catalog.mjs \
  /ruta/exercises-dataset/data/exercises.json \
  COMMIT_ORIGEN \
  data/exercises.es.json
```

4. Revisar el resumen: total de origen, IDs únicos y grupos duplicados.
5. Comprobar que la salida no contiene `image`, `gif_url`, `media_id` ni
   `attribution`.
6. Revisar manualmente los nombres españoles seleccionados y las instrucciones.
7. Ejecutar las pruebas antes de aceptar la salida.

## Normalización y deduplicación

- La identidad estable es el ID de origen, prefijado como `dataset-`.
- Para detectar candidatos duplicados se normalizan espacios y mayúsculas de la
  combinación nombre + categoría + equipo + objetivo.
- La selección manual usa un único ID canónico cuando hay duplicados exactos.
- El ejercicio `lever chest press` aparece dos veces de forma idéntica; la
  muestra conserva `0576` y descarta `0577`.
- Los nombres españoles son una capa curada de presentación. El nombre original
  se conserva para trazabilidad y búsqueda.

## Calidad y límites

Las instrucciones españolas proceden del dataset y se marcan
`pending_professional_review`. La interfaz las presenta como información
pendiente de revisión, nunca como consejo médico o garantía de técnica segura.

Antes de ampliar el catálogo se debe observar qué buscan Alex y los dos usuarios,
revisar traducciones con el entrenador/fisioterapeuta y decidir si hace falta
carga progresiva. Los ejercicios personales continúan disponibles.

## Atribución MIT

Fuente: `https://github.com/hasaneyldrm/exercises-dataset`

Copyright (c) 2026 Hasan Emir Yıldırım.

La licencia MIT completa de los datos importados se conserva en
`THIRD_PARTY_NOTICES.md`.
