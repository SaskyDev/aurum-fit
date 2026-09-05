# Referencia: sesión de entrenamiento de Brenzo

Fecha: 5 de septiembre de 2026.

Alex grabó su pantalla usando Brenzo durante un entrenamiento y describió el
vídeo paso a paso, además de enviar dos capturas de la pantalla de Ajustes. Este
documento conserva esa descripción porque **el vídeo no está en el repositorio**
y el entorno de trabajo no puede abrir `brenzo.app` ni las fichas de las
tiendas.

> Es material de referencia para entender el nivel al que aspira Aurum Fit. La
> instrucción de Alex, repetida, es que **no sea una copia**: no se replican
> identidad visual, iconos, textos ni composición. Lo que se estudia son
> decisiones de flujo. Ver `docs/REFERENCIAS_UX.md`.

## Lo que se ve en el vídeo

Grabación vertical de móvil, modo oscuro, acentos verde neón, en español.

### Estructura de la vista de ejercicio

- **Barra superior**: botón de minimizar, cronómetro general de la sesión
  (`0 28s`), botón de cerrar, y un **carrusel horizontal de píldoras** con el
  orden de los ejercicios de la rutina.
- **Centro**: modelo 3D de un hombre ejecutando el ejercicio, con los músculos
  implicados resaltados en rojo y naranja.
- **Cabecera**: título grande y, debajo, grupo muscular y material
  (`CUÁDRICEPS • MANCUERNA`).
- **Cuatro acciones**: `Guía` (interrogación), `Nota` (lápiz), `Cambiar` (flecha
  circular, resaltado en verde) y `Hoy no` (cruz).
- **Historial**: `RÉCORD` (con estado "Sin récord aún") y `ÚLTIMA` sesión
  (`0 kg x 15 reps · Hace 3 días`).
- **Registro**: tabla con columnas `SET`, `PESO (KG)` y `REPS`, y botones para
  añadir series y navegar entre ejercicios (`Anterior` / `Siguiente`).

### Cronología

1. **00:00-00:18 · Registrar una serie.** Toca la fila del `SET 1`. Se abre un
   teclado numérico en la mitad inferior. Introduce el peso en una pestaña,
   cambia a la pestaña de repeticiones, introduce el valor y pulsa `Hecho`. La
   fila se marca con un **check verde** y aparece de inmediato una **barra
   flotante amarilla abajo**: `Descanso`, cuenta atrás desde `1:15` y botón
   `Saltar`.
2. **00:18-00:27 · Guía de ejecución.** Panel inferior con el modelo 3D, una
   descripción y cuatro recuadros: `PRINCIPAL`, `EQUIPO`, `PATRÓN` y `NIVEL`.
   Debajo, seis pasos numerados y una sección de `MÚSCULOS`.
3. **00:27-00:32 · Nota.** Cuadro de texto `NOTA DEL EJERCICIO` con teclado.
   Cancela sin escribir.
4. **00:32-00:43 · Cambiar ejercicio.** Pantalla con buscador, categorías
   (`Mi material`, `Todos`, `Pecho`, `Filtros`) y cuadrícula de alternativas.
   `Filtros` abre un panel con etiquetas de `MATERIAL` y `PATRÓN DE MOVIMIENTO`.
   Cancela.
5. **00:43-00:51 · Omitir y eliminar.** `Hoy no` sustituye la tabla por
   `Omitido hoy` con un botón `Volver a incluir`. Aparece una papelera; al
   pulsarla, confirmación `Eliminar ejercicio` con botón rojo.
6. **00:51-01:05 · Recorrer la rutina.** Al eliminar, la app **avanza sola** al
   siguiente ejercicio. Navega por las píldoras superiores sin registrar nada y
   llega a un **resumen de la rutina**: `Pierna`, 7 ejercicios, 24 sets, 78 m,
   con los ejercicios en tarjetas.
7. **01:05-01:13 · Salir.** La `X` abre `Descartar entrenamiento · ¿Descartar
   este entrenamiento?` con `Seguir` (blanco) y `Descartar` (rojo).

## Lo que se ve en las capturas de Ajustes

- **Unidades de peso**: `Kilogramos` / `Libras`.
- **Descanso por defecto**: `90 seg`.
- **Timer automático**: interruptor, `Inicia descanso al completar set`.
- **Durante la sesión**: `Sonidos`, `Vibración háptica`, `Mantener pantalla
  activa`, los tres como interruptores.
