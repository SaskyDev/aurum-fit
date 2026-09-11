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

## Paso 5 — creación y edición guiadas

- Selector Solo registro / Guiada en fuerza; cardio mantiene su flujo log.
- Campos reutilizan `makeSetField`; series/rango obligatorios, peso opcional.
- Editar el plan y convertir una rutina log pide configurar cada ejercicio;
  conversión atómica mediante `commit`, sin botón de conversión inversa.
- E2E antes de implementar falló por ausencia del selector; pasa a 390 px en
  claro/oscuro con movimiento reducido. `QA_MUTATE=creation` fuerza log en la
  respuesta HTTP de app.js: el recorrido falla, sin tocar archivos.
- Detectado visualmente y corregido fondo oscuro con tinta oscura en tarjetas
  de rutina bajo tema claro. No se cambia la paleta general.

## Paso 6 — marcar series y descansar

- Pendientes con datos previstos, check explícito, RIR vacío y nota desplegable.
  Los extras permanecen aparte. Se reutilizan formulario, filas y destello.
- Descanso conserva Ajustes; +30 s / +1 min / +2 min amplían el restante solo
  para ese descanso, con tope 59:59, sin reescribir el valor habitual.
- E2E rojo/verde y mutación `QA_MUTATE=check` detectada. A 390 px claro/oscuro:
  tap registra una sola serie, arranque automático activado/desactivado,
  swipe táctil derecha duplica e izquierda pide confirmar borrado.
- Contactos táctiles emulados mediante CDP, no ratón; pendiente de validación
  física en el iPhone de Alex. Capturas en `/tmp/aurum-guided-qa/`.

## Paso 7 — anular y revisar el Diario

- Anular está junto al check; volver a pendiente no registra automáticamente.
- Sesión, historial por ejercicio y resumen completo del día muestran anulación
  neutral, gris y tachada, sin carga/repeticiones inventadas ni acciones de copiar.
- Contadores del ejercicio solo suman realizadas.
- Recorrido E2E anula, finaliza una sesión con trabajo real y abre el Diario.
  La mutación `QA_MUTATE=annul` elimina la operación y el recorrido falla.

## Paso 8 — desviación con decisión explícita

- `guidedPlanDeviation` es puro: compara peso y rango en ambos sentidos.
- Solo las series efectivas marcadas proponen cambiar la referencia. Calentar,
  anular, duplicar extras o corregir un registro no redefine el plan.
- El diálogo se abre después de guardar: cancelar no pierde la serie.
- Actualizar usa `updateRoutineExercisePlan` y preserva otros campos del plan
  actual; la foto de la sesión permanece igual.
- TDD y mutación de desviación detectada. E2E rechaza una bajada y acepta una
  subida, comprobando persistencia antes y después de responder.

## Paso 9 — primera referencia

- Sin carga objetivo aparece «Primera vez: vamos a tomar tu referencia» y el
  campo está realmente vacío, sin reutilizar un peso anterior como sugerencia.
- Tras registrar una carga (también 0), se pregunta antes de guardarla como
  objetivo. No se insiste si ya se aceptó ese mismo valor.
- TDD rojo/verde; mutación que excluye null de calibración detectada.
- `QA_CALIBRATION=1 node scripts/qa-guided-browser.mjs`: ambos temas, comprobación
  de campo y placeholder vacíos, confirmación y foto original inalterada.

## Paso 10 — demostración y cierre

- La demo incluye rutinas en ambos modos, una serie anulada y un ejercicio guiado
  sin peso objetivo. La propiedad ad hoc `demoLoad` desaparece: el modelo usa
  `targetLoadKg` y conserva la progresión semanal.
- `demoSeedVersion` sube a 2. Antes de cargar se guarda únicamente la metadata
  técnica necesaria para que quitar la demo restaure exactamente el estado
  inicial —incluido su sello de actualización—, incluso si un ejercicio real
  comparte identificador con el catálogo.
- La prueba de dominio exige más de tres cargas distintas para Press de banca y
  restaura el estado funcional previo. La mutación que aplana la fórmula de
  progreso pone la prueba roja.
- `scripts/qa-guided-demo.mjs` comprueba a 390 × 844 px, en claro y oscuro, que
  la gráfica existe, que su línea de carga no es plana y que quitar la demo no
  cambia datos del usuario.
- Cierre: suite canónica, ocho mutaciones guiadas, sintaxis, contraste, paleta y
  recorridos E2E en verde. La interacción táctil física queda reservada a la
  prueba de Alex en iPhone antes de publicar.
