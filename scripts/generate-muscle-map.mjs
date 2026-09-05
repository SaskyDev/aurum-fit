// Genera la geometría del mapa muscular a partir de un esqueleto de
// articulaciones. La razón de que esto sea un script y no coordenadas escritas
// a mano: cuando la silueta y los músculos se colocan por separado, cualquier
// retoque de una postura los desalinea y el músculo acaba flotando fuera del
// cuerpo. Aquí las dos cosas salen de las mismas articulaciones.
//
// Uso:
//   node scripts/generate-muscle-map.mjs          -> imprime el bloque JS
//   node scripts/generate-muscle-map.mjs --check   -> compara con app.js
//
// El resultado se pega en app.js entre BODY_SILHOUETTE y MUSCLE_SHAPES.

const J = {
  shoulder_l: [40, 50], elbow_l: [33, 92], wrist_l: [29, 128],
  shoulder_r: [80, 50], elbow_r: [87, 92], wrist_r: [91, 128],
  hip_l: [52, 128], knee_l: [50, 182], ankle_l: [50, 228],
  hip_r: [68, 128], knee_r: [70, 182], ankle_r: [70, 228],
};

const round = (value) => Math.round(value * 100) / 100;

// Cápsula a lo largo del segmento a→b, entre las fracciones t0 y t1.
function capsule([ax, ay], [bx, by], w, t0 = 0, t1 = 1) {
  const px = ax + (bx - ax) * t0;
  const py = ay + (by - ay) * t0;
  const qx = ax + (bx - ax) * t1;
  const qy = ay + (by - ay) * t1;
  const cx = (px + qx) / 2;
  const cy = (py + qy) / 2;
  const h = Math.hypot(qx - px, qy - py);
  // La cápsula es simétrica: θ y θ+180 se ven igual. Normalizar el ángulo deja
  // el archivo legible en lugar de llenarlo de rotate(-170.5 ...).
  let angle = (Math.atan2(qx - px, -(qy - py)) * 180) / Math.PI;
  while (angle > 90) angle -= 180;
  while (angle <= -90) angle += 180;
  return {
    t: "r", x: round(cx - w / 2), y: round(cy - h / 2), w: round(w), h: round(h), rx: round(w / 2),
    tr: `rotate(${angle.toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})`,
  };
}

const pair = (a, b, w, t0, t1) => [
  capsule(J[`${a}_l`], J[`${b}_l`], w, t0, t1),
  capsule(J[`${a}_r`], J[`${b}_r`], w, t0, t1),
];

const silhouette = [
  { t: "e", cx: 60, cy: 17, rx: 10.5, ry: 12.5 },
  { t: "r", x: 54.5, y: 25, w: 11, h: 14, rx: 5 },
  { t: "p", d: "M41 47q19-8 38 0l-3 30q-2 16-4.5 24l-.5 14q-15 7-22 0l-.5-14q-2.5-8-4.5-24z" },
  { t: "r", x: 46, y: 106, w: 28, h: 28, rx: 12 },
];
for (const side of ["l", "r"]) {
  silhouette.push(
    capsule(J[`shoulder_${side}`], J[`elbow_${side}`], 13),
    capsule(J[`elbow_${side}`], J[`wrist_${side}`], 11),
    { t: "e", cx: J[`wrist_${side}`][0], cy: J[`wrist_${side}`][1] + 5, rx: 5, ry: 6 },
    capsule(J[`hip_${side}`], J[`knee_${side}`], 17),
    capsule(J[`knee_${side}`], J[`ankle_${side}`], 12.5),
    { t: "e", cx: J[`ankle_${side}`][0], cy: 231, rx: 6.5, ry: 5 },
  );
}

