// Comprueba el contraste de la paleta del tema claro.
//
// El tema claro no es el oscuro con menos brillo: son sus propios tonos. Y la
// trampa concreta que se coló una vez es que el mismo color sirva de relleno y
// de texto. Sobre el lienzo claro, el tono de relleno se queda en 4,15:1 como
// texto, así que hay dos tokens: `accent` rellena y `accent-ink` escribe.
//
// Los colores de rutina son la otra trampa: los del modo oscuro son neones
// pensados sobre negro y sobre blanco caen a 1,2:1, y con ellos se pinta el
// nombre del plan del día y los puntos del calendario.
//
// Uso: node scripts/check-theme-contrast.mjs

const CANVAS = "#e6ece0";
const SURFACE = "#ffffff";

function luminance(hex) {
  const value = hex.replace("#", "");
  const channel = (index) => {
    const raw = parseInt(value.slice(index * 2, index * 2 + 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

export function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

// Los mismos valores que lightAccentPalettes en app.js y que los bloques
// :root[data-theme="light"] de styles.css.
export const LIGHT_THEME = {
  canvas: CANVAS,
  surface: SURFACE,
  // accent rellena (texto blanco encima); ink escribe sobre el lienzo.
  accents: {
    lime: { accent: "#4d7c0f", ink: "#3d6408" },
    orange: { accent: "#b45309", ink: "#92400e" },
    blue: { accent: "#0369a1", ink: "#075985" },
    violet: { accent: "#6d28d9", ink: "#5b21b6" },
    red: { accent: "#be123c", ink: "#9f1239" },
    steel: { accent: "#475569", ink: "#334155" },
  },
  routine: {
    lime: "#3d6408", orange: "#92400e", blue: "#0369a1",
    violet: "#6d28d9", red: "#be123c", steel: "#475569",
  },
  ink: "#11160f",
  inkSoft: "#55614f",
  danger: "#b3261e",
};

export function checkLightTheme() {
  const problemas = [];
  const exigir = (nombre, fg, bg, minimo) => {
    const r = contrast(fg, bg);
    if (r < minimo) problemas.push(`${nombre}: ${r.toFixed(2)}:1 (mínimo ${minimo})`);
  };

  Object.entries(LIGHT_THEME.accents).forEach(([nombre, { accent, ink }]) => {
    exigir(`texto blanco sobre relleno ${nombre}`, "#ffffff", accent, 4.5);
    exigir(`texto de acento ${nombre} sobre el lienzo`, ink, CANVAS, 4.5);
    exigir(`texto de acento ${nombre} sobre tarjeta`, ink, SURFACE, 4.5);
  });

  Object.entries(LIGHT_THEME.routine).forEach(([nombre, color]) => {
    exigir(`color de rutina ${nombre} sobre tarjeta`, color, SURFACE, 4.5);
    exigir(`color de rutina ${nombre} sobre el lienzo`, color, CANVAS, 4.5);
  });

  exigir("texto principal", LIGHT_THEME.ink, SURFACE, 4.5);
  exigir("texto secundario sobre tarjeta", LIGHT_THEME.inkSoft, SURFACE, 4.5);
  exigir("texto secundario sobre el lienzo", LIGHT_THEME.inkSoft, CANVAS, 4.5);
  exigir("texto de peligro sobre el lienzo", LIGHT_THEME.danger, CANVAS, 4.5);
  return problemas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problemas = checkLightTheme();
  console.log(`Lienzo ${CANVAS} · tarjeta ${SURFACE}`);
  console.log(`Elevación tarjeta sobre lienzo: ${contrast(SURFACE, CANVAS).toFixed(2)}:1\n`);
  Object.entries(LIGHT_THEME.accents).forEach(([nombre, { accent, ink }]) => {
    console.log(`  ${nombre.padEnd(7)} relleno ${accent} ${contrast("#ffffff", accent).toFixed(2)}:1 · texto ${ink} ${contrast(ink, CANVAS).toFixed(2)}:1`);
  });
  if (problemas.length) {
    console.error("\nPROBLEMAS:");
    problemas.forEach((p) => console.error(`  ${p}`));
    process.exit(1);
  }
  console.log("\nLa paleta del tema claro cumple el contraste.");
}
