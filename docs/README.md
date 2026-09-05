# Documentación de Aurum Fit

Qué es cada documento y cuándo hay que tocarlo. Si al terminar un incremento no
sabes en cuál escribir, probablemente el incremento no está cerrado.

## Cómo funciona el producto

| Documento | Qué contiene | Cuándo se actualiza |
|---|---|---|
| `MODELO_LOCAL_V2.md` | La estructura de los datos y las reglas que nunca se rompen: rutina mutable, sesión histórica, serie como unidad mínima | Al cambiar la forma del estado o añadir una regla de integridad |
| `MAPA_MUSCULAR.md` | El mapa muscular entero: vocabulario de 21 regiones, reparto directo/secundario, la figura y su licencia, color y accesibilidad | Al tocar el mapa, su vocabulario o su figura |
| `IMPORTACION_CATALOGO.md` | De dónde sale el catálogo de 1.317 ejercicios y qué se hizo con él | Al reimportar o ampliar el catálogo |

## Cómo se ve y por qué

| Documento | Qué contiene | Cuándo se actualiza |
|---|---|---|
| `SISTEMA_VISUAL.md` | Tokens, componentes reutilizables, reglas de color y las del tema claro | Al añadir un componente o cambiar la paleta |
| `DECISIONES_UX.md` | Decisiones de uso que ya son nuestras, sus límites y las preguntas abiertas | Al cerrar o abrir una decisión de experiencia de uso |
| `REFERENCIA_BRENZO.md` | La app de referencia: qué hace, qué tomamos, qué descartamos y por qué | Al estudiar una función nueva de la referencia |

## Cómo se comprueba

| Documento | Qué contiene | Cuándo se actualiza |
|---|---|---|
| `PRUEBAS_MANUALES.md` | Los recorridos que hay que hacer a mano, con su identificador (QA-...) | Al añadir una función o corregir un fallo que las pruebas automáticas no cubren |

## Fuera de `docs/`

- `README.md`: qué es la app, qué hace hoy y cómo se ejecuta.
- `IDEAS_APARCADAS.md`: lo que se decidió **no** hacer todavía y con qué
  condición se retomaría. Es tan importante como lo hecho: evita rediscutir.
- `THIRD_PARTY_NOTICES.md`: licencias de terceros. Es obligatorio, no
  informativo, y hay pruebas que fallan si se vacía.
- `CLAUDE.md`: las reglas que sigue cualquier agente que trabaje en este
  repositorio.

## Reglas de la propia documentación

- **Un tema, un documento.** Si dos archivos explican lo mismo, se fusionan. Ya
  pasó con las dos notas de Brenzo, que repetían tabla y conclusiones.
- **No se acumulan versiones.** Cuando algo cambia, se reescribe el documento y
  se explica por qué cambió; no se deja el apartado viejo debajo del nuevo.
- **Se registra el porqué, no solo el qué.** El código ya dice qué hace. La
  documentación existe para no repetir discusiones cerradas.
- **Cada documento lleva su fecha de última revisión.**
