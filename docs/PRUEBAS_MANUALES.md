# Pruebas manuales reproducibles

## Incremento 1: sesión libre y series

1. Ejecutar `python3 -m http.server 8000`.
2. Abrir `http://localhost:8000`.
3. Entrar en `Entrenamiento` y pulsar `Iniciar entrenamiento libre`.
4. Recargar la página: la misma sesión debe seguir visible y en curso.
5. Añadir `Press banca`.
6. Registrar `10` repeticiones, `60` kg y RIR `2`.
7. Editar la serie a `9` repeticiones y `62,5` kg.
8. Borrarla, confirmar y pulsar `Deshacer`.
9. Añadir otra serie y finalizar el entrenamiento.
10. Iniciar otra sesión y volver a añadir `Press banca`.
11. Comprobar que aparece la referencia de la sesión finalizada.

## Casos de error

- Ejercicio vacío o de un carácter: debe explicar el mínimo.
- Repeticiones vacías, decimales, negativas o superiores a 1000: deben rechazarse.
- Peso negativo o superior a 2000: debe rechazarse.
- RIR `-1`, `5,5` o `6`: debe rechazarse.
- Nota de más de 300 caracteres: debe rechazarse.
- Nombre o nota `<img src=x onerror=alert(1)>`: debe mostrarse como texto y no
  crear HTML ni ejecutar código.
- Finalizar sin ninguna serie: debe impedirse.
- Importar JSON inválido o con estructura ajena: debe conservar el estado actual
  y mostrar el error.

## Comprobación del almacenamiento

En las herramientas del navegador, sección `Local Storage`:

- `fit-tracker-v1` debe seguir intacto si existía.
- `aurum-fit-v2` debe contener `schemaVersion: 2`.
- `aurum-fit-v2-backup` debe aparecer después del segundo guardado.

La prueba automatizada equivalente se ejecuta con:

```bash
npm test
```

Si `npm` no está disponible, basta cualquier Node moderno:

```bash
node --test
```

## Catálogo inicial

1. Iniciar una sesión.
2. Buscar `press banca`: debe aparecer `Press de banca con barra`.
3. Filtrar categoría `Piernas` y equipo `Barra`.
4. Abrir `Ver indicaciones en español`: debe mostrarse la advertencia de revisión.
5. Añadir un resultado y comprobar la etiqueta `Catálogo auditado`.
6. Crear además un ejercicio personal que no exista en la muestra.

## Diseño adaptable

- Escritorio: comprobar a 1280 px que catálogo e historial aprovechan dos columnas.
- Móvil: comprobar a 390 × 844 px que no existe scroll horizontal.
- En móvil, la navegación debe permanecer abajo y cada control principal debe
  medir al menos 44 px de alto.

## Incremento 2: rutinas y copia histórica

1. Crear `Torso y pierna`.
2. Añadir los días `Torso` y `Pierna`.
3. Añadir `Press de banca con barra` y `Remo sentado en polea baja` a `Torso`.
4. Cambiar el orden con los botones de subir/bajar.
5. Marcar `Torso` como sugerido.
6. Iniciar el día sugerido y comprobar que ambos ejercicios aparecen en orden.
7. Recargar: la misma sesión debe continuar.
8. Finalizar después de guardar al menos una serie.
9. Añadir otro ejercicio al día `Torso` de la rutina.
10. Exportar la copia JSON y comprobar que la sesión finalizada conserva su lista
    original, mientras la rutina contiene el ejercicio nuevo.

Casos de error:

- Rutina o día vacío/de un carácter: debe rechazarse.
- Dos rutinas con el mismo nombre normalizado: debe rechazarse.
- Dos días iguales dentro de la misma rutina: debe rechazarse.
- Dos ejercicios iguales dentro del mismo día: debe rechazarse.
- Día sin ejercicios: no debe poder iniciarse.
- Nombre `<img src=x onerror=alert(1)>`: debe mostrarse como texto.

## Regresión QA P1: pulsaciones rápidas y almacenamiento lleno

### QA-TRAIN-001

1. Borrar los datos del origen de pruebas o abrir la aplicación en un origen
   local nuevo.
2. Hacer doble clic o doble pulsación rápida en `Empezar libre`.
3. Comprobar que solo existe una sesión en curso.
4. Hacer doble clic en `Añadir` para `Press de banca con barra`.
5. Comprobar que solo aparece una tarjeta de ese ejercicio.
6. Escribir `10` repeticiones y `60` kg, y hacer doble clic en `Guardar serie`.
7. Comprobar que solo aparece una serie.
8. Recargar y confirmar que siguen existiendo una sesión, un ejercicio y una
   serie.

