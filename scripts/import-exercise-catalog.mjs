import fs from "node:fs";
import path from "node:path";

const sourceFile = process.argv[2];
const sourceCommit = process.argv[3];
const outputFile = process.argv[4] ?? "data/exercises.es.json";

if (!sourceFile || !sourceCommit) {
  throw new Error(
    "Uso: node scripts/import-exercise-catalog.mjs <exercises.json> <commit> [salida]",
  );
}

const selection = [
  ["0025", "Press de banca con barra"],
  ["0314", "Press inclinado con mancuernas"],
  ["0576", "Press de pecho en máquina"],
  ["0308", "Aperturas con mancuernas"],
  ["0043", "Sentadilla con barra"],
  ["0032", "Peso muerto con barra"],
  ["0085", "Peso muerto rumano con barra"],
  ["1463", "Prensa de piernas a 45°"],
  ["0585", "Extensión de piernas en máquina"],
  ["0599", "Curl femoral sentado"],
  ["1409", "Puente de glúteo con barra"],
  ["1460", "Zancadas caminando"],
  ["0027", "Remo inclinado con barra"],
  ["2330", "Jalón al pecho en polea"],
  ["0180", "Remo sentado en polea baja"],
  ["1326", "Dominadas supinas"],
  ["0426", "Press de hombro con mancuernas"],
  ["0334", "Elevaciones laterales con mancuernas"],
  ["0294", "Curl de bíceps con mancuernas"],
  ["0313", "Curl martillo con mancuernas"],
  ["0241", "Extensión de tríceps en polea"],
  ["1373", "Elevación de gemelos de pie"],
  ["0276", "Dead bug"],
  ["3211", "Flexiones con apoyo de rodillas"],
];

const categoryTranslations = {
  back: "Espalda",
  cardio: "Cardio",
  chest: "Pecho",
  "lower arms": "Antebrazos",
  "lower legs": "Pierna inferior",
  neck: "Cuello",
  shoulders: "Hombros",
  "upper arms": "Brazos",
  "upper legs": "Piernas",
  waist: "Core",
};

const equipmentTranslations = {
  barbell: "Barra",
  "body weight": "Peso corporal",
  cable: "Polea",
  dumbbell: "Mancuernas",
  "leverage machine": "Máquina",
  "sled machine": "Prensa/máquina de trineo",
};

function normalize(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

const source = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
if (!Array.isArray(source)) throw new Error("El origen debe ser un array JSON.");

const ids = new Set();
const duplicateNames = new Map();
for (const exercise of source) {
  if (ids.has(exercise.id)) throw new Error(`ID duplicado: ${exercise.id}`);
  ids.add(exercise.id);
  const key = [
    normalize(exercise.name),
    normalize(exercise.category),
    normalize(exercise.equipment),
    normalize(exercise.target),
  ].join("|");
  const matches = duplicateNames.get(key) ?? [];
  matches.push(exercise.id);
  duplicateNames.set(key, matches);
}

const exactDuplicateGroups = [...duplicateNames.entries()]
  .filter(([, duplicateIds]) => duplicateIds.length > 1)
  .map(([key, duplicateIds]) => ({ key, ids: duplicateIds }));

const selected = selection.map(([sourceId, nameEs]) => {
  const exercise = source.find((candidate) => candidate.id === sourceId);
  if (!exercise) throw new Error(`No existe el ejercicio seleccionado ${sourceId}.`);
  if (!exercise.instructions?.es) {
    throw new Error(`Faltan instrucciones en español para ${sourceId}.`);
  }

  return {
    id: `dataset-${sourceId}`,
    sourceId,
    nameEs,
    nameOriginal: exercise.name,
    category: exercise.category,
    categoryEs: categoryTranslations[exercise.category] ?? exercise.category,
    bodyPart: exercise.body_part,
    equipment: exercise.equipment,
    equipmentEs: equipmentTranslations[exercise.equipment] ?? exercise.equipment,
    target: exercise.target,
    muscleGroup: exercise.muscle_group,
    secondaryMuscles: exercise.secondary_muscles,
    instructionsEs: exercise.instructions.es,
    instructionStepsEs: exercise.instruction_steps?.es ?? [],
    measurementType: "weight_reps",
    reviewStatus: "pending_professional_review",
    source: {
      repository: "https://github.com/hasaneyldrm/exercises-dataset",
      commit: sourceCommit,
      license: "MIT",
    },
  };
});

const payload = {
  schemaVersion: 1,
  source: {
    repository: "https://github.com/hasaneyldrm/exercises-dataset",
    commit: sourceCommit,
    license: "MIT",
    copyright: "Copyright (c) 2026 Hasan Emir Yıldırım",
  },
  policy: {
    selection: "Muestra manual para los usuarios iniciales; no es el catálogo completo.",
    excludedFields: ["image", "gif_url", "media_id", "attribution"],
    instructionsReview: "pending_professional_review",
  },
  audit: {
    sourceRecords: source.length,
    uniqueIds: ids.size,
    exactDuplicateGroups: exactDuplicateGroups.length,
  },
  exercises: selected,
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `Generados ${selected.length} ejercicios de ${source.length}; `
  + `${exactDuplicateGroups.length} grupos duplicados detectados. Sin campos multimedia.`,
);
