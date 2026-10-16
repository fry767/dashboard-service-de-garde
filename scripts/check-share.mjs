import { spawnSync } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function git(directory, args, input) {
  const result = spawnSync('git', args, { cwd: directory, input, encoding: 'utf8', windowsHide: true });
  if (result.error || (result.status !== 0 && !(args[0] === 'check-ignore' && result.status === 1))) {
    throw new Error('Impossible de vérifier le dépôt Git. Installez Git et initialisez le dépôt avec git init si nécessaire.');
  }
  return result.stdout;
}

const privateProbes = ['.local/history.json', '.local/browser/Default/Network/Cookies', '.env', '.env.local', '.env_private', 'node_modules/example/index.js', 'exports/releves.csv', 'releves.csv', 'navigation.har', 'playwright/.auth/state.json', 'test-results/trace.zip'];
const textExtensions = new Set(['.mjs','.js','.json','.md','.html','.css','.yml','.yaml','.cmd','.txt']);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
];

function isPrivateFile(file) {
  const parts = file.split('/');
  return parts.some(part => ['.local','node_modules','.auth','exports','test-results','playwright-report'].includes(part)) ||
    (parts.at(-1).startsWith('.env') && !parts.at(-1).endsWith('.example')) ||
    /(?:\.csv|\.har|\.log)$/i.test(file) ||
    /^(?:history|storage-state[^/]*|storageState[^/]*)\.json$/i.test(parts.at(-1));
}

export async function auditSharing(directory) {
  const root = path.resolve(directory);
  const files = [...new Set(git(root, ['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean))];
  const findings = [];
  const ignored = new Set(git(root, ['check-ignore','--no-index','--stdin'], privateProbes.join('\n') + '\n').trim().split(/\r?\n/));
  for (const file of privateProbes) if (!ignored.has(file)) findings.push({ file: '.gitignore', reason: `Exclusion manquante : ${file}` });

  const markers = [];
  try {
    const history = JSON.parse(await readFile(path.join(root,'.local','history.json'),'utf8'));
    for (const snapshot of history.snapshots || []) for (const reading of snapshot.readings || []) {
      const child = reading.child?.trim();
      if (child && child.length >= 8 && /\s/.test(child)) markers.push({ value: child.toLowerCase(), reason: 'Nom complet présent dans l’historique local' });
      if (reading.sourceUrl) for (const [key,value] of new URL(reading.sourceUrl).searchParams) {
        if (/id/i.test(key) && value.length >= 12) markers.push({ value: value.toLowerCase(), reason: 'Identifiant de demande présent dans l’historique local' });
      }
    }
  } catch (error) { if (error.code !== 'ENOENT') throw new Error('Impossible de lire l’historique local pour vérifier les données personnelles.'); }

  for (const file of files) {
    if (isPrivateFile(file)) { findings.push({ file, reason: 'Fichier local ou privé inclus dans les fichiers à partager' }); continue; }
    const absolute = path.resolve(root, file);
    if (!absolute.startsWith(root + path.sep)) { findings.push({ file, reason: 'Chemin extérieur au dépôt' }); continue; }
    let info;
    try { info = await lstat(absolute); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (info.isSymbolicLink()) { findings.push({ file, reason: 'Lien symbolique à vérifier avant le partage' }); continue; }
    if (!info.isFile() || info.size > 1024 * 1024 || (!textExtensions.has(path.extname(file)) && !['LICENSE','.gitignore','.gitattributes'].includes(file))) continue;
    const text = await readFile(absolute,'utf8');
    if (secretPatterns.some(pattern => pattern.test(text))) findings.push({ file, reason: 'Marqueur de secret ou de clé privée détecté' });
    for (const marker of markers) if (text.toLowerCase().includes(marker.value)) findings.push({ file, reason: marker.reason });
  }
  return { filesChecked: files.length, findings: [...new Map(findings.map(finding=>[JSON.stringify(finding),finding])).values()] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await auditSharing(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
    if (result.findings.length) {
      for (const finding of result.findings) console.error(`${finding.file} : ${finding.reason}`);
      process.exitCode = 1;
    } else console.log(`Partage vérifié : ${result.filesChecked} fichiers examinés, données locales exclues, aucun marqueur connu détecté. Relisez aussi les changements et les images.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
