# Reglas de trabajo en Aurum Fit

Estas reglas valen para **cualquier agente o persona** que toque este
repositorio: Claude, Codex o quien venga después. No están escritas para una
herramienta concreta, y si un informe antiguo dice "Codex debe...", léelo como
"quien trabaje aquí debe...".

Alex es el dueño del producto y decide. Estas reglas recogen lo ya decidido para
no volver a discutirlo cada vez.

## El producto

PWA local-first en español, sin cuentas y sin backend. Todo vive en el navegador
del usuario. No hay dependencias de ejecución: HTML, CSS y JavaScript a pelo.

```bash
python3 -m http.server 8000                 # servir la app
node --test                                 # todas las pruebas
node scripts/check-muscle-palette.mjs       # escala del mapa y daltonismo
node scripts/check-theme-contrast.mjs       # contraste del tema claro
node scripts/bump-cache-version.mjs 66      # subir la versión de caché
```

## Reglas que no se negocian

**No se inventan métricas.** Si un dato no se puede recalcular desde el historial
del usuario, no se muestra. Nada de porcentajes de progreso estimados, de
coeficientes de activación muscular ni de compararse con "gente de tu edad": eso
exigiría datos que no tenemos. Cuando falta información, **se declara el hueco**
en lugar de rellenarlo con una suposición.

**Los límites de salud son explícitos.** La app registra y ordena lo que el
usuario hace. No diagnostica, no previene lesiones y no da consejo médico. Los
avisos van donde se ve el dato, no escondidos en Ajustes.

**El historial es inmutable.** La rutina es un plan que cambia; la sesión es un
hecho que ya ocurrió. Editar el plan nunca puede alterar lo que se registró.

**Funciona sin conexión.** El gimnasio no tiene cobertura. Lo que el mapa o el
historial necesiten para pintarse tiene que estar en el shell precargado, no
resolverse contra un archivo que quizá no esté.

**Nada de terceros sin licencia comprobable.** Ni imágenes, ni iconos, ni datos,
ni figuras. Lo que entra se anota en `THIRD_PARTY_NOTICES.md` con su licencia
completa, y hay pruebas que fallan si esa atribución desaparece. Ojo con las
licencias copyleft: incorporar código AGPL obligaría a publicar la app entera
bajo AGPL.

**No se copia la app de referencia.** De Brenzo se estudian decisiones de flujo.
No entran su identidad visual, sus iconos, sus textos ni su composición.

## Cómo se trabaja

**Verifica en el navegador, no solo con pruebas.** Las pruebas de este
repositorio son en buena parte inspección del código fuente: comprueban que una
regla siga escrita, no que se vea bien. Antes de dar algo por hecho, ábrelo a
390 px de ancho, en tema claro y en oscuro.

**Las pruebas nuevas tienen que poder fallar.** Cámbiale el valor a lo que
compruebas y confirma que la prueba se pone roja. Una prueba que pasa siempre no
protege nada.

**Sube la versión de caché** en cualquier cambio de `index.html`, `styles.css`,
`app.js`, `core.js`, `body-paths.js` o del catálogo. Se hace con el script, no a
mano, y hay una prueba que falla si alguna referencia se queda atrás.

**Comenta el porqué, no el qué.** El código ya dice lo que hace. Los comentarios
existen para lo que no se deduce leyéndolo: qué se descartó, qué bug concreto
evita esta línea, qué pasa si alguien la "simplifica".

**Documenta al cerrar, no al final.** Cada incremento actualiza el documento que
le toca (ver `docs/README.md`). Si algo cambió, se reescribe el documento; no se
deja la versión vieja debajo de la nueva.

**Registra lo aparcado.** Lo que se decide no hacer va a `IDEAS_APARCADAS.md`
con la condición que lo desbloquearía. Evita rediscutir lo mismo dentro de dos
meses.

## Git

Se trabaja en la rama que Alex indique y se hace push ahí. **`main` publica**: el
workflow de GitHub Pages despliega en cada push a `main`, así que fusionar es
publicar, y no se fusiona sin que Alex lo pida.

Los mensajes de commit explican **por qué**, no solo qué. Si el commit arregla un
fallo, cuenta cómo se reprodujo.
