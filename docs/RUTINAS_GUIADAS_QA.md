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
