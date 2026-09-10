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
