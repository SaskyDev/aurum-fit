# Brenzo, la referencia

Aurum Fit no es una copia de Brenzo y no va a serlo: para eso ya está Brenzo.
Este documento existe para entender **por qué** funciona lo que funciona en ella
y decidir con criterio qué tomamos, qué adaptamos y qué descartamos.

Sustituye a dos documentos anteriores que se solapaban, `REFERENCIAS_UX.md` (su
apartado de Brenzo) y `REFERENCIA_VIDEO_BRENZO.md`, que repetían la misma tabla
de contraste y la misma lista de cosas que no copiamos. Las decisiones de
experiencia de uso **propias** viven ahora en `DECISIONES_UX.md`.

Actualizado: 5 de septiembre de 2026.

## Brenzo

Fuentes oficiales:

- https://brenzo.app/ y https://brenzo.app/ayuda
- https://apps.apple.com/ca/app/brenzo-workout-planner/id6770596076
- https://play.google.com/store/apps/details?id=app.brenzo

Alex confirmó el 5 de septiembre de 2026 que **el mapa muscular y la pantalla de
entrenamiento de Aurum Fit nacen de lo que vio en Brenzo**, y que el listón de
calidad de esa app es el mínimo aceptable. La instrucción, repetida, es que
Aurum Fit no sea una copia: para eso ya está Brenzo.

> Nota sobre esta revisión: el entorno de trabajo tiene la salida de red
> restringida y no permite abrir `brenzo.app` ni las fichas de las tiendas. Lo
> que sigue procede de las descripciones oficiales de las tiendas recuperadas
> mediante búsqueda, no de uso directo de la app. Hay que tratarlo como una
> lectura de segunda mano y corregirlo cuando se pueda ver de primera mano.

Patrones observados que encajan con Aurum Fit:

- uso cómodo con una mano y controles grandes durante el entrenamiento;
- confirmar una serie con muy pocos pasos;
- mostrar o reutilizar como referencia los valores del entrenamiento anterior;
- colocar el temporizador de descanso dentro del flujo del ejercicio;
- separar creación de rutinas, entrenamiento activo, historial y progreso;
- funcionamiento local/offline para no depender de cobertura en el gimnasio.

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

## Tabla de funciones, una a una

| Función de Brenzo | Estado en Aurum Fit |
|---|---|
| Volumen y distribución del trabajo por grupo muscular | **Hecho** — mapa muscular del Diario (`MAPA_MUSCULAR.md`) |
| Registrar series, repeticiones, peso, descanso y notas | **Hecho** |
| El temporizador de descanso arranca al completar la serie | **Hecho** el 5/9/2026, con interruptor propio en Ajustes |
| Descanso por defecto configurable | **Hecho**. Existía, pero el temporizador lo ignoraba; corregido a la vez |
| Omitir un ejercicio hoy y volver a incluirlo | **Hecho**, con ese mismo nombre: `Hoy no` |
| Cambiar un ejercicio solo para hoy | **Hecho**, sin tocar la rutina original |
| Confirmación al descartar el entrenamiento | **Hecho**, con nuestro diálogo accesible |
| Buscador y filtros de ejercicio | **Hecho**: nombre, categoría, equipo y músculo |
| Historial, progresión de fuerza y volumen semanal | **Hecho** |
| Tema claro y oscuro | **Hecho**, con tres modos y oscuro por defecto |
| Recordar peso y repeticiones del entrenamiento anterior | **Parcial y a propósito**: se sugieren en el campo, no se rellenan solos |
| Rutinas por objetivo y splits (PPL, Torso/Pierna, Full Body) | **Parcial**: las rutinas son libres, sin plantillas |
| Más de 400 ejercicios con animaciones | **Parcial**: 1.317 ejercicios, sin animaciones (aparcado por licencias) |
| Aviso de récord personal al superarlo | **Falta**: no existe el concepto de récord en el modelo |
| `Body Rank`: te compara con personas de tu edad, sexo y peso | **Descartado**, ver abajo |
| Consejos personalizados de `Brenzo AI` | **Descartado**, ver abajo |
| Entrenamiento nuevo cada día y programas guiados | Fuera del alcance actual |

## Lo que falta y merece estudio

- **Contexto de entreno**: dónde entrenas, tu material y tus lesiones, usados
  para filtrar y sugerir alternativas. Es la idea más potente de sus Ajustes y
  la que más cambiaría el producto: convierte sustituir un ejercicio en algo
  informado en vez de en una búsqueda a ciegas.
- **`RÉCORD` como dato de primera fila** junto a la última sesión. Enlaza con
  los logros ya decididos y hoy no existe ni en el modelo.
- **Modelo 3D con los músculos resaltados por ejercicio.** Es el corazón visual
  de su pantalla. Nuestro mapa resuelve la pregunta agregada ("qué me estoy
  dejando"), no la del ejercicio concreto. Sujeto a la misma decisión pendiente
  de licencias que las animaciones.
- **Carrusel de píldoras** con el orden de los ejercicios y navegación directa;
  hoy el acordeón obliga a desplazarse.
- **Cronómetro general de la sesión** siempre visible en la barra superior.
- **Barra flotante de descanso** con `Saltar`, en lugar del temporizador dentro
  del acordeón.
- **Guía de ejecución** con pasos numerados, patrón de movimiento y nivel.
  Tenemos las indicaciones del dataset, sin estructurar.
- **Resumen de la rutina** con total de ejercicios, sets y duración estimada.
- **Avance automático** al siguiente ejercicio tras eliminar u omitir uno.
- **Ajustes de sesión**: sonidos, vibración háptica y mantener la pantalla
  activa. Los dos últimos son triviales en una PWA (`navigator.vibrate`,
  `Screen Wake Lock`) y encajan con entrenar con el móvil en un banco.
- **Unidades en libras.**

## Descartado a propósito

- **`Body Rank`.** Comparar tu condición con la de personas de tu edad, sexo y
  peso exige datos poblacionales de referencia que no tenemos, y cuentas y
  backend que no existen. Fabricar ese percentil sería exactamente la métrica
  inventada que el resto del producto evita. Si algún día se hace, será con una
  fuente citable, no con una fórmula nuestra.
- **Consejos automáticos de entrenamiento.** Rozan el consejo de salud. Sin
  revisión profesional y sin límites claros, no.
- **Identidad visual, iconos, ilustraciones, textos y composición.** Ninguna
  captura ni recurso de Brenzo entra en el repositorio. El modelo 3D, si algún
  día se hace, será con contenido propio o con licencia comercial verificable.

## Lo que estamos tomando

1. ~~Que el descanso arranque al guardar la serie.~~ **Hecho.** Las capturas de
   Ajustes mostraron que en Brenzo es un interruptor (`Timer automático · Inicia
   descanso al completar set`), no una imposición, así que aquí también lo es,
   encendido por defecto. Arranca con cualquier serie nueva, incluidas
   calentamiento y aproximación, porque también se descansa entre ellas;
   corregir una serie ya guardada no lo dispara.
2. **El récord personal como hecho, no como insignia.** Encaja con los logros ya
   decididos: superar tu mejor peso es un dato recalculable desde el historial,
   no una recompensa inventada.
3. **El ejercicio de referencia por grupo muscular** de su pantalla de logros
   ("Pecho · ref. Press de banca"): da un siguiente paso concreto en lugar de
   solo señalar el hueco.
4. **Plantillas de split** (PPL, Torso/Pierna, Full Body) como punto de partida
   al crear una rutina, sin impedir la rutina libre.
