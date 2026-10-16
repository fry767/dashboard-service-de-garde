import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { auditSharing } from '../scripts/check-share.mjs';

test('sharing audit excludes local files and catches forced secrets without exposing their values', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(),'garderie-sharing-'));
  const runGit = args => { const result = spawnSync('git',args,{cwd:directory,encoding:'utf8',windowsHide:true}); assert.equal(result.status,0,result.stderr); };
  try {
    runGit(['init','--quiet']);
    await copyFile(new URL('../.gitignore',import.meta.url),path.join(directory,'.gitignore'));
    await writeFile(path.join(directory,'README.md'),'Synthetic repository.');
    await writeFile(path.join(directory,'.env'),'SECRET=do-not-include');
    assert.deepEqual((await auditSharing(directory)).findings,[]);
    runGit(['add','-f','.env']);
    assert.ok((await auditSharing(directory)).findings.some(finding=>finding.file==='.env'));
    await writeFile(path.join(directory,'.env_private'),'PRIVATE=not-for-sharing');
    runGit(['add','-f','.env_private']);
    assert.ok((await auditSharing(directory)).findings.some(finding=>finding.file==='.env_private'));
    await mkdir(path.join(directory,'.local'));
    const child = ['Fictional','Family'].join(' ');
    const identifier = ['synthetic','registration','123'].join('');
    await writeFile(path.join(directory,'.local','history.json'),JSON.stringify({snapshots:[{readings:[{child,sourceUrl:`https://example.test/indicator?id=${identifier}`}]}]}));
    const token = 'ghp_' + 'x'.repeat(36);
    await writeFile(path.join(directory,'example.js'),JSON.stringify({child,identifier,token}));
    const result = await auditSharing(directory);
    assert.ok(result.findings.some(finding=>finding.reason.startsWith('Nom complet')));
    assert.ok(result.findings.some(finding=>finding.reason.startsWith('Identifiant de demande')));
    assert.ok(result.findings.some(finding=>finding.reason.startsWith('Marqueur de secret')));
    for (const privateValue of [child,identifier,token,'do-not-include']) assert.ok(!JSON.stringify(result).includes(privateValue));
  } finally {
    assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('garderie-sharing-'));
    await rm(directory,{recursive:true,force:true});
  }
});