La protección debe existir en dos niveles: el control se bloquea brevemente y el
modelo rechaza que el mismo ejercicio se repita dentro de una sesión.

### QA-PERSIST-001

La regresión automatizada usa un almacenamiento simulado cuyo `setItem` siempre
lanza `QuotaExceededError`. Debe comprobar que:

- `loadAppState` devuelve un estado utilizable en memoria y no propaga la
  excepción;
- los datos legados continúan intactos;
- `persistenceAvailable` es `false`;
- el aviso explica que no se borraron datos y recomienda exportar una copia y
  liberar espacio;
- un guardado posterior conserva el estado anterior y muestra un error
  comprensible.

Ejecutar:

```bash
node --test
```

Resultado esperado en este checkpoint: 36 pruebas superadas usando el patrón
explícito `tests/*.test.js`.

## Incremento actual: días, RIR, temporizador y Diario

1. Crea dos rutinas con un día cada una y asigna el mismo día de la semana: la
   segunda asignación debe bloquearse y explicar el conflicto.
2. Asigna días distintos y abre `Diario / Progreso`: debe aparecer la rutina de
   hoy cuando coincida con el día actual.
3. Inicia una sesión y comprueba que el formulario muestra RIR de 0 a 5.
4. Abre un ejercicio y selecciona 30 s, 1, 2 y 3 min; `Iniciar`, `Pausar` y
   `Reiniciar` deben actualizar su contador. Al abrir otro ejercicio, el anterior
   se recoge y su temporizador se pausa.
5. Guarda métricas en `Editar métricas del día`: la línea aparece en `Diario
   reciente` y los pasos se reflejan en el resumen.

## Limpieza publicada, ajustes y etiquetas

1. Actualizar una instalación con datos reales y demostración: deben desaparecer
   las entidades `isDemo`, sus sesiones derivadas y la rutina llamada exactamente
   `Rutina de prueba`, conservando el resto del Diario, rutinas, series y comidas.
2. Recargar: los datos ficticios no deben volver a crearse y la limpieza no debe
   repetirse innecesariamente.
3. Comprobar que `aurum-fit-v2-backup` conserva el estado anterior a la limpieza.
4. Cambiar calorías, proteína y pasos en Ajustes: el Diario y Nutrición deben usar
   los nuevos objetivos sin calcular ni recomendar valores automáticamente.
5. Añadir una etiqueta con producto, marca, valores por 100 g y foto. Tras
   recargar, deben conservarse la tarjeta y una copia reducida de la imagen.
6. Seleccionar una fotografía enorme: si la reducción aún supera el límite, la
   aplicación debe explicarlo sin perder los datos ya guardados.
7. Seleccionar un archivo que no sea imagen o una imagen de más de 15 MB: debe
   rechazarse antes de mostrar vista previa y conservar el formulario.

## Sesión en acordeón

1. Empezar un día con al menos tres ejercicios: solo el primero queda abierto.
2. Guardar una serie y abrir el segundo ejercicio: el primero se recoge y el
   segundo se abre; al volver al primero, la serie continúa visible.
3. Iniciar el temporizador del primer ejercicio y abrir el segundo: el contador
   anterior debe pausarse y solo puede quedar un temporizador activo.
4. Recargar durante la sesión: las series reaparecen porque son datos guardados;
   el temporizador se reinicia porque es una ayuda efímera, no historial.

## Rutinas y descanso personalizable

1. En Rutinas, comprobar que primero aparecen todas las rutinas, después
   `Crear nueva rutina` y, como última opción, `Entrenamiento libre`.
2. Abrir `Crear nueva rutina`: seleccionar varios días como en una alarma y
   comprobar que un día ocupado por otra rutina real está deshabilitado.
3. Crear la rutina: aparece un único bloque de entrenamiento con todos los días
   seleccionados, sin duplicar la lista de ejercicios por lunes/miércoles/etc.
4. Entrar en una rutina y abrir el bloque: los ejercicios se editan antes de
   empezar. Iniciar el día debe abrir la sesión activa, no otro editor.
   Al añadir un ejercicio solo se pide su nombre, sin series ni repeticiones.
5. En la sesión, comprobar que `Añadir ejercicio solo hoy` aparece plegado al
   final y que añadirlo no modifica la rutina original.
