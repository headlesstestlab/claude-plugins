#!/usr/bin/env node
/**
 * Compile a web form SPEC into the configuration JSON that Docusign's
 * Start ▸ Web Forms ▸ Upload Configuration accepts, and validate it.
 *
 *   node compile.mjs <form.spec.json> [--out <file.webform.json>]
 *   node compile.mjs --validate <config.json>      check an existing config (hand-edited or exported)
 *
 * Exit 0: written (warnings, if any, are printed and do not block).
 * Exit 1: the spec or config has problems; each is printed and nothing is written.
 *
 * Plain Node 18+, no dependencies: webform-spec.mjs is generated from the gallery repo's
 * measured compiler and imports nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildWebformConfig, validateWebformConfig, webformWarnings } from './webform-spec.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const validateOnly = flag('--validate');
const outArg = flag('--out');

function read(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error(`cannot read ${file} as JSON: ${e.message}`); process.exit(1); }
}

function report(cfg) {
  const problems = validateWebformConfig(cfg);
  for (const p of problems) console.error(`ERROR   ${p}`);
  for (const w of webformWarnings(cfg)) console.log(`WARNING ${w}`);
  // blocks.md marks the text a form owner must supply as <angle brackets>; one left in would be shown to respondents.
  for (const [k, c] of Object.entries(cfg.formContent?.components ?? {})) {
    const left = JSON.stringify(c).match(/<[A-Za-z][^<>"]{2,80}>/g);
    if (left) console.log(`WARNING ${k}: still holds placeholder text ${[...new Set(left)].join(', ')}; replace it before activating`);
  }
  return problems.length;
}

if (validateOnly) {
  const n = report(read(validateOnly));
  console.log(n ? `${n} problem(s): do not upload this file` : 'valid: ready to upload');
  process.exit(n ? 1 : 0);
}

const specFile = args[0];
if (!specFile) {
  console.error('usage: node compile.mjs <form.spec.json> [--out <file.webform.json>] | --validate <config.json>');
  process.exit(1);
}

let cfg;
try { cfg = buildWebformConfig(read(specFile)); }
catch (e) { console.error(`ERROR   ${e.message}`); process.exit(1); }   // validateSpec's list, one per line

if (report(cfg)) { console.log('nothing written'); process.exit(1); }

const out = outArg ?? path.join(path.dirname(specFile),
  path.basename(specFile).replace(/(\.spec)?\.json$/i, '') + '.webform.json');
fs.writeFileSync(out, `${JSON.stringify(cfg, null, 2)}\n`);
const comps = Object.values(cfg.formContent.components);
const inputs = comps.filter((c) => !['Root', 'Step', 'Welcome', 'Summary', 'Thankyou', 'FormSubmitAction', 'Section', 'TextDescription'].includes(c.componentType));
const pages = comps.filter((c) => c.componentType === 'Step' && c.stepMode !== 'prefill');
const rules = Object.keys(cfg.formContent.components.Root_Of_Journey?.componentRules?.componentRulesMap ?? {});
console.log(`wrote ${out}: "${cfg.formProperties.name}", ${pages.length} page(s), ${inputs.length} field(s), ${rules.length} rule(s)`);
