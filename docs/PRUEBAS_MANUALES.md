# Pruebas manuales reproducibles

## Incremento 1: sesión libre y series

1. Ejecutar `python3 -m http.server 8000`.
2. Abrir `http://localhost:8000`.
3. Entrar en `Entreno` y pulsar `Iniciar entrenamiento libre`.
4. Recargar la página: la misma sesión debe seguir visible y en curso.
5. Añadir `Press banca`.
6. Registrar `10` repeticiones, `60` kg y RPE `7`.
7. Editar la serie a `9` repeticiones y `62,5` kg.
8. Borrarla, confirmar y pulsar `Deshacer`.
9. Añadir otra serie y finalizar el entrenamiento.
10. Iniciar otra sesión y volver a añadir `Press banca`.
11. Comprobar que aparece la referencia de la sesión finalizada.

## Casos de error

- Ejercicio vacío o de un carácter: debe explicar el mínimo.
- Repeticiones vacías, decimales, negativas o superiores a 1000: deben rechazarse.
- Peso negativo o superior a 2000: debe rechazarse.
- RPE `0`, `10,2` o `11`: debe rechazarse.
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

Resultado esperado en este checkpoint: 20 pruebas superadas.

## Regresiones de este checkpoint de estabilidad

### Actualización PWA desde una caché antigua

1. Con la aplicación servida por HTTP y el worker v9 controlando el mismo
   origen, abrir las herramientas del navegador y conservar una caché
   `aurum-fit-shell-v9` con la copia antigua de `index.html`, estilos, scripts y
   catálogo.
2. Recargar con conexión y comprobar que la interfaz actual se muestra tras la
   activación del worker nuevo, sin mezclar recursos v9 y v12.
3. En `Application > Cache Storage`, verificar que queda
   `aurum-fit-shell-v12` y que la caché v9 ha sido eliminada al activarse el
   worker nuevo.
4. Cortar la conexión, recargar y comprobar que la interfaz actual sigue
   disponible desde la caché, sin mezclar los archivos versionados antiguos.

La nueva precarga usa URLs versionadas y se escribe en una caché nueva antes de
activar el worker. El documento se solicita primero a la red para no mostrar una
interfaz vieja; si no hay conexión se usa el `index.html?v=12` de la caché activa.
El cliente recarga cuando cambia el controlador. El catálogo también usa
`exercises.es.json?v=12`, por lo que la muestra de 23 ejercicios no puede
reutilizar la respuesta v9 de 24 ejercicios.

### Importación, validación, búsqueda y navegación

- Pulsar `Importar` con Tab y Espacio/Enter: el control recibe foco visible y
  abre el selector de archivos con un nombre accesible.
- Guardar una serie válida y hacer doble clic en `Guardar serie`: solo debe
  aparecer una serie y mantenerse la confirmación correcta, sin un error falso.
- Guardar una serie válida y después intentar `0` repeticiones: el éxito anterior
  debe sustituirse por un error que indique que las repeticiones deben ser al
  menos 1.
- Buscar `jalon`: debe encontrar `Jalón al pecho en polea`.
- Desde `Diario`, pulsar `Aurum Fit, inicio`: la URL termina en `#entreno`, la
  pestaña Entreno queda activa y Diario deja de mostrarse.

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
