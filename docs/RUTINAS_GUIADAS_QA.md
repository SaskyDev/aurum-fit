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

- Pendientes en una única fila `Set · Peso · Reps · RIR · ✓`. Tocar una celda
  abre la rueda numérica; el check pide `Calentamiento`, `Aproximación` o
  `Efectiva` antes de guardar. Los extras reutilizan exactamente la misma fila.
- Descanso conserva Ajustes; tras guardar aparece una barra flotante con `+30 s`,
  pausa/reanudación y `Saltar`. No existe ya un panel permanente por ejercicio.
- E2E a 390 × 844 px en claro, oscuro y movimiento reducido: una serie nueva
  arranca el descanso y corregir un valor guardado no lo reinicia.
- Contactos táctiles emulados mediante CDP, no ratón; pendiente de validación
  física en el iPhone de Alex. Capturas en `/tmp/aurum-guided-qa/`.

## Paso 7 — anular y revisar el Diario

- Deslizar una pendiente hacia la izquierda la anula; la alternativa accesible
  por teclado ejecuta la misma operación. Volver a pendiente no registra nada.
- Deslizar una realizada hacia la izquierda pide confirmación para borrarla y
  ofrece deshacer. En una rutina guiada no se ofrece duplicar.
- Sesión, historial por ejercicio y resumen completo del día muestran anulación
  neutral, gris y tachada, sin carga/repeticiones inventadas ni acciones de copiar.
- Contadores del ejercicio solo suman realizadas.
- Recorrido E2E anula, finaliza una sesión con trabajo real y abre el Diario.
  La mutación `QA_MUTATE=annul` elimina la operación y el recorrido falla.

## Paso 8 — desviación con decisión explícita

- `guidedExerciseDeviation` agrupa todas las series efectivas del ejercicio;
  aproximaciones, calentamientos y anuladas quedan fuera.
- Solo las series efectivas marcadas proponen cambiar la referencia. Calentar,
  anular, duplicar extras o corregir un registro no redefine el plan.
- La hoja se abre al cerrar/cambiar de ejercicio o finalizar. `Solo hoy` no
  pierde ninguna serie; `Editar próximas sesiones` precarga peso y rango para
  que la persona confirme o ajuste el resultado.
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
- `demoSeedVersion` sube a 3 e incluye una anulación reciente fácil de encontrar.
  Antes de cargar se guarda únicamente la metadata
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

## Paso 11 — rediseño compacto v85

- Biblioteca: etiqueta muscular y etiqueta independiente `Guiada` / `Solo
  registro` sin aumentar la tarjeta.
- Cabecera: `Guía`, `Nota`, `Cambiar`, `Hoy no` y eliminación global compactas.
  Guía solo abre `instructionsEs` existente; no se genera texto.
- `sessionNote` vive en la foto de la sesión y admite 300 caracteres. Nunca
  reescribe `planNote`.
- Récord y última referencia comparten una franja compacta con códigos naranja
  y azul. Historial y progreso siguen siendo vistas independientes.
- La rueda usa scroll nativo con encaje, lista virtualizada, teclado y límites:
  peso 0–2000 en pasos de 0,25; repeticiones 1–1000; RIR vacío o 0–5.
- Eliminar un ejercicio lo retira de todos los bloques de la rutina. El trabajo
  ya registrado se conserva; las pendientes desaparecen y un deshacer restaura
  posiciones, plan y sesión activa.
- Una alternativa `solo hoy` conserva sus datos en la sesión, pero no propone
  cambios para el ejercicio original. `Eliminar` sigue actuando sobre la posición
  original de la rutina y admite deshacer.
- Guía, Nota, edición de plan y rueda atrapan el foco, se cierran con Escape y
  devuelven el foco al control que las abrió. La rueda usa un único valor tabulable
  y admite flechas, inicio/fin y escritura directa sin confirmar al cancelar.
- Verificación automática: 390 × 844 px, claro, oscuro y movimiento reducido,
  sin desbordamiento horizontal y filas de 56 px. La prueba física en iPhone
  sigue siendo el último requisito antes de publicar.
- Las cinco acciones superiores se presentan con icono y etiqueta en dos filas
  equilibradas en móvil (tres arriba y dos centradas abajo); todas conservan un
  área táctil de al menos 44 px. El cambio se cancela junto al estado del
  catálogo, no como una acción competidora en la cabecera.
- `Solo registro` usa azul/verde informativo: describe el modo de la rutina,
  no un estado inactivo o negativo.

## Cierre de interfaz y publicación local · 11 de septiembre de 2026

### Hecho y verificado

- La rama reúne los diez pasos de rutinas guiadas y cuatro cierres de interfaz:
  borrador de entrenamiento libre, registro compacto, revisión de controles y
  pulido del modo `Solo registro`.
- La suite canónica termina en **124/124**. El recorrido móvil automatizado se
  ha repetido a **390 × 844 px** en oscuro, claro y movimiento reducido, sin
  desbordamiento horizontal.
- La caché PWA queda en **v91**, sincronizada exclusivamente con
  `node scripts/bump-cache-version.mjs 91`.

### Incidencias reales y prevención

| Incidencia | Causa confirmada | Regla para no repetirla |
| --- | --- | --- |
| Acciones sin icono en la vista `file://` | Un `<use>` SVG externo puede no resolver en esa superficie, aunque cargue desde HTTP. | Las acciones dinámicas del ejercicio usan trazos SVG internos; comprobar ambos modos en la QA móvil. |
| Acciones alineadas a la izquierda con cuatro botones | La cuadrícula reservaba siempre cinco columnas. | En escritorio usar columnas `auto-fit`; en móvil mantener tres arriba y dos centradas abajo. |
| Hueco grande antes de la primera serie en `Solo registro` | Se pintaba el mensaje “Aún no hay series registradas” entre las cabeceras y el formulario. | Si no hay series previas, no renderizar una fila vacía; agrupar cabeceras y primer registro en `compact-registration`. |
| “Añadir ejercicio solo hoy” quedaba pegado | Un selector CSS apuntaba a una jerarquía anterior del DOM. | Aplicar el margen al propio selector reutilizable, no a una ruta de DOM frágil. |
| Entrenamiento libre contaminaba el Diario antes de empezar | Se creaba directamente una sesión activa. | Crear un borrador persistente y arrancar cronómetro/Diario solo con `Empezar`. |
| Una sugerencia seguía visible después de añadirla | El catálogo no excluía los ejercicios ya presentes en la sesión. | Filtrar por los identificadores de la sesión salvo durante la sustitución explícita. |
| Mensaje de plan futuro ambiguo | No explicaba motivo, alcance ni que el historial quedaba intacto. | Todo cambio de plan debe nombrar las series observadas, ofrecer `Solo hoy` y declarar que el día actual no cambia. |
| Prueba estática rota tras una mejora visual | La prueba exigía una cuadrícula concreta en lugar del comportamiento deseado. | Las pruebas de estabilidad deben afirmar el contrato visual, no congelar una implementación que puede mejorar. |

### Pendiente externo, no simulable aquí

1. Prueba física de Alex en iPhone: acciones, rueda, gesto lateral, descanso y
   actualización de una PWA instalada desde GitHub Pages.
2. Tras el push, comprobar el HTML y `?v=91` publicados. Si una instalación
   antigua muestra el diseño anterior, cerrar y reabrir la app instalada para
   que el service worker reclame la nueva caché; no editar archivos para
   “forzar” una caché manual.
