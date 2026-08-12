# Importación reproducible del catálogo

Fecha: 24 de julio de 2026.

## Decisión

El catálogo incluye 1.317 ejercicios utilizables de los 1.324 registros del
commit auditado: se excluyen seis duplicados exactos y un registro contradictorio.
La interfaz nunca muestra todo de golpe; exige una búsqueda o filtro y limita la
primera vista a doce coincidencias.

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
6. Revisar los nombres españoles curados y la integridad de las instrucciones.
7. Ejecutar las pruebas antes de aceptar la salida.

## Normalización y deduplicación

- La identidad estable es el ID de origen, prefijado como `dataset-`.
- Para detectar candidatos duplicados se normalizan espacios y mayúsculas de la
  combinación nombre + categoría + equipo + objetivo.
- El importador conserva un único ID canónico por grupo duplicado y documenta
  cada descarte en `policy.duplicateExclusions`.
- El ejercicio `lever chest press` conserva `0576`, ya utilizado por las rutinas
  del prototipo, y descarta `0577`.
- Los 23 nombres españoles revisados se conservan como capa curada. Los otros
  1.294 muestran de momento el nombre original inglés, identificado en la
  interfaz, para no publicar traducciones automáticas dudosas.
- Categoría, equipo, objetivo y grupo muscular sí disponen de equivalencias
  españolas y forman parte de la búsqueda.

## Calidad y límites

Las instrucciones españolas proceden del dataset y se marcan
`pending_professional_review`. La interfaz las presenta como información
pendiente de revisión, nunca como consejo médico o garantía de técnica segura.

Las instrucciones españolas del origen se conservan, pero continúan marcadas
`pending_professional_review`. La siguiente capa de calidad consiste en traducir
y revisar progresivamente los nombres más utilizados, no en inventar de golpe
1.294 traducciones. Los ejercicios personales continúan disponibles.

## Atribución MIT

Fuente: `https://github.com/hasaneyldrm/exercises-dataset`

Copyright (c) 2026 Hasan Emir Yıldırım.

La licencia MIT completa de los datos importados se conserva en
`THIRD_PARTY_NOTICES.md`.