- **Tu contexto de entreno**: `Dónde entrenas` (Gimnasio grande), `Tu material`
  (15 elementos seleccionados), `Lesiones y molestias` (Ninguna).
- **Apariencia**: tema `Auto` / `Claro` / `Oscuro`, idioma `Español` /
  `English`, y `Personalización` marcada como PRO.
- **Datos y dispositivos**: `Apple Watch` y `Copia de seguridad` (PRO).

## La pantalla de logros

Alex envió además una captura de la pantalla `Logros` de Brenzo:

- Cabecera `TUS MEDALLAS · Logros`.
- Tarjeta `RANGO PREDICHO` con el estado `Sin clasificar` y el texto "Registra
  entrenos completos para clasificar tus grupos musculares", más un pentágono
  vacío como insignia.
- **Dos figuras anatómicas facetadas**, frontal y posterior, dibujadas con
  líneas blancas sobre negro, con cada vientre muscular delineado.
- Lista `POR GRUPO MUSCULAR`: cada grupo con su estado (`Sin dato`) y un
  ejercicio de referencia (`Pecho · ref. Press de banca`).

De aquí sale el rediseño de nuestro mapa: la primera versión usaba cápsulas
redondeadas y no distinguía el cuádriceps del aductor. La segunda es anatómica y
facetada, con dibujo propio (`docs/MAPA_MUSCULAR.md`).

El `RANGO PREDICHO` es `Body Rank` otra vez, y sigue descartado por la misma
razón. La idea que **sí** merece copiarse de esa pantalla es el **ejercicio de
referencia por grupo muscular**: da un siguiente paso concreto en lugar de solo
señalar el hueco.

## Contraste con Aurum Fit

### Ya lo tenemos, de otra forma

| En el vídeo | En Aurum Fit |
|---|---|
| Descanso automático al completar el set | **Hecho el 5/9/2026**, con interruptor propio en Ajustes |
| Descanso por defecto configurable | Existía, pero el temporizador lo ignoraba; corregido a la vez |
| `Hoy no` con `Volver a incluir` | Mismo comportamiento, con ese mismo nombre |
| `Cambiar` ejercicio solo para hoy | Mismo comportamiento, sin tocar la rutina original |
| Confirmación al descartar el entrenamiento | Mismo flujo, con el diálogo accesible propio |
| Última sesión como referencia | Se muestra como sugerencia en el campo, no rellena |
| Buscador y filtros de ejercicio | Buscador con filtros de categoría, equipo y músculo |
| Tema claro / oscuro | Ajuste de apariencia con tres modos |

### Lo que no tenemos y merece estudio

- **Modelo 3D con los músculos resaltados por ejercicio.** Es el corazón visual
  de su pantalla. Nuestro mapa muscular resuelve la pregunta agregada ("qué me
  estoy dejando"), no la del ejercicio concreto. Está sujeto a la misma
  decisión pendiente sobre licencias y peso que las animaciones.
- **Carrusel de píldoras** con el orden de los ejercicios y navegación directa.
  Hoy el acordeón obliga a desplazarse.
- **Cronómetro general de la sesión** siempre visible en la barra superior.
- **`RÉCORD` como dato de primera fila** junto a la última sesión. Enlaza con los
  logros ya decididos.
- **Barra flotante de descanso** con `Saltar`, en lugar del temporizador dentro
  del acordeón.
- **Guía de ejecución** con pasos numerados, patrón de movimiento y nivel.
  Tenemos las indicaciones del dataset, sin estructurar en pasos ni patrón.
- **Resumen de la rutina** con total de ejercicios, sets y duración estimada.
- **Avance automático** al siguiente ejercicio tras eliminar u omitir uno.
- **Contexto de entreno**: dónde entrenas, tu material y tus lesiones, usados
  para filtrar y sugerir alternativas. Es la idea más interesante de las
  capturas y la que más cambiaría el producto: convierte la sustitución de un
  ejercicio en algo informado en vez de en una búsqueda a ciegas.
- **Ajustes de sesión**: sonidos, vibración háptica y mantener la pantalla
  activa. Los dos últimos son triviales en una PWA (`navigator.vibrate`,
  `Screen Wake Lock`) y encajan con entrenar con el móvil en un banco.
- **Unidades en libras.**

### Lo que no vamos a copiar

Además de `Body Rank` y los consejos automáticos, ya descartados en
`docs/REFERENCIAS_UX.md`: ninguna captura, icono, ilustración, texto ni
composición de Brenzo entra en el repositorio. El modelo 3D, si algún día se
hace, será con contenido propio o con licencia comercial verificable.