const muscles = {
  front: {
    neck: [{ t: "r", x: 55.5, y: 26, w: 9, h: 12, rx: 4 }],
    shoulders: [{ t: "e", cx: 41.5, cy: 52, rx: 8, ry: 8 }, { t: "e", cx: 78.5, cy: 52, rx: 8, ry: 8 }],
    chest: [{ t: "p", d: "M47 51q6-4 12-1.5v16q-7 3-13-1z" }, { t: "p", d: "M73 51q-6-4-12-1.5v16q7 3 13-1z" }],
    serratus: [{ t: "p", d: "M46.5 69l3.5 1 .5 8-3.5-1z" }, { t: "p", d: "M73.5 69l-3.5 1-.5 8 3.5-1z" }],
    biceps: pair("shoulder", "elbow", 8.5, 0.14, 0.72),
    forearms: pair("elbow", "wrist", 7.5, 0.10, 0.88),
    abs: [{ t: "r", x: 53.5, y: 69, w: 13, h: 38, rx: 5 }],
    obliques: [{ t: "p", d: "M52.5 74l-4 1.5-.5 22 4.5 4z" }, { t: "p", d: "M67.5 74l4 1.5.5 22-4.5 4z" }],
    hip_flexors: [{ t: "r", x: 51.5, y: 108, w: 17, h: 11, rx: 5 }],
    abductors: pair("hip", "knee", 5.5, 0.02, 0.28),
    adductors: [
      capsule([56, 130], [54, 180], 5.5, 0.05, 0.72),
      capsule([64, 130], [66, 180], 5.5, 0.05, 0.72),
    ],
    quads: pair("hip", "knee", 10, 0.06, 0.92),
    tibialis: pair("knee", "ankle", 6, 0.10, 0.86),
  },
  back: {
    neck: [{ t: "r", x: 55.5, y: 26, w: 9, h: 12, rx: 4 }],
    traps: [{ t: "p", d: "M60 40l15 7-2 13-13 5-13-5-2-13z" }],
    shoulders: [{ t: "e", cx: 41.5, cy: 52, rx: 8, ry: 8 }, { t: "e", cx: 78.5, cy: 52, rx: 8, ry: 8 }],
    upper_back: [{ t: "r", x: 49, y: 61, w: 10, h: 15, rx: 4 }, { t: "r", x: 61, y: 61, w: 10, h: 15, rx: 4 }],
    lats: [{ t: "p", d: "M48 64l-2.5 20 5 13 8.5-7-2-26z" }, { t: "p", d: "M72 64l2.5 20-5 13-8.5-7 2-26z" }],
    lower_back: [{ t: "r", x: 53, y: 90, w: 14, h: 20, rx: 6 }],
    triceps: pair("shoulder", "elbow", 8.5, 0.12, 0.78),
    forearms: pair("elbow", "wrist", 7.5, 0.10, 0.88),
    glutes: [{ t: "r", x: 47.5, y: 110, w: 12, h: 22, rx: 8 }, { t: "r", x: 60.5, y: 110, w: 12, h: 22, rx: 8 }],
    hamstrings: pair("hip", "knee", 11, 0.14, 0.94),
    calves: pair("knee", "ankle", 9, 0.06, 0.72),
  },
};

function shapeSource(shape) {
  if (shape.t === "e") return `{ t: "e", cx: ${shape.cx}, cy: ${shape.cy}, rx: ${shape.rx}, ry: ${shape.ry} }`;
  if (shape.t === "p") return `{ t: "p", d: "${shape.d}" }`;
  const tail = shape.tr ? `, tr: "${shape.tr}"` : "";
  return `{ t: "r", x: ${shape.x}, y: ${shape.y}, w: ${shape.w}, h: ${shape.h}, rx: ${shape.rx}${tail} }`;
}

let source = "const BODY_SILHOUETTE = [\n";
silhouette.forEach((shape) => { source += `  ${shapeSource(shape)},\n`; });
source += "];\n\nconst MUSCLE_SHAPES = {\n";
for (const view of ["front", "back"]) {
  source += `  ${view}: {\n`;
  for (const [region, shapes] of Object.entries(muscles[view])) {
    source += `    ${region}: [${shapes.map(shapeSource).join(", ")}],\n`;
  }
  source += "  },\n";
}
source += "};\n";

if (process.argv.includes("--check")) {
  const fs = await import("node:fs");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const ok = app.includes(source.trim());
  console.log(ok
    ? "La geometría de app.js coincide con el esqueleto."
    : "DESINCRONIZADA: app.js no coincide. Vuelve a pegar la salida de este script.");
  process.exit(ok ? 0 : 1);
}

console.log(source);
