# Aurum Fit

Aurum Fit es una PWA local-first en desarrollo para registrar entrenamiento y
alimentación y consultar el progreso con contexto.

## Estado

Prototipo en evolución. El incremento actual introduce un modelo local versionado
y el primer flujo vertical de entrenamiento, sin cuentas ni backend.

## Funciones

- Sesión de entrenamiento libre con estado en curso/finalizada.
- Rutinas con días y ejercicios ordenados.
- Inicio desde el día sugerido, otro día o entrenamiento libre.
- Copia histórica del día para que editar la rutina no cambie sesiones pasadas.
- Series independientes con repeticiones, peso, RPE, calentamiento y nota.
- Guardado automático, recuperación tras recarga y copia local previa.
- Edición, borrado confirmado y deshacer de series.
- Referencia de la última sesión finalizada del mismo ejercicio.
- Catálogo inicial de 24 ejercicios buscables/filtrables, sin medios de Gym Visual.
- Ejercicios personales.
- Conservación compatible de los registros diarios, comidas e historial anteriores.
- Exportación e importación validadas.

## Roadmap

- Añadir, omitir, sustituir y reordenar ejercicios durante una sesión.
- Progreso comparable por ejercicio y frecuencia.
- Producto nutricional por etiqueta/100 g y recetas personales.
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
