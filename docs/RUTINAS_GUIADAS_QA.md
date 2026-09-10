# Implementación de rutinas guiadas

Rama: `claude/gifted-thompson-45fcwz`. No publicar ni hacer push.
Orden de trabajo: `/Users/alex/Downloads/PROMPT_CODEX.md`.

Alex confirmó usar la suite canónica `node --test tests/*.test.js`:
95 pruebas iniciales; `_cerebro/tests` es archivo histórico y no se modifica.

## Paso 1 — modo de rutina

- `mode` acepta `log` / `guided`; ausente se normaliza a `log`.
- Creación simple y con días conserva el modo elegido. Sin interfaz todavía.
- TDD: la prueba nueva falló antes de implementar.
- Mutación reproducible: `node scripts/check-guided-mutations.mjs` cambia la
  normalización a `guided` en memoria; debe obtener exactamente una prueba roja.

## Paso 2 — peso objetivo opcional

- El plan guiado exige series/rango; el peso admite vacío/null, cero y decimales.
- Validación antes de crear ejercicios evita altas parciales si el plan falla.
- Se rechazan pesos negativos, no finitos y superiores a 2000 kg.
- TDD rojo/verde; mutación `Number(null)` detectada por la prueba del plan.

## Paso 3 — plan y hechos separados

- Solo `guided` copia series, rango, carga y nota a una foto de sesión.
- Las pendientes se derivan de la foto; `sets` sigue vacío hasta registrar algo.
  No se crean falsas series completadas ni es necesario un estado `planned`.
- La prueba original permanece en modo log. La nueva comprueba volumen/récord
  vacíos y que editar la rutina no cambia una sesión ya cerrada.
- TDD rojo/verde; la mutación que elimina las series previstas es detectada.

## Paso 4 — anulación y auditoría de consumidores

- `planOrder` identifica cada hueco; no admite dos resoluciones ni índices fuera
  del plan. `skipPlannedSet` conserva estado `skipped`, sin datos realizados.
- Volumen muscular, récords y `completeSession` ya filtraban completadas.
- Corregidos ambos gráficos de progreso y `sessionSetCount`: no filtraban estado.
- Última referencia omite sesiones del ejercicio sin series completadas.
- Duplicar/editar una anulada no puede convertirla implícitamente en realizada.
- TDD rojo/verde; mutación de skipped a completed detectada. Pendiente de UI.
