#!/usr/bin/env node
/**
 * Compile Docusign Gen for Salesforce template specs, or lint a Gen Word file made by hand.
 *
 *   node compile.mjs <spec.json> [more …] [--out-dir <dir>] [--describe <file|dir>] [--prefix <name prefix>]
 *   node compile.mjs --lint <file.docx> (--spec <spec.json> | --mappings <ObjectMappings.json>) [--describe <file|dir>] [--signers <n>]
 *
 * Per spec, in <out-dir>/<id>/ (default: beside the spec):
 *   <file>.docx              each Word file with its <# … #> tags
 *   gen-template.json        the dfsle__GenTemplate__c fields (ObjectMappings, SignerMappings, the locale fields)
 *   content-versions.json    per Word file, the ContentVersion fields Gen reads (file name, suffix, Word/PDF, rule)
 *   mappings.json            the ObjectMappings JSON, readable
 *
 * --describe: the org's fields. A slim describe ({ "objects": … }, as scripts/assets/salesforce/describe.json), or a
 * folder of raw sObject describes (`sf sobject describe --sobject Opportunity --json > Opportunity.json`, one per
 * object the spec reads, related lists' and lookups' objects too). Default: the bundled describe (standard Sales
 * Cloud objects and Salesforce CPQ, plus a demo org's custom fields).
 *
 * Exit 0: written (or the lint found no error). Exit 1: problems — each is printed and nothing is written for that spec.
 * Plain Node 18+, no dependencies: scripts/lib/ is generated from the gallery repo's measured compiler.
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileSfGenTemplate, lintGenDocx, lintMappings, loadDescribe, slimDescribe } from './lib/salesforce-gen-spec.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const readJson = (f, what) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { console.error(`ERROR   cannot read ${what} ${f} as JSON: ${e.message}`); process.exit(1); }
};
const describeArg = flag('--describe');
const outDir = flag('--out-dir');
const prefix = flag('--prefix') ?? '';
const lintFile = flag('--lint');
const specArg = flag('--spec');
const mappingsArg = flag('--mappings');
const signersArg = flag('--signers');

function describe() {
  if (!describeArg) return loadDescribe();
  if (fs.statSync(describeArg).isDirectory()) {
    const objects = {};
    for (const f of fs.readdirSync(describeArg).filter((x) => x.endsWith('.json'))) {
      const raw = readJson(path.join(describeArg, f), 'describe');
      const r = raw.result ?? raw;
      if (!r.name || !Array.isArray(r.fields)) { console.error(`ERROR   ${f} is not an sObject describe (no name and fields)`); process.exit(1); }
      objects[r.name] = slimDescribe(r);
    }
    // A related list or lookup to an object that was not described is unknown to the compiler: keep only lists between described objects.
    for (const o of Object.values(objects)) o.children = Object.fromEntries(Object.entries(o.children).filter(([, c]) => objects[c.object]));
    return { objects };
  }
  return readJson(describeArg, 'describe');
}
const d = describe();

if (lintFile) {
  if (!specArg && !mappingsArg) { console.error('usage: node compile.mjs --lint <file.docx> (--spec <spec.json> | --mappings <ObjectMappings.json>)'); process.exit(1); }
  let mappings, signers = signersArg === undefined ? undefined : Number(signersArg);
  if (specArg) {
    try { const c = compileSfGenTemplate(readJson(specArg, 'spec'), d); mappings = c.mappings; signers ??= c.signers.length; }
    catch (e) { console.error(`ERROR   ${specArg}: ${e.message}`); process.exit(1); }
  } else mappings = readJson(mappingsArg, '--mappings');
  const a = lintMappings(mappings, d);
  const b = lintGenDocx(fs.readFileSync(lintFile), mappings, { file: path.basename(lintFile), signers });
  for (const w of [...a.warnings, ...b.warnings]) console.log(`WARNING ${w}`);
  for (const e of [...a.errors, ...b.errors]) console.log(`ERROR   ${e}`);
  const n = a.errors.length + b.errors.length;
  console.log(`${path.basename(lintFile)}: ${n} error(s), ${a.warnings.length + b.warnings.length} warning(s)`);
  process.exit(n ? 1 : 0);
}

if (!args.length) {
  console.error('usage: node compile.mjs <spec.json> [more …] [--out-dir <dir>] [--describe <file|dir>]\n       node compile.mjs --lint <file.docx> (--spec <spec.json> | --mappings <ObjectMappings.json>)');
  process.exit(1);
}
let failed = 0;
for (const file of args) {
  const spec = readJson(file, 'spec');
  try {
    const c = compileSfGenTemplate(spec, d, { namePrefix: prefix });
    const dir = path.join(outDir ?? path.dirname(file), spec.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const doc of c.documents) fs.writeFileSync(path.join(dir, doc.file), doc.docx);
    fs.writeFileSync(path.join(dir, 'gen-template.json'), `${JSON.stringify(c.record, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, 'content-versions.json'), `${JSON.stringify(c.documents.map((x) => x.contentVersion), null, 2)}\n`);
    fs.writeFileSync(path.join(dir, 'mappings.json'), `${JSON.stringify(c.mappings, null, 2)}\n`);
    console.log(`wrote ${dir}: Gen template "${c.name}" on ${spec.sourceObject}, ${c.documents.length} Word file(s), ${c.signers.length} signer(s)`);
    for (const w of c.lint.warnings) console.log(`WARNING ${w}`);
  } catch (e) {
    console.error(`ERROR   ${file}: ${e.message}`);
    failed++;
  }
}
if (failed) { console.log(`${failed} spec(s) had errors; nothing was written for them`); process.exit(1); }
