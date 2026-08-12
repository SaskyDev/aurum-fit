# Aurum Fit

Aurum Fit es una PWA local-first en desarrollo para registrar entrenamiento y
alimentación y consultar el progreso con contexto.

## Estado

Prototipo en evolución. El incremento actual consolida Diario, Entrenamiento y
Nutrición sobre un modelo local versionado, sin cuentas ni backend.

## Funciones

- Sesión de entrenamiento libre con estado en curso/finalizada.
- Rutinas con días y ejercicios ordenados.
- Diario como pantalla inicial con resumen real de pasos, nutrición y entrenamiento.
- Anillo diario calculado con el avance de pasos, calorías y el entrenamiento
  planificado cuando corresponde.
- Periodos desde el inicio, mes, semana y hoy, con tabla y gráfica por ejercicio.
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
- Alternativas, ejercicios no realizados o extras que solo afectan a la sesión actual.
- Guardado automático, recuperación tras recarga y copia local previa.
- Opción explícita para descartar una sesión en curso y liberar otra rutina.
- Edición, borrado confirmado y deshacer de series.
- Sesiones finalizadas inmutables.
- Referencia de la última sesión finalizada del mismo ejercicio.
- Catálogo de 1.317 ejercicios buscables por nombre, zona muscular y equipo,
  deduplicado y sin medios de Gym Visual; muestra cuatro resultados al inicio y
  permite ampliar la lista de forma voluntaria.
- Limpieza versionada de datos ficticios que conserva rutinas, sesiones,
  comidas, recetas y objetivos reales ya guardados en el dispositivo.
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

Documentación:

- `docs/MODELO_LOCAL_V2.md`
- `docs/IMPORTACION_CATALOGO.md`
- `docs/SISTEMA_VISUAL.md`
- `docs/PRUEBAS_MANUALES.md`
