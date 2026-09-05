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
// Lienzo 140 x 260. Eje de simetría en x = 70.

const AXIS = 70;
const mirror = (points) => points.map(([x, y]) => [round(2 * AXIS - x), y]);
const round = (value) => Math.round(value * 10) / 10;
// Un músculo par: el polígono dado y su espejo.
const pair = (points) => [points, mirror(points)];

// --------------------------------------------------------------------------
// Silueta
// --------------------------------------------------------------------------

const HEAD = [[70, 4], [76, 6], [80, 11], [81, 18], [79, 26], [74, 33], [70, 35], [66, 33], [61, 26], [59, 18], [60, 11], [64, 6]];
const NECK_BLOCK = [[63, 32], [77, 32], [79, 44], [70, 48], [61, 44]];
const TORSO = [
  [70, 44], [84, 46], [94, 52], [97, 64], [93, 88], [88, 110], [86, 132],
  [70, 138], [54, 132], [52, 110], [47, 88], [43, 64], [46, 52], [56, 46],
];
const PELVIS = [[52, 126], [88, 126], [89, 146], [80, 158], [60, 158], [51, 146]];

const ARM_UPPER = [[36, 50], [50, 52], [47, 80], [41, 112], [27, 110], [30, 76]];
const ARM_LOWER = [[27, 110], [41, 112], [38, 140], [34, 154], [22, 152], [24, 128]];
const HAND = [
  [22, 152], [34, 154], [33, 164], [35, 172], [31, 173], [29, 166],
  [28, 175], [24, 175], [24, 165], [21, 173], [18, 171], [19, 161], [17, 156],
];

const THIGH = [[50, 142], [70, 146], [70, 200], [67, 206], [53, 206], [47, 184], [47, 158]];
const SHIN = [[53, 206], [67, 206], [66, 232], [64, 246], [53, 246], [51, 230]];
const FOOT = [[53, 244], [64, 244], [66, 252], [58, 257], [46, 257], [47, 249]];

const silhouette = [
  HEAD, NECK_BLOCK, TORSO, PELVIS,
  ...pair(ARM_UPPER), ...pair(ARM_LOWER), ...pair(HAND),
  ...pair(THIGH), ...pair(SHIN), ...pair(FOOT),
];

// --------------------------------------------------------------------------
// Músculos, vista frontal
// --------------------------------------------------------------------------

const front = {
  // Esternocleidomastoideo: las dos bandas visibles del cuello.
  neck: pair([[64, 34], [70, 37], [70, 47], [64, 45], [62, 39]]),
  // Trapecio superior, la parte que asoma por delante.
  traps: pair([[62, 39], [70, 42], [70, 48], [53, 52], [51, 46]]),
  shoulders: pair([[51, 50], [41, 52], [35, 62], [36, 76], [45, 80], [50, 68]]),
  chest: [
    [[52, 55], [69, 53], [69, 66], [51, 68]],
    [[51, 68], [69, 66], [69, 80], [58, 82], [49, 76]],
    ...mirrorAll([
      [[52, 55], [69, 53], [69, 66], [51, 68]],
      [[51, 68], [69, 66], [69, 80], [58, 82], [49, 76]],
    ]),
  ],
  serratus: [
    [[50, 80], [56, 84], [55, 91], [49, 87]],
    [[51, 92], [57, 95], [56, 101], [50, 98]],
    ...mirrorAll([
      [[50, 80], [56, 84], [55, 91], [49, 87]],
      [[51, 92], [57, 95], [56, 101], [50, 98]],
    ]),
  ],
  // Recto abdominal: cuatro filas por lado, como en una lámina clásica.
  abs: absSegments(),
  obliques: pair([[53, 88], [60, 92], [60, 118], [57, 124], [52, 110]]),
  biceps: pair([[36, 70], [45, 72], [41, 104], [32, 102]]),
  forearms: pair([[27, 116], [38, 118], [35, 142], [25, 140]]),
  hip_flexors: pair([[58, 128], [69, 130], [69, 142], [60, 140]]),
  abductors: pair([[49, 146], [56, 148], [55, 164], [48, 158]]),
  // Cuádriceps: vasto lateral, recto femoral y vasto medial.
  quads: [
    [[49, 152], [57, 150], [56, 188], [51, 196], [47, 176]],
    [[58, 150], [65, 152], [64, 190], [57, 190]],
    [[65, 174], [70, 176], [69, 198], [64, 196]],
    ...mirrorAll([
      [[49, 152], [57, 150], [56, 188], [51, 196], [47, 176]],
      [[58, 150], [65, 152], [64, 190], [57, 190]],
      [[65, 174], [70, 176], [69, 198], [64, 196]],
    ]),
  ],
  adductors: pair([[66, 148], [70, 150], [70, 172], [65, 168]]),
  tibialis: pair([[55, 212], [61, 214], [60, 240], [55, 240]]),
};

