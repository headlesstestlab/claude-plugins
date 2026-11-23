#!/usr/bin/env node
/**
 * Compile a Docusign SOLUTION manifest into its bundle, with every offline check.
 *
 *   node compile.mjs <project>/manifest.json [--account <values.json>] [--out <file.zip>] [--lab-prefix "ZZ Lab "] [--no-print]
 *
 * The project folder holds the specs the manifest writes, in `<kind>/specs/<id>.json`; the skill's library
 * (references/library/) is the other spec root, so a manifest can name any library spec by id. `account.json`
 * beside the manifest is used when --account is not given.
 *
 * The project's own eSignature templates (`esign-templates/specs/<id>.json`) need their PDFs in `esign-templates/documents/`:
 * each missing one is printed first with headless Chrome or Chromium (set CHROME to its path if it is not found);
 * --no-print writes only the HTML beside it, to print by hand.
 *
 * Exit 0: written (WARNING lines are for the user). Exit 1: refused, every problem printed; nothing written.
 * Plain Node 18+, no dependencies: scripts/lib/ is generated from the gallery repo's measured compilers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSolution } from './lib/solution-check.mjs';
import { printEsignPdfs } from './lib/esign-template-print.mjs';
import { printAccountSettings } from './account-settings.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.dirname(HERE);
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const accountArg = flag('--account');
const outArg = flag('--out');
// --lab-prefix "ZZ Lab ": a lab copy for testing. It changes object NAMES only (namePrefix); placeholder addresses and
// people stay as they are, to be replaced in the account as the README says.
const labPrefix = flag('--lab-prefix');
const noPrint = args.includes('--no-print') && args.splice(args.indexOf('--no-print'), 1);
const file = args[0];
if (!file) { console.error('usage: node compile.mjs <project>/manifest.json [--account <values.json>] [--out <file.zip>]'); process.exit(1); }

const fail = (lines) => { for (const l of lines) console.error(`ERROR   ${l}`); console.log('nothing written'); process.exit(1); };
const readJson = (f, what) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { fail([`cannot read ${what} ${f}: ${e.message}`]); } };

const manifest0 = readJson(file, 'the manifest');
const manifest = labPrefix !== undefined ? { ...manifest0, namePrefix: labPrefix } : manifest0;
const project = path.dirname(path.resolve(file));
const accountFile = accountArg ?? (fs.existsSync(path.join(project, 'account.json')) ? path.join(project, 'account.json') : undefined);
const values = accountFile ? readJson(accountFile, 'the account values') : undefined;

// The project's own eSignature templates: print each missing PDF before the compile reads it.
let printing;
try { printing = printEsignPdfs(project, noPrint ? { browser: null } : {}); } catch (e) { fail([e.message]); }
for (const p of printing.printed) console.log(`printed ${path.relative(process.cwd(), p)}`);
if (printing.missing.length) fail([`no PDF for ${printing.missing.map((p) => path.relative(process.cwd(), p)).join(', ')}`,
  `print the HTML beside each one to that PDF (Letter, no headers or footers; the page margins are in the HTML), then run this again${noPrint ? '' : ' — or set CHROME to a Chrome or Chromium binary'}`]);

const r = checkSolution(manifest, {
  roots: [project, path.join(SKILL, 'references', 'library')],
  exportKeys: readJson(path.join(HERE, 'lib', 'export-keys.json'), 'the export keys').types,
  capabilities: readJson(path.join(SKILL, 'references', 'capabilities.json'), 'the capability map').capabilities,
  ...(values ? { values } : {}),
  builtBy: 'the docusign-solution skill (`node scripts/compile.mjs`)',
});
if (r.errors.length) fail(r.errors);
const b = r.bundle;
const out = path.resolve(outArg ?? path.join(project, `${b.id}.bundle.zip`));
fs.writeFileSync(out, b.zip);
for (const w of r.warnings) console.log(`WARNING ${w}`);
console.log(`wrote ${out}`);
for (const s of b.steps) console.log(`  ${s.n}. ${s.kind}: ${s.name}`);
for (const f of b.files) if (/esign-template.*\.json$/.test(f.path)) printAccountSettings(JSON.parse(f.data), `${f.path}: `);
for (const p of b.solution.prerequisites) console.log(`  ${p.check === 'counted' ? 'COUNTED' : 'CONFIRM'} ${p.text}`);
// A gap whose `instead` starts with "built" is built, only not proven live (the README lists it so too).
for (const g of b.solution.gaps) console.log(/^built\b/i.test(g.instead?.trim() ?? '') ? `  UNPROVEN ${g.need} — ${g.instead}` : `  NOT BUILT ${g.need}${g.instead ? ` — instead: ${g.instead}` : ''}`);
