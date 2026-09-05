// Genera la figura del mapa muscular: dos cuerpos facetados, frontal y
// posterior, con cada músculo como polígono propio.
//
// Por qué un script y no coordenadas escritas a mano en app.js: la figura son
// más de setenta polígonos y la mitad son el espejo de la otra. Definir solo el
// lado izquierdo y espejar aquí evita que un retoque deje los dos lados
// distintos, y mantiene app.js legible.
//
// Estilo facetado (polígonos rectos) a propósito: se declara como diagrama y no
// finge ser una lámina anatómica, que es justo lo que docs/MAPA_MUSCULAR.md
// exige no prometer. Es dibujo propio; no entra arte de terceros.
//
// Uso:
//   node scripts/generate-muscle-map.mjs           -> imprime el bloque JS
//   node scripts/generate-muscle-map.mjs --json     -> vuelca la geometría
//   node scripts/generate-muscle-map.mjs --check    -> compara con app.js
//
// Lienzo 150 x 280. Eje de simetría en x = 75.

const AXIS = 75;
const mirror = (points) => points.map(([x, y]) => [round(2 * AXIS - x), y]);
const round = (value) => Math.round(value * 10) / 10;
// Un músculo par: el polígono dado y su espejo.
const pair = (points) => [points, mirror(points)];

// --------------------------------------------------------------------------
// Silueta
//
// Contornos, no bloques apilados: el cuerpo tiene cintura en V, los deltoides
// coronan el hombro y las extremidades se afilan hacia muñeca y tobillo. Los
// brazos son contornos aparte porque cuelgan separados del tronco.
// --------------------------------------------------------------------------

const HEAD = [
  [75, 4], [82, 7], [87, 14], [88, 24], [85, 33], [80, 39], [75, 41],
  [70, 39], [65, 33], [62, 24], [63, 14], [68, 7],
];

const TORSO = [
  [75, 39], [85, 44], [96, 51], [105, 60], [108, 72], [104, 88], [99, 98],
  [96, 118], [97, 132], [100, 146], [95, 162], [85, 170], [75, 172],
  [65, 170], [55, 162], [50, 146], [53, 132], [54, 118],
  [51, 98], [46, 88], [42, 72], [45, 60], [54, 51], [65, 44],
];

const ARM_UPPER = [[46, 74], [55, 80], [51, 116], [38, 120], [36, 96], [39, 78]];
const ARM_LOWER = [[38, 120], [51, 118], [46, 150], [41, 174], [28, 172], [30, 146]];
const HAND = [
  [28, 172], [41, 174], [40, 188], [42, 198], [37, 199], [35, 190],
  [34, 200], [29, 200], [28, 190], [25, 197], [21, 194], [22, 182],
];

const THIGH = [[55, 164], [75, 168], [75, 214], [70, 222], [59, 222], [50, 196], [51, 172]];
const SHIN = [[59, 222], [70, 222], [70, 242], [68, 260], [59, 260], [56, 242]];
const FOOT = [[59, 258], [68, 258], [71, 268], [62, 273], [50, 273], [51, 264]];

const silhouette = [
  HEAD, TORSO,
  ...pair(ARM_UPPER), ...pair(ARM_LOWER), ...pair(HAND),
  ...pair(THIGH), ...pair(SHIN), ...pair(FOOT),
];

// --------------------------------------------------------------------------
// Músculos, vista frontal
//
// Vientres afilados, no rectángulos: es lo que separa un mapa anatómico de una
// armadura por placas.
// --------------------------------------------------------------------------

const front = {
  // Esternocleidomastoideo: las dos bandas del cuello hacia el esternón.
  neck: pair([[68, 38], [72, 40], [74, 52], [70, 53], [66, 46]]),
  // Trapecio superior: la rampa del cuello al hombro.
  traps: pair([[66, 42], [74, 46], [74, 55], [55, 60], [50, 55]]),
  // Deltoides: corona el hombro y es el punto más ancho del cuerpo.
  shoulders: pair([[54, 55], [46, 58], [41, 68], [41, 82], [48, 88], [54, 78], [56, 64]]),
  chest: [
    [[56, 61], [74, 58], [74, 72], [55, 75]],
    [[55, 75], [74, 72], [74, 88], [64, 92], [54, 85], [52, 78]],
    ...mirrorAll([
      [[56, 61], [74, 58], [74, 72], [55, 75]],
      [[55, 75], [74, 72], [74, 88], [64, 92], [54, 85], [52, 78]],
    ]),
  ],
  // Serrato: los dedos que asoman bajo el pectoral.
  serratus: [
    [[53, 88], [60, 92], [58, 98], [52, 94]],
    [[54, 99], [61, 102], [59, 108], [53, 105]],
    ...mirrorAll([
      [[53, 88], [60, 92], [58, 98], [52, 94]],
      [[54, 99], [61, 102], [59, 108], [53, 105]],
    ]),
  ],
  abs: absSegments(),
  obliques: pair([[57, 96], [64, 100], [64, 128], [59, 136], [54, 118]]),
  biceps: pair([[43, 78], [53, 82], [49, 112], [41, 114], [39, 94]]),
  forearms: [
    [[34, 124], [46, 126], [42, 150], [33, 148]],
    [[32, 150], [42, 152], [39, 172], [30, 170]],
    ...mirrorAll([
      [[34, 124], [46, 126], [42, 150], [33, 148]],
      [[32, 150], [42, 152], [39, 172], [30, 170]],
    ]),
  ],
  hip_flexors: pair([[63, 146], [74, 148], [74, 162], [65, 160]]),
  abductors: pair([[56, 156], [63, 159], [62, 176], [55, 170]]),
  // Cuádriceps: vasto lateral, recto femoral y vasto medial.
  quads: [
    [[54, 166], [65, 166], [64, 210], [59, 218], [52, 194]],
    [[66, 166], [73, 170], [72, 214], [65, 213]],
    [[70, 194], [75, 196], [74, 220], [69, 217]],
    ...mirrorAll([
      [[54, 166], [65, 166], [64, 210], [59, 218], [52, 194]],
      [[66, 166], [73, 170], [72, 214], [65, 213]],
      [[70, 194], [75, 196], [74, 220], [69, 217]],
    ]),
  ],
  adductors: pair([[71, 168], [75, 170], [75, 196], [69, 192]]),
  tibialis: pair([[62, 230], [69, 232], [68, 256], [62, 256]]),
};

