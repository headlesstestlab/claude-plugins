#!/usr/bin/env node
/**
 * Turn a web form downloaded with "Download Configuration" into a file that uploads cleanly into
 * another account (or back into this one as a copy): strips server-owned ids and dates, the brand,
 * and account-bound verification-app bindings, and forces standalone.
 *
 *   node portable.mjs <exported.json> [--out <file.webform.json>]
 *
 * A template-linked form loses its template here, and upload accepts only standalone forms, so
 * its signing step does not survive. The script says so when that is the case.
 */
import fs from 'node:fs';
import path from 'node:path';
import { portableConfig, validateWebformConfig, webformWarnings } from './webform-spec.mjs';

const args = process.argv.slice(2);
const i = args.indexOf('--out');
const outArg = i >= 0 ? args.splice(i, 2)[1] : undefined;
const file = args[0];
if (!file) { console.error('usage: node portable.mjs <exported.json> [--out <file.webform.json>]'); process.exit(1); }

const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
if (exported.formContent?.isStandalone === false || (exported.formContent?.templates ?? []).length) {
  console.log('NOTE    this export is template-linked; the copy is standalone, so it will collect data but generate no envelope');
}
const cfg = portableConfig(exported);
const problems = validateWebformConfig(cfg);
for (const p of problems) console.error(`ERROR   ${p}`);
for (const w of webformWarnings(cfg)) console.log(`WARNING ${w}`);
if (problems.length) { console.log('nothing written'); process.exit(1); }

const out = outArg ?? path.join(path.dirname(file), path.basename(file, '.json') + '.portable.webform.json');
fs.writeFileSync(out, `${JSON.stringify(cfg, null, 2)}\n`);
console.log(`wrote ${out}`);
