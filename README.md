# Aurum Fit

Aurum Fit es una PWA local-first en desarrollo para registrar entrenamiento y
alimentación y consultar el progreso con contexto.

## Estado

Prototipo en evolución. El incremento actual consolida Diario, Entrenamiento y
Nutrición sobre un modelo local versionado, sin cuentas ni backend.

## Funciones

- Sesión de entrenamiento libre con estado en curso/finalizada.
- Rutinas con días y ejercicios ordenados.
- Zona de cardio integrada en Rutinas con carrera, cinta, carrera de montaña,
  andar, senderismo, bici exterior y estática, piscina, aguas abiertas, elíptica,
  remo y escaladora.
- Formularios específicos por actividad: ritmo por km, velocidad media, ritmo por
  100 m o 500 m, largos, desnivel, inclinación, resistencia, cadencia y potencia
  aparecen solo cuando corresponden.
- Historial cardio comparable por actividad y suma de pasos al Diario únicamente
  cuando el usuario los registra de forma manual.
- Diario como pantalla inicial con resumen real de pasos, nutrición y entrenamiento.
- Anillo diario calculado con el avance de pasos, calorías y el entrenamiento
  planificado cuando corresponde.
- Periodos desde el inicio, mes, semana y hoy, con tabla y gráfica por ejercicio.
- Cada entrada del Diario reciente abre el resumen completo del día: métricas,
  nutrición, plan y todas las series realizadas.
- Portada de rutinas con días visibles y detalle separado para revisar o editar
  cada entrenamiento antes de empezarlo.
- Entrenamiento centrado primero en rutinas; una sesión en curso se puede
  continuar sin ocultar los planes y el entrenamiento libre queda como última opción.
- Copia histórica del día para que editar la rutina no cambie sesiones pasadas.
- Rutinas simples que guardan qué ejercicios corresponden a cada día; peso,
  repeticiones, RIR, tipo y nota se registran al entrenar.
- Series independientes con repeticiones, peso en kg, RIR, nota y tipo: efectiva,
  aproximación o calentamiento.
- Ejercicios de la sesión en acordeón: uno abierto cada vez, conservando sus
  series y con un temporizador de descanso propio.
- Temporizador compacto con descansos de 30 segundos, 1, 2 o 3 minutos y una
  duración personalizada entre 00:01 y 59:59.
- El descanso arranca solo al guardar una serie, usando tu descanso por defecto.
  Se puede desactivar en Ajustes y no se dispara al corregir una serie.
- Alternativas, ejercicios no realizados o extras que solo afectan a la sesión actual.
- Guardado automático, recuperación tras recarga y copia local previa.
- Opción explícita para descartar una sesión en curso y liberar otra rutina.
- Edición, borrado confirmado y deshacer de series.
- Duplicado de una serie como registro independiente con los mismos valores.
- Sesiones finalizadas inmutables.
- Referencia de la última sesión finalizada del mismo ejercicio.
- Vistas `Historial`, `Actual` y `Progreso` dentro de cada ejercicio activo.
- Catálogo de 1.317 ejercicios buscables por nombre, zona muscular y equipo,
  deduplicado y sin medios de Gym Visual; muestra cuatro resultados al inicio y
  permite ampliar la lista de forma voluntaria.
- Mapa muscular anatómico en el Diario, con figura de hombre o de mujer: colorea
  por zona las series efectivas de la semana, la sesión o el mes, separando el
  trabajo directo de la implicación secundaria y sin sumarlos nunca.
- Aviso `Sin revisión profesional todavía` en las tarjetas del catálogo cuyo
  contenido siga pendiente de revisión.
- Confirmaciones propias y accesibles en lugar del diálogo del navegador: foco
  atrapado, cierre con `Escape` y devolución del foco al elemento anterior.
- Instalación offline que exige el shell pero tolera que el catálogo de 2,8 MB
  falle: la aplicación sigue siendo utilizable sin conexión.
- Limpieza versionada de datos ficticios que conserva rutinas, sesiones,
  comidas, recetas y objetivos reales ya guardados en el dispositivo.
- Tema oscuro por defecto, independientemente del sistema del móvil, con la
  opción de cambiarlo a claro o automático en Ajustes.
- Ajustes locales de perfil y objetivos manuales de calorías, proteína y pasos.
- Base nutricional para recetas y etiquetas específicas por marca, incluida una
  foto local reducida de la etiqueta sin lectura automática ficticia.
- Ejercicios personales.
- Conservación compatible de los registros diarios, comidas e historial anteriores.
- Exportación e importación validadas.

## Roadmap

- Afinar la lectura de volumen y progreso sin mezclar series preparatorias con efectivas.
- Completar el editor de recetas por ingredientes y el cálculo por cantidad.
- Después de cerrar Nutrición, definir un bloque separado de calentamiento y
  movilidad con contenido revisado y límites de salud claros.
- Lectura asistida de etiquetas mediante foto, solo cuando pueda validarse antes
  de guardar los valores.
- Ampliación progresiva y revisada del catálogo.
- Logros a partir de hechos verificables: récord de peso, racha de días y
  semanas entrenando, primera semana cubriendo las zonas principales.
- Mapa muscular también en el resumen al finalizar el entrenamiento.
- Poder asignar músculos a los ejercicios personales.
- Definir licencias y presupuesto de rendimiento antes de añadir imágenes o
  animaciones de ejercicios.
- Sincronización solo si la validación futura la necesita.

## Uso en iPhone

1. Abrir la web publicada en Safari.
2. Tocar compartir.
3. Elegir "Anadir a pantalla de inicio".
4. Abrirla desde el icono creado.

Los datos se guardan localmente en el navegador. Conviene exportar una copia de
seguridad de vez en cuando.

## Desarrollo

No hay dependencias de ejecución. Para servir la PWA:

```bash
python3 -m http.server 8000
```

Para ejecutar las comprobaciones:

```bash
node --test
```

La versión de caché vive repartida entre `SHELL_VERSION` (`service-worker.js`) y
las referencias `?v=` de `index.html` y `app.js`. No se editan a mano:

```bash
node scripts/bump-cache-version.mjs      # sincroniza todo con SHELL_VERSION
node scripts/bump-cache-version.mjs 55   # sube la versión en todas partes
```

Conviene subir la versión en cualquier cambio de `index.html`, `styles.css`,
`app.js`, `core.js` o del catálogo, para que la PWA instalada no sirva una
mezcla de versiones. Las pruebas fallan si alguna referencia se queda atrás.

Los colores se comprueban con:

```bash
node scripts/check-muscle-palette.mjs    # escala del mapa muscular y daltonismo
node scripts/check-theme-contrast.mjs    # contraste de la paleta del tema claro
```

Documentación:

- `docs/MODELO_LOCAL_V2.md`
- `docs/MAPA_MUSCULAR.md`
- `docs/REFERENCIA_VIDEO_BRENZO.md`
- `docs/IMPORTACION_CATALOGO.md`
- `docs/SISTEMA_VISUAL.md`
- `docs/REFERENCIAS_UX.md`
- `docs/PRUEBAS_MANUALES.md`