// --------------------------------------------------------------------------
// Músculos, vista posterior
// --------------------------------------------------------------------------

const back = {
  neck: pair([[67, 38], [75, 39], [75, 52], [67, 52]]),
  traps: [
    [[66, 42], [75, 45], [75, 62], [54, 60], [50, 54]],
    [[54, 62], [75, 64], [75, 84], [57, 80]],
    ...mirrorAll([
      [[66, 42], [75, 45], [75, 62], [54, 60], [50, 54]],
      [[54, 62], [75, 64], [75, 84], [57, 80]],
    ]),
  ],
  shoulders: pair([[54, 55], [46, 58], [41, 68], [41, 82], [48, 88], [54, 78], [56, 64]]),
  upper_back: pair([[58, 82], [74, 84], [74, 98], [59, 96]]),
  // Dorsal: el ala que va de la axila a la cintura y hace la V.
  lats: pair([[52, 80], [64, 92], [65, 116], [58, 130], [49, 108], [48, 88]]),
  lower_back: pair([[64, 110], [74, 112], [74, 136], [65, 134]]),
  triceps: pair([[37, 78], [47, 82], [44, 114], [36, 112], [35, 92]]),
  forearms: [
    [[34, 124], [46, 126], [42, 150], [33, 148]],
    [[32, 150], [42, 152], [39, 172], [30, 170]],
    ...mirrorAll([
      [[34, 124], [46, 126], [42, 150], [33, 148]],
      [[32, 150], [42, 152], [39, 172], [30, 170]],
    ]),
  ],
  glutes: pair([[57, 144], [74, 148], [74, 170], [63, 176], [54, 164]]),
  // Isquiotibiales: bíceps femoral por fuera, semitendinoso por dentro.
  hamstrings: [
    [[54, 172], [63, 172], [62, 212], [57, 220], [51, 198]],
    [[64, 172], [73, 176], [72, 216], [64, 214]],
    ...mirrorAll([
      [[54, 172], [63, 172], [62, 212], [57, 220], [51, 198]],
      [[64, 172], [73, 176], [72, 216], [64, 214]],
    ]),
  ],
  // Gemelos: las dos cabezas del gastrocnemio y el sóleo debajo.
  calves: [
    [[59, 228], [66, 230], [65, 250], [60, 248]],
    [[67, 230], [72, 230], [71, 250], [66, 250]],
    [[62, 252], [70, 252], [69, 262], [63, 262]],
    ...mirrorAll([
      [[59, 228], [66, 230], [65, 250], [60, 248]],
      [[67, 230], [72, 230], [71, 250], [66, 250]],
      [[62, 252], [70, 252], [69, 262], [63, 262]],
    ]),
  ],
};

function mirrorAll(polygons) {
  return polygons.map(mirror);
}

function absSegments() {
  const segments = [];
  const rows = [[92, 102], [103, 113], [114, 124], [125, 136]];
  rows.forEach(([top, bottom], index) => {
    // El recto se estrecha al bajar hacia el pubis.
    const outer = 63 + index * 1.2;
    segments.push([[outer, top], [74, top], [74, bottom], [outer + 1, bottom]]);
  });
  return [...segments, ...mirrorAll(segments)];
}

// --------------------------------------------------------------------------
// Salida
// --------------------------------------------------------------------------

const pathFor = (points) => `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`;

const geometry = {
  viewBox: "0 0 150 280",
  silhouette: silhouette.map(pathFor),
  muscles: {
    front: Object.fromEntries(Object.entries(front).map(([id, polys]) => [id, polys.map(pathFor)])),
    back: Object.fromEntries(Object.entries(back).map(([id, polys]) => [id, polys.map(pathFor)])),
  },
};

let source = `const BODY_VIEWBOX = "${geometry.viewBox}";\n\nconst BODY_SILHOUETTE = [\n`;
geometry.silhouette.forEach((d) => { source += `  "${d}",\n`; });
source += "];\n\nconst MUSCLE_SHAPES = {\n";
for (const view of ["front", "back"]) {
  source += `  ${view}: {\n`;
  for (const [region, paths] of Object.entries(geometry.muscles[view])) {
    source += `    ${region}: [\n`;
    paths.forEach((d) => { source += `      "${d}",\n`; });
    source += "    ],\n";
  }
  source += "  },\n";
}
source += "};\n";

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(geometry));
} else if (process.argv.includes("--check")) {
  const fs = await import("node:fs");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const ok = app.includes(source.trim());
  console.log(ok
    ? "La geometría de app.js coincide con el generador."
    : "DESINCRONIZADA: app.js no coincide. Vuelve a pegar la salida de este script.");
  process.exit(ok ? 0 : 1);
} else {
  console.log(source);
}