// --------------------------------------------------------------------------
// Músculos, vista posterior
// --------------------------------------------------------------------------

const back = {
  neck: pair([[63, 34], [70, 35], [70, 46], [63, 46]]),
  traps: [
    [[62, 39], [70, 42], [70, 58], [52, 56], [51, 46]],
    [[52, 58], [70, 60], [70, 78], [55, 74]],
    ...mirrorAll([
      [[62, 39], [70, 42], [70, 58], [52, 56], [51, 46]],
      [[52, 58], [70, 60], [70, 78], [55, 74]],
    ]),
  ],
  shoulders: pair([[51, 50], [41, 52], [35, 62], [36, 76], [45, 80], [50, 68]]),
  upper_back: pair([[56, 76], [69, 78], [69, 92], [57, 90]]),
  lats: pair([[48, 72], [59, 84], [60, 108], [53, 118], [45, 100], [45, 78]]),
  lower_back: pair([[60, 102], [69, 104], [69, 124], [61, 122]]),
  triceps: pair([[30, 70], [39, 72], [36, 104], [28, 102]]),
  forearms: pair([[27, 116], [38, 118], [35, 142], [25, 140]]),
  glutes: pair([[54, 128], [69, 132], [69, 152], [58, 156], [51, 146]]),
  // Isquiotibiales: bíceps femoral por fuera, semitendinoso por dentro.
  hamstrings: [
    [[49, 158], [57, 156], [56, 192], [50, 196], [47, 180]],
    [[58, 156], [68, 158], [66, 194], [57, 192]],
    ...mirrorAll([
      [[49, 158], [57, 156], [56, 192], [50, 196], [47, 180]],
      [[58, 156], [68, 158], [66, 194], [57, 192]],
    ]),
  ],
  // Gemelos: las dos cabezas del gastrocnemio.
  calves: [
    [[53, 210], [59, 212], [58, 234], [54, 232]],
    [[60, 212], [66, 212], [65, 234], [59, 234]],
    ...mirrorAll([
      [[53, 210], [59, 212], [58, 234], [54, 232]],
      [[60, 212], [66, 212], [65, 234], [59, 234]],
    ]),
  ],
};

function mirrorAll(polygons) {
  return polygons.map(mirror);
}

function absSegments() {
  const segments = [];
  const rows = [[84, 94], [95, 105], [106, 116], [117, 128]];
  rows.forEach(([top, bottom], index) => {
    // El recto se estrecha al bajar hacia el pubis.
    const outer = 60 + index * 0.8;
    const inner = 69;
    segments.push([[outer, top], [inner, top], [inner, bottom], [outer + 0.6, bottom]]);
  });
  return [...segments, ...mirrorAll(segments)];
}

// --------------------------------------------------------------------------
// Salida
// --------------------------------------------------------------------------

const pathFor = (points) => `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`;

const geometry = {
  viewBox: "0 0 140 260",
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