6. Dentro del ejercicio abierto, pulsar `+ Personalizar`, introducir `7:43` y
   aplicar: el contador debe mostrar `07:43`. Valores vacíos, negativos, 60
   segundos o más de `59:59` deben rechazarse con un mensaje comprensible.
7. Dejar una sesión en curso, volver a Rutinas y comprobar que todas las demás
   muestran por qué no pueden empezar. Pulsar `Descartar`, cancelar una vez y
   confirmar después: la sesión desaparece y las rutinas vuelven a poder iniciarse.
8. Abrir un ejercicio sin series: las acciones alternativas no deben competir
   con el registro principal. Abrir `¿No puedes realizar este ejercicio hoy?` y
   comprobar que permite elegir una alternativa o marcarlo como no realizado.
   Esta última opción debe ofrecer después `Volver a incluir hoy`.

## Regresiones de este checkpoint de estabilidad

### Actualización PWA desde una caché antigua

1. Con la aplicación servida por HTTP y el worker v9 controlando el mismo
   origen, abrir las herramientas del navegador y conservar una caché
   `aurum-fit-shell-v9` con la copia antigua de `index.html`, estilos, scripts y
   catálogo.
2. Recargar con conexión y comprobar que la interfaz actual se muestra tras la
   activación del worker nuevo, sin mezclar recursos antiguos y nuevos.
3. En `Application > Cache Storage`, verificar que solo queda
   `aurum-fit-shell-v<versión actual de SHELL_VERSION>` y que la caché v9 ha
   sido eliminada al activarse el worker nuevo.
4. Cortar la conexión, recargar y comprobar que la interfaz actual sigue
   disponible desde la caché, sin mezclar los archivos versionados antiguos.

La nueva precarga usa URLs versionadas y se escribe en una caché nueva antes de
activar el worker. Tras `clients.claim()`, el worker navega una vez las ventanas
que ya estaban abiertas; así no depende de que el código antiguo capture
`controllerchange`. El documento se solicita primero a la red para no mostrar
una interfaz vieja; si no hay conexión se usa el `index.html` versionado de la
caché activa. El catálogo también se pide con la misma versión, por lo que el
catálogo deduplicado de 1.317 ejercicios no puede reutilizar una respuesta
antigua.

La versión vive en seis sitios (`SHELL_VERSION` en `service-worker.js`, cuatro
referencias `?v=` en `index.html` y dos en `app.js`). No se tocan a mano:

```bash
node scripts/bump-cache-version.mjs      # sincroniza todo con SHELL_VERSION
node scripts/bump-cache-version.mjs 54   # sube los seis sitios a la v54
```

La prueba `la versión de caché está sincronizada en los seis puntos del shell`
falla si alguno se queda atrás.

### Importación, validación, búsqueda y navegación

- Iniciar una sesión y abrir el selector de ejercicio: sin búsqueda ni filtros,
  debe indicar `1.317 disponibles` sin renderizar una lista completa.
- Buscar `press`: debe mostrar cuatro tarjetas al principio, colocando primero
  los nombres españoles curados. `Ver 4 más` amplía por bloques y `Ver todos`
  revela el total de coincidencias.
- Buscar `pecho` y `bíceps`: deben aparecer resultados por nombre, categoría o
  músculo aunque algunos nombres de ejercicios continúen en inglés.
- Filtrar por categoría, equipo y músculo principal en móvil: no debe aparecer
  desplazamiento horizontal.
- En el editor de rutina, escribir dos o más caracteres: el `datalist` debe
  contener como máximo veinte sugerencias, no los 1.317 ejercicios.

- Pulsar `Importar` con Tab y Espacio/Enter: el control recibe foco visible y
  abre el selector de archivos con un nombre accesible.
- Guardar una serie válida y hacer doble clic en `Guardar serie`: solo debe
  aparecer una serie y mantenerse la confirmación correcta, sin un error falso.
- Guardar una serie válida y después intentar `0` repeticiones: el éxito anterior
  debe sustituirse por un error que indique que las repeticiones deben ser al
  menos 1.
- Buscar `jalon`: debe encontrar `Jalón al pecho en polea`.
- Desde Rutinas o Nutrición, pulsar `Diario`: la URL termina en `#diario`,
  Diario queda activo y el resto de paneles deja de mostrarse.

### Diario, rutina del día e historial por ejercicio

1. A 390 px de ancho, comprobar que la fecha, el anillo y las tarjetas de
   calorías/pasos no generan desplazamiento horizontal.
