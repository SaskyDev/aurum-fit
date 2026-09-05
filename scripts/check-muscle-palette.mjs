// Comprueba la escala de color del mapa muscular.
//
// El mapa usa el color para codificar una cantidad, así que la escala tiene dos
// obligaciones que no se pueden verificar a ojo:
//
//   1. la luminosidad tiene que crecer (o decrecer) de forma monótona, porque es
//      lo que hace legible una escala secuencial en escala de grises y con
//      daltonismo;
//   2. dos tramos contiguos tienen que separarse lo suficiente en visión normal,
//      deuteranopía y tritanopía.
//
// Los umbrales y el método (ΔE en OKLab ×100, simulación de dicromacia de
// Brettel/Viénot) siguen la guía de visualización de datos con la que se diseñó
// la paleta. Ver docs/MAPA_MUSCULAR.md.
//
// Uso: node scripts/check-muscle-palette.mjs

const UMBRAL_NORMAL = 15;
const UMBRAL_CVD = 8;

function hexToLinear(hex) {
  const value = hex.replace("#", "");
  const channel = (index) => {
    const raw = parseInt(value.slice(index * 2, index * 2 + 2), 16) / 255;
    return raw <= 0.04045 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  return [channel(0), channel(1), channel(2)];
}

function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

// Simulación de daltonismo con las matrices de Machado, Oliveira y Fernandes
// (2009) a severidad 1, aplicadas sobre RGB lineal. Es el mismo método que usa
// el validador con el que se diseñó la paleta, para que ambos den los mismos
// números y esta comprobación no contradiga a la guía.
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900]],
};

function simulate(linear, type) {
  return MACHADO[type].map((row) => row.reduce((total, factor, index) => total + factor * linear[index], 0));
}

function deltaE(a, b, type = null) {
  const prepare = (hex) => {
    const linear = hexToLinear(hex);
    return linearToOklab(type ? simulate(linear, type) : linear);
  };
  const [l1, a1, b1] = prepare(a);
  const [l2, a2, b2] = prepare(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
}

export function lightness(hex) {
  return linearToOklab(hexToLinear(hex))[0];
}

export function checkRamp(name, steps) {
  const problemas = [];
  const luces = steps.map(lightness);
  const creciente = luces.every((value, index) => index === 0 || value > luces[index - 1]);
  const decreciente = luces.every((value, index) => index === 0 || value < luces[index - 1]);
  if (!creciente && !decreciente) {
    problemas.push(`${name}: la luminosidad no es monótona (${luces.map((v) => v.toFixed(3)).join(" → ")})`);
  }
  for (let index = 1; index < steps.length; index += 1) {
    const par = [steps[index - 1], steps[index]];
    const normal = deltaE(par[0], par[1]);
    if (normal < UMBRAL_NORMAL) {
      problemas.push(`${name}: ${par.join(" ↔ ")} solo se separan ΔE ${normal.toFixed(1)} en visión normal (mínimo ${UMBRAL_NORMAL})`);
    }
    ["protan", "deutan", "tritan"].forEach((type) => {
      const cvd = deltaE(par[0], par[1], type);
      if (cvd < UMBRAL_CVD) {
        problemas.push(`${name}: ${par.join(" ↔ ")} solo se separan ΔE ${cvd.toFixed(1)} en ${type} (mínimo ${UMBRAL_CVD})`);
      }
    });
  }
  return problemas;
}

// Los mismos valores que styles.css. Si se tocan allí, hay que tocarlos aquí:
// la prueba "la escala del mapa muscular sigue siendo legible" compara ambos.
export const MUSCLE_RAMPS = {
  oscuro: ["#232c25", "#3d5a2a", "#79ab3f", "#c7f464"],
  claro: ["#e2e7dd", "#9cc93f", "#5f8a1a", "#365008"],
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const problemas = Object.entries(MUSCLE_RAMPS).flatMap(([name, steps]) => checkRamp(name, steps));
  Object.entries(MUSCLE_RAMPS).forEach(([name, steps]) => {
    console.log(`${name}: ${steps.join(" ")}`);
    console.log(`  luminosidad ${steps.map((hex) => lightness(hex).toFixed(3)).join(" → ")}`);
    for (let index = 1; index < steps.length; index += 1) {
      const par = [steps[index - 1], steps[index]];
      console.log(`  ${par.join(" ↔ ")}  normal ${deltaE(...par).toFixed(1)}`
        + `  protan ${deltaE(...par, "protan").toFixed(1)}`
        + `  deutan ${deltaE(...par, "deutan").toFixed(1)}`
        + `  tritan ${deltaE(...par, "tritan").toFixed(1)}`);
    }
  });
  if (problemas.length) {
    console.error("\nPROBLEMAS:");
    problemas.forEach((problema) => console.error(`  ${problema}`));
    process.exit(1);
  }
  console.log("\nLas dos escalas cumplen monotonía y separación.");
}
