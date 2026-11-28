import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Validation locale de la version statique : aucune installation ni requête réseau.
const webRoot = fileURLToPath(new URL('../web/', import.meta.url));
const requiredFiles = [
  'index.html', 'styles.css', 'app.js', 'engine.js', 'game-data.js',
  'manifest.webmanifest', 'sw.js',
];
const errors = [];
const checkedReferences = new Set();
let javascriptCount = 0;

const nameOf = (file) => relative(webRoot, file).split(sep).join('/');
const report = (file, message) => errors.push(`${nameOf(file) || 'web/'} : ${message}`);

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
    else report(path, 'les liens symboliques et fichiers spéciaux ne sont pas publiables.');
  }
  return files;
}

async function checkReference(reference, sourceFile, { importModule = false } = {}) {
  const ref = reference.trim();
  if (!ref || ref.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|blob:|\/\/)/i.test(ref)) return;
  // Les chemins calculés sont vérifiés lors de la recette dans le navigateur.
  if (ref.includes('${')) return;
  if (importModule && !ref.startsWith('.')) {
    report(sourceFile, `l'import « ${ref} » doit être relatif pour fonctionner sans bundler.`);
    return;
  }
  if (ref.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(ref)) {
    report(sourceFile, `le chemin « ${ref} » doit être relatif au sous-répertoire du jeu.`);
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(ref.split(/[?#]/, 1)[0]);
  } catch {
    report(sourceFile, `URL locale invalide : ${ref}`);
    return;
  }
  if (!pathname) return;
  const target = resolve(dirname(sourceFile), pathname);
  const fromRoot = relative(webRoot, target);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    report(sourceFile, `« ${ref} » sort du répertoire public web/.`);
    return;
  }
  const key = `${sourceFile}\0${target}`;
  if (checkedReferences.has(key)) return;
  checkedReferences.add(key);
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      if (!(await stat(resolve(target, 'index.html'))).isFile()) throw new Error('missing index');
    } else if (!info.isFile()) {
      throw new Error('not a file');
    }
  } catch {
    report(sourceFile, `ressource locale absente : ${ref}`);
  }
}

async function inspectFile(file) {
  const extension = extname(file).toLowerCase();
  if (!['.html', '.css', '.js', '.mjs', '.svg'].includes(extension)) return;
  const source = await readFile(file, 'utf8');

  if (extension === '.html' || extension === '.svg') {
    for (const match of source.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi)) {
      await checkReference(match[2], file);
    }
  }
  if (['.css', '.html', '.svg'].includes(extension)) {
    for (const match of source.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^\s)]+))\s*\)/gi)) {
      await checkReference(match[2] ?? match[3], file);
    }
    if (extension === '.css') {
      for (const match of source.matchAll(/@import\s+(["'])(.*?)\1/gi)) {
        await checkReference(match[2], file);
      }
    }
  }
  if (extension !== '.js' && extension !== '.mjs') return;
  javascriptCount += 1;
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (syntax.error || syntax.status !== 0) {
    report(file, `syntaxe JavaScript invalide.\n${syntax.stderr || syntax.error?.message || ''}`.trim());
  }
  for (const match of source.matchAll(/\b(?:import|export)\s+(?:(?:[^;'"`]*?)\bfrom\s*)?(['"])([^'"\n]+)\1/g)) {
    await checkReference(match[2], file, { importModule: true });
  }
  for (const match of source.matchAll(/\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g)) {
    await checkReference(match[2], file, { importModule: true });
  }
  for (const match of source.matchAll(/serviceWorker\s*\.\s*register\s*\(\s*(['"])([^'"\n]+)\1/g)) {
    await checkReference(match[2], resolve(webRoot, 'index.html'));
  }
  for (const match of source.matchAll(/new\s+URL\s*\(\s*(['"])([^'"\n]+)\1\s*,\s*import\.meta\.url/g)) {
    await checkReference(match[2], file);
  }
  if (nameOf(file) === 'sw.js') {
    for (const match of source.matchAll(/(['"])(\.\/[^'"\n]*)\1/g)) {
      await checkReference(match[2], file);
    }
  }
}

async function inspectManifest() {
  const file = resolve(webRoot, 'manifest.webmanifest');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    report(file, `manifest JSON illisible : ${error.message}`);
    return;
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    report(file, 'le manifest doit être un objet JSON.');
    return;
  }
  for (const field of ['name', 'short_name']) {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) report(file, `${field} doit être renseigné.`);
  }
  if (!['./', './index.html'].includes(manifest.start_url)) {
    report(file, 'start_url doit valoir "./" ou "./index.html".');
  } else {
    await checkReference(manifest.start_url, file);
  }
  if (manifest.scope !== './') report(file, 'scope doit valoir "./" pour limiter la PWA au jeu.');
  if (manifest.id !== undefined && manifest.id !== './') report(file, 'id doit valoir "./" lorsqu’il est défini.');
  if (!['standalone', 'minimal-ui', 'fullscreen'].includes(manifest.display)) {
    report(file, 'display doit permettre une présentation comme application.');
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    report(file, 'au moins une icône est nécessaire.');
  } else {
    const sizes = new Set();
    for (const icon of manifest.icons) {
      if (!icon || typeof icon !== 'object' || Array.isArray(icon)) {
        report(file, 'chaque icône doit être un objet JSON.');
        continue;
      }
      if (typeof icon.src !== 'string' || !icon.src.startsWith('./')) {
        report(file, 'chaque icône doit avoir un chemin src local commençant par "./".');
      } else {
        await checkReference(icon.src, file);
      }
      if (typeof icon.sizes !== 'string' || !icon.sizes.trim()) report(file, 'chaque icône doit annoncer ses dimensions.');
      else for (const size of icon.sizes.split(/\s+/)) sizes.add(size);
    }
    if (!sizes.has('any') && !(sizes.has('192x192') && sizes.has('512x512'))) {
      report(file, 'prévoir une icône vectorielle "any" ou des icônes 192x192 et 512x512.');
    }
  }
  for (const [collection, property] of [['screenshots', 'src'], ['shortcuts', 'url']]) {
    if (manifest[collection] === undefined) continue;
    if (!Array.isArray(manifest[collection])) {
      report(file, `${collection} doit être un tableau.`);
      continue;
    }
    for (const entry of manifest[collection]) {
      if (typeof entry?.[property] !== 'string') {
        report(file, `chaque entrée de ${collection} doit fournir ${property}.`);
      } else {
        await checkReference(entry[property], file);
      }
    }
  }
}

let files = [];
try {
  files = await listFiles(webRoot);
} catch (error) {
  errors.push(`web/ : répertoire illisible (${error.message}).`);
}
const fileNames = new Set(files.map(nameOf));
for (const required of requiredFiles) {
  if (!fileNames.has(required)) errors.push(`web/${required} : fichier requis absent.`);
}
for (const file of files) await inspectFile(file);
if (fileNames.has('manifest.webmanifest')) await inspectManifest();

if (errors.length > 0) {
  console.error(`Vérification web échouée (${errors.length} erreur${errors.length > 1 ? 's' : ''}) :\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Version web valide : ${files.length} fichiers, ${javascriptCount} scripts JavaScript et ${checkedReferences.size} références locales vérifiés.`);
}
