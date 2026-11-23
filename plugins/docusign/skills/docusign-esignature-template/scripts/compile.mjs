#!/usr/bin/env node
/**
 * Compile an eSignature template SPEC into the template JSON that Templates ▸ Start ▸ Envelope Templates ▸
 * Upload Template takes.
 *
 *   node compile.mjs <project>/esign-templates/specs/<id>.json [--out <file.json>] [--no-print]
 *
 * The documents are PDFs in <project>/esign-templates/documents/ (<id>.pdf, then <id>-2.pdf … for more documents).
 * When one is missing, this writes the document's HTML there and prints it to PDF with headless Chrome or Chromium
 * (set CHROME to the browser's path if it is not found). --no-print only writes the HTML.
 *
 * Exit 0: written. Exit 1: the spec has problems, or a PDF is missing — each is printed and no template is written.
 * Plain Node 18+, no dependencies: scripts/lib/ is generated from the gallery repo's measured compiler.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildEsignTemplate, esignPdfPath, salesforceEnvelopeConfig } from './lib/esign-template-spec.mjs';
import { printEsignPdfs } from './lib/esign-template-print.mjs';
import { printAccountSettings } from './account-settings.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const outArg = flag('--out');
const noPrint = args.includes('--no-print') && args.splice(args.indexOf('--no-print'), 1);
const fail = (lines) => { for (const l of lines) console.error(`ERROR   ${l}`); console.log('nothing written'); process.exit(1); };
if (args.length !== 1) fail(['usage: node compile.mjs <project>/esign-templates/specs/<id>.json [--out <file.json>] [--no-print]']);

const file = path.resolve(args[0]);
const specs = path.dirname(file);
if (path.basename(specs) !== 'specs' || path.basename(path.dirname(specs)) !== 'esign-templates') fail([`${args[0]}: put the spec at <project>/esign-templates/specs/<id>.json (its PDFs go in <project>/esign-templates/documents/)`]);
const project = path.dirname(path.dirname(specs));
let spec;
try { spec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail([`cannot read ${args[0]} as JSON: ${e.message}`]); }
if (spec.id !== path.basename(file, '.json')) fail([`the spec's id "${spec.id}" must be its file name (${path.basename(file, '.json')})`]);

// First without PDFs: checks the spec and renders each document's HTML.
let draft;
try { draft = buildEsignTemplate(spec); } catch (e) { fail([e.message]); }

// Print each missing PDF (headless Chrome or Chromium; --no-print writes only the HTML beside it).
const { printed, missing } = printEsignPdfs(project, { ids: [spec.id], ...(noPrint ? { browser: null } : {}) });
for (const p of printed) console.log(`printed ${path.relative(process.cwd(), p)}`);
if (missing.length) fail([`no PDF for ${missing.map((p) => path.relative(process.cwd(), p)).join(', ')}`,
  `print the HTML beside each one to that PDF (Letter, no headers or footers; the page margins are in the HTML), then run this again${noPrint ? '' : ' — or set CHROME to a Chrome or Chromium binary'}`]);

const pdfPaths = draft.documents.map((_, k) => esignPdfPath(spec.id, k + 1, project));
const pdfs = pdfPaths.map((p) => fs.readFileSync(p));
let c;
try { c = buildEsignTemplate(spec, { pdfs }); } catch (e) { fail([e.message]); }
const out = outArg ?? path.join(path.dirname(file), '..', '..', `${spec.id}.esign-template.json`);
fs.writeFileSync(out, `${JSON.stringify(c.template, null, 2)}\n`);
console.log(`wrote ${path.relative(process.cwd(), out)}: "${c.name}"`);
console.log(`  ${c.documents.length} document(s), ${c.anchors.length} tabs; signer roles in order: ${c.roles.join(', ')}`);
console.log(`  fields as tabs: ${c.tabFields.join(', ') || 'none'}`);
const base = out.replace(/\.esign-template\.json$|\.json$/, '');
if (c.powerForm) {
  fs.writeFileSync(`${base}.powerform.json`, `${JSON.stringify(c.powerForm, null, 2)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), `${base}.powerform.json`)}: POST /powerforms after the upload, with "templateId" set to the uploaded template's id`);
}
if (spec.salesforce) {
  let tree;
  try { tree = salesforceEnvelopeConfig(spec, c, { docusignTemplateId: '<uploaded template id>' }); } catch (e) { fail([e.message]); }
  fs.writeFileSync(`${base}.salesforce-tree.json`, `${JSON.stringify(tree, null, 2)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), `${base}.salesforce-tree.json`)}: the eSignature for Salesforce envelope template (compiled, not proven by a send); replace <uploaded template id> first`);
}
printAccountSettings(c.template);
for (const w of c.warnings) console.log(`WARNING ${w}`);
