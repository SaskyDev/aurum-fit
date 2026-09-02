import fs from "node:fs";
import path from "node:path";

// La versión de caché vive en 6 sitios (service-worker.js, index.html x4,
// app.js x2). Antes había que actualizarlos a mano uno a uno, y era fácil
// olvidar alguno y dejar la PWA sirviendo una mezcla de versiones. Este
// script toma service-worker.js como fuente de la verdad y sincroniza el
// resto, o sube la versión en los 6 sitios a la vez si se le pide.
//
// Uso:
//   node scripts/bump-cache-version.mjs           -> sincroniza todo a la
//                                                    versión actual de
//                                                    service-worker.js
//   node scripts/bump-cache-version.mjs 54         -> sube a la versión 54
//                                                    en los 6 sitios

const root = path.resolve(import.meta.dirname, "..");
const serviceWorkerFile = path.join(root, "service-worker.js");
const indexFile = path.join(root, "index.html");
const appFile = path.join(root, "app.js");

const serviceWorkerSource = fs.readFileSync(serviceWorkerFile, "utf8");
const currentVersionMatch = serviceWorkerSource.match(/const SHELL_VERSION = "(\d+)";/);
if (!currentVersionMatch) {
  throw new Error("No se encontró SHELL_VERSION en service-worker.js.");
}
const currentVersion = currentVersionMatch[1];
const requestedVersion = process.argv[2];
const nextVersion = requestedVersion ?? currentVersion;

if (requestedVersion && !/^\d+$/.test(requestedVersion)) {
  throw new Error(`Versión inválida: "${requestedVersion}". Debe ser un número entero.`);
}

function replaceAll(source, pattern, replacement) {
  const matches = source.match(pattern);
  return { updated: source.replace(pattern, replacement), count: matches ? matches.length : 0 };
}

let totalReplacements = 0;

const nextServiceWorkerSource = serviceWorkerSource.replace(
  /const SHELL_VERSION = "\d+";/,
  `const SHELL_VERSION = "${nextVersion}";`,
);
fs.writeFileSync(serviceWorkerFile, nextServiceWorkerSource);
totalReplacements += 1;

const indexSource = fs.readFileSync(indexFile, "utf8");
const indexResult = replaceAll(indexSource, /\?v=\d+/g, `?v=${nextVersion}`);
fs.writeFileSync(indexFile, indexResult.updated);
totalReplacements += indexResult.count;

const appSource = fs.readFileSync(appFile, "utf8");
const appResult = replaceAll(appSource, /\?v=\d+/g, `?v=${nextVersion}`);
fs.writeFileSync(appFile, appResult.updated);
totalReplacements += appResult.count;

console.log(`Versión de caché sincronizada a v${nextVersion}.`);
console.log(`  service-worker.js: SHELL_VERSION actualizado.`);
console.log(`  index.html: ${indexResult.count} referencias actualizadas.`);
console.log(`  app.js: ${appResult.count} referencias actualizadas.`);
console.log(`Total de sitios sincronizados: ${totalReplacements}.`);
