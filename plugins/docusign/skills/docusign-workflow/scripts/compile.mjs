#!/usr/bin/env node
/**
 * Compile a Maestro workflow SPEC into the ZIP that Docusign's
 * Automations ▸ Workflows ▸ Create Workflow ▸ Import Workflow takes, and check it.
 *
 *   node compile.mjs <project>/workflows/specs/<id>.json [--out <file.zip>]
 *   node compile.mjs <spec.json> --project <dir> [--out <file.zip>]
 *
 * The project folder holds every spec the workflow names, by the same id:
 *   <project>/webforms/specs/<id>.json            a form step's web form
 *   <project>/document-templates/specs/<id>.json  a generate step's template
 *   <project>/request-types/specs/<id>.json       a request start, or a createRequest step
 * Each is compiled into the package, so importing it creates them too.
 *
 * Exit 0: written. Exit 1: refused, with every problem printed; nothing is written.
 * Plain Node 18+, no dependencies: scripts/lib/ is generated from the gallery repo's measured
 * compiler and imports only node: built-ins.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorkflowSpecPackage, setSpecRoot } from './lib/workflow-spec.mjs';
import { validateDefinition } from './lib/workflow-build.mjs';
import { PORTABLE_ACCOUNT } from './lib/request-type-spec.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const projectArg = flag('--project');
const outArg = flag('--out');
const specFile = args[0];
if (!specFile) {
  console.error('usage: node compile.mjs <project>/workflows/specs/<id>.json [--project <dir>] [--out <file.zip>]');
  process.exit(1);
}

const fail = (lines) => { for (const l of lines) console.error(`ERROR   ${l}`); console.log('nothing written'); process.exit(1); };

let spec;
try { spec = JSON.parse(fs.readFileSync(specFile, 'utf8')); }
catch (e) { fail([`cannot read ${specFile} as JSON: ${e.message}`]); }

// <project>/workflows/specs/<id>.json → <project>; anything else needs --project (or uses its own folder).
const abs = path.resolve(specFile);
const project = path.resolve(projectArg ?? (path.basename(path.dirname(abs)) === 'specs' && path.basename(path.dirname(path.dirname(abs))) === 'workflows'
  ? path.dirname(path.dirname(path.dirname(abs))) : path.dirname(abs)));

// Two step kinds cannot travel in a file this skill makes; refuse them before compiling, with the alternative.
const unsupported = [];
const walk = (v, where) => {
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${where}[${i}]`)); return; }
  if (!v || typeof v !== 'object') return;
  if ('esign' in v) unsupported.push(`${where}: an eSignature-template step ("esign") needs a PDF rendered from the template, which this skill cannot make. Use a document template instead: {"generate": "<template id>", "fill": {…}} followed by {"sign": {…}} (docusign-document-template skill)`);
  if ('agent' in v && typeof v.agent === 'string') unsupported.push(`${where}: an AI-agent step ("agent") names an agent that must already be published in the importing account and does not travel in the package. Leave it out, or add it in the builder after import`);
  for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
};
walk(spec.steps ?? [], 'steps');
if (unsupported.length) fail(unsupported);

setSpecRoot(project);
let pkg;
try {
  pkg = buildWorkflowSpecPackage(spec, { accountId: PORTABLE_ACCOUNT, owner: { userId: 'workflow-import', userName: 'Workflow import' } });
} catch (e) {
  const m = /no ([\w-]+) spec "([^"]+)"/.exec(e.message);
  fail([m ? `the workflow names ${m[1]} "${m[2]}", but ${path.join(project, m[1], 'specs', `${m[2]}.json`)} does not exist — write that spec (same id), or fix the reference` : e.message]);
}

const errors = validateDefinition(pkg.compiled.definition).map((e) => `validate: ${e}`);
// Parity: each step carries the keys that real exports of that step type always carry.
const want = JSON.parse(fs.readFileSync(path.join(HERE, 'lib', 'export-keys.json'), 'utf8')).types;
const all = (xs) => xs.flatMap((x) => [x, ...all([...(x.ifSteps ?? []), ...(x.elseSteps ?? []), ...(x.cases ?? []).flatMap((c) => c.steps), ...(x.defaultCase?.steps ?? []), ...(x.lanes ?? []).flatMap((l) => l.steps)])]);
const steps = all(pkg.compiled.definition.steps ?? []);
for (const s of steps) {
  const w = want[String(s.type)];
  if (!w) continue;
  for (const part of ['input', 'config']) for (const k of Object.keys(w[part])) if (!(k in (s[part] ?? {}))) errors.push(`parity: ${s.type} lacks ${part}.${k}, which real exports of this step carry`);
}
if (errors.length) fail(errors);

const out = outArg ?? path.join(path.dirname(abs), `${spec.id}.workflow.zip`);
fs.writeFileSync(out, pkg.zip);
const c = pkg.compiled.carries;
const n = steps.filter((s) => s.type !== 'DS-End').length;
console.log(`wrote ${out}: "${spec.name}", ${n} step(s), ${Math.round(pkg.zip.length / 1024)} KB`);
const list = (label, xs) => { if (xs.length) console.log(`  creates ${xs.length} ${label}: ${xs.map((x) => `"${x.name}"`).join(', ')}`); };
list('web form(s)', c.webforms);
list('document template(s)', c.documentTemplates);
list('request type(s)', c.requestTypes);
list('request status(es)', c.statuses);
if (c.requestTypes.length) console.log('WARNING a request type\'s custom fields are account-wide and permanent once imported; deleting the type later leaves them');
if (!c.webforms.length && !c.documentTemplates.length && !c.requestTypes.length && !c.statuses.length) console.log('  carries nothing else: the workflow alone');