2. Asignar una rutina al día actual y comprobar que `Plan de hoy` muestra su
   nombre y ejercicios. Pulsar `Empezar entrenamiento`: debe abrir exactamente
   ese día de esa rutina.
3. En `Diario reciente`, abrir un día con datos: el panel debe mostrar métricas,
   nutrición, plan previsto y cada sesión con todas sus series, tipos y notas.
4. En el detalle de una rutina, pulsar el mismo día de repetición dos veces:
   la primera lo desasigna y la segunda lo vuelve a asignar, siempre que no lo
   ocupe otra rutina.
5. Guardar una serie y pulsar `Duplicar`: debe aparecer una copia independiente
   con el mismo peso, repeticiones, RIR, tipo y nota.
6. En un ejercicio abierto, cambiar entre `Historial`, `Actual` y `Progreso`:
   Historial muestra todas las sesiones anteriores inmutables; Actual conserva
   el formulario y las series de hoy; Progreso muestra el gráfico del ejercicio.

### Confirmaciones accesibles (QA-A11Y-001)

1. Iniciar una sesión, guardar una serie y pulsar `Borrar`.
2. Comprobar que aparece la confirmación propia de la aplicación, no la del
   navegador, con título, mensaje y los botones `Cancelar` y `Borrar`.
3. Sin tocar el ratón, pulsar `Tab` varias veces: el foco debe alternar solo
   entre `Cancelar` y `Borrar`, sin salir a la página de detrás. Con
   `Mayúsculas + Tab` debe recorrerlos en sentido contrario.
4. Pulsar `Escape`: la confirmación se cierra, la serie sigue existiendo y el
   foco vuelve al botón `Borrar` de esa serie.
5. Repetir y pulsar fuera de la caja: debe comportarse como `Cancelar`.
6. Repetir y confirmar: la serie se borra y sigue apareciendo `Deshacer`.
7. Comprobar que el fondo no se desplaza mientras la confirmación está abierta.
8. Con un lector de pantalla, comprobar que el diálogo se anuncia con su título
   y su mensaje al abrirse.
9. Repetir el paso 1 en `Descartar sesión`, `Finalizar entrenamiento`, `Quitar
   ejercicio`, `Eliminar rutina`, `Borrar comida`, `Cargar demo`, `Quitar demo`
   e `Importar`: ninguna debe abrir el diálogo del navegador.

### Instalación offline con el catálogo caído (QA-PWA-002)

1. Servir la aplicación y, en `Application > Service Workers`, desinstalar el
   worker y vaciar las cachés.
2. En `Network`, bloquear la petición de `data/exercises.es.json`.
3. Recargar y comprobar que el worker se instala y activa igualmente.
4. En `Cache Storage`, verificar que están los siete archivos del shell y que el
   catálogo no está.
5. Cortar la conexión y recargar: la aplicación debe abrirse offline. El
   catálogo puede quedarse sin resultados, pero la sesión, el diario y las
   rutinas guardadas deben seguir disponibles.
6. Restaurar la conexión y recargar: el catálogo vuelve a estar disponible.

Si en cambio se bloquea un archivo del shell (`app.js`, `styles.css`,
`core.js`...), la instalación debe fallar: el shell es obligatorio y una PWA a
medias sería peor que ninguna.

### Aviso de revisión profesional (QA-CONTENT-001)

1. Abrir el selector de ejercicio y buscar un ejercicio importado del dataset.
2. Comprobar que su tarjeta muestra `Sin revisión profesional todavía`. Hoy el
   importador marca todo el dataset como `pending_professional_review`, así que
   el aviso debe aparecer en todas las tarjetas del catálogo.
3. Comprobar que los ejercicios personales no pasan por esta lista y, por tanto,
   nunca llevan el aviso. Cuando una entrada del dataset deje de estar
   pendiente, su tarjeta debe dejar de mostrarlo.
4. Abrir `Ver indicaciones en español`: debe seguir apareciendo la advertencia
   de que el texto no es consejo médico.

### Exportación (QA-EXPORT-001)

1. Pulsar `Exportar`.
2. Confirmar que el navegador inicia una descarga con nombre
   `aurum-fit-v2-AAAA-MM-DD.json`.
3. Abrir el archivo descargado: debe ser JSON válido y contener las claves
   `schemaVersion`, `training` y `legacy`, con el estado visible antes de
   exportar.

La implementación no se modifica en este incremento: la prueba automatizada de
contrato verifica el `Blob` JSON, el nombre de archivo y el disparo de
`link.click()`. La descarga real debe confirmarse en el navegador durante la
regresión independiente.
