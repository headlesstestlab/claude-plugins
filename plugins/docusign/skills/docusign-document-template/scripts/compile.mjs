#!/usr/bin/env node
/**
 * Compile a document template SPEC into the ZIP that Docusign's
 * Templates ▸ Document Templates ▸ Create New imports, or inspect a template someone exported.
 *
 *   node compile.mjs <template.spec.json> [--out <file.zip>]   write <slug>.zip (+ <slug>.json to read)
 *   node compile.mjs --inspect <export.zip | export.json>       what a Download ▸ Zip holds
 *
 * Exit 0: written. Exit 1: the spec has problems — each is printed and nothing is written.
 * Plain Node 18+, no dependencies: scripts/lib/ is generated from the gallery repo's measured
 * compiler and imports only node: built-ins.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildDocumentTemplate, documentTemplateZip } from './lib/document-template-spec.mjs';
import { readZip } from './lib/zip.mjs';
import { decodeAdf } from './lib/adf.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const inspect = flag('--inspect');
const outArg = flag('--out');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error(`cannot read ${file} as JSON: ${e.message}`); process.exit(1); }
}

/** One line per signer: its role and how many of each field kind it places. */
function signerLines(json) {
  return (json.recipients?.signers ?? []).map((s) => {
    const kinds = Object.entries(s.tabs ?? {}).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => `${v.length} ${k.replace(/Tabs$/, '')}`);
    return `  signer "${s.roleName}": ${kinds.join(', ') || 'no fields'}`;
  });
}

if (inspect) {
  const buf = fs.readFileSync(inspect);
  const json = buf.subarray(0, 2).toString('latin1') === 'PK'
    ? JSON.parse(readZip(buf).find((e) => e.path.endsWith('.json'))?.data.toString('utf8') ?? 'null')
    : JSON.parse(buf.toString('utf8'));
  if (!json?.document) { console.error('not a document template export (no "document" in the JSON)'); process.exit(1); }
  const adf = decodeAdf(Buffer.from(json.document.documentBase64, 'base64'));
  console.log(`"${json.name}" — ${json.agreementType ?? 'no agreement type'}, ADF v${adf.version} (${adf.version === 1 ? 'builder' : 'word'} format), status ${json.status}`);
  for (const f of json.document.docGenFormFields ?? []) console.log(`  field ${f.name ?? f.label}: ${f.type ?? ''}${f.required ? ' (required)' : ''}`);
  signerLines(json).forEach((l) => console.log(l));
  const out = path.join(path.dirname(inspect), path.basename(inspect).replace(/\.(zip|json)$/i, '') + '.decoded.json');
  fs.writeFileSync(out, `${JSON.stringify({ name: json.name, version: adf.version, model: adf.model, tree: adf.tree, markup: adf.markup }, null, 2)}\n`);
  console.log(`decoded body written to ${out} (read it to see the document's structure; it is not a spec)`);
  process.exit(0);
}

const specFile = args[0];
if (!specFile) {
  console.error('usage: node compile.mjs <template.spec.json> [--out <file.zip>] | --inspect <export.zip|json>');
  process.exit(1);
}
let compiled;
try { compiled = buildDocumentTemplate(readJson(specFile)); }
catch (e) { console.error(`ERROR   ${e.message}`); console.log('nothing written'); process.exit(1); }

const base = outArg ? outArg.replace(/\.zip$/i, '') : path.join(path.dirname(specFile), path.basename(specFile).replace(/(\.spec)?\.json$/i, ''));
fs.writeFileSync(`${base}.zip`, documentTemplateZip(compiled));
fs.writeFileSync(`${base}.json`, `${JSON.stringify(compiled.json, null, 2)}\n`);
const j = compiled.json;
console.log(`wrote ${base}.zip: "${j.name}" (${j.agreementType}), ${compiled.fields.length} sender field(s), ${compiled.printed.length} printed`);
signerLines(j).forEach((l) => console.log(l));
const unprinted = compiled.fields.map((f) => f.key).filter((k) => !compiled.printed.includes(k));
if (unprinted.length) console.log(`note: ${unprinted.join(', ')} ${unprinted.length === 1 ? 'drives rules but is' : 'drive rules but are'} never printed`);
