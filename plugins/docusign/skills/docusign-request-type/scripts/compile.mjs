#!/usr/bin/env node
/**
 * Compile Agreement Desk request-type SPECS into the ZIP that Docusign's
 * Requests ▸ Settings ▸ Request types ▸ Import takes.
 *
 *   node compile.mjs <type.spec.json> [--out <file.zip>]               one type
 *   node compile.mjs <a.spec.json> <b.spec.json> … --name "<package>"  several types in one package
 *                                                                       (split into parts if import would refuse it)
 *
 * Exit 0: written. Exit 1: a spec has problems — each is printed and nothing is written.
 * Plain Node 18+, no dependencies: scripts/lib/ is generated from the gallery repo's measured
 * compiler and imports only node: built-ins.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildRequestType, requestTypeZip, buildRequestTypePackage, packageZip, splitForImport } from './lib/request-type-spec.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const outArg = flag('--out');
const nameArg = flag('--name');
if (!args.length) {
  console.error('usage: node compile.mjs <type.spec.json> [more.spec.json …] [--name "<package name>"] [--out <file.zip>]');
  process.exit(1);
}
const fail = (lines) => { for (const l of lines) console.error(`ERROR   ${l}`); console.log('nothing written'); process.exit(1); };

const specs = args.map((f) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { fail([`cannot read ${f} as JSON: ${e.message}`]); }
});
const compiled = [];
const errors = [];
for (const s of specs) {
  try { compiled.push(buildRequestType(s)); }
  catch (e) { errors.push(`${s.id ?? '(no id)'}: ${e.message}`); }
}
if (errors.length) fail(errors);

/** The account-wide custom fields a set of types writes, once each. */
const fieldsOf = (types) => [...new Map(types.flatMap((t) => t.customFields).map((f) => [f.name, f])).values()];
const describe = (types, ofSpecs) => {
  for (const [i, t] of types.entries()) console.log(`  type "${ofSpecs[i].name}": ${Object.keys(t.form.formContent?.components ?? {}).length} form components`);
  const cf = fieldsOf(types);
  if (cf.length) {
    console.log(`  custom fields (C_…): ${cf.map((f) => `${f.name} "${f.label}" ${f.type}`).join(', ')}`);
    console.log('WARNING custom fields are account-wide and permanent: import creates or UPDATES them (a different label or option list on an existing field rewrites it in every form), and deleting the type leaves them');
  }
};

const dir = path.dirname(args[0]);
if (specs.length === 1) {
  const out = outArg ?? path.join(dir, `${specs[0].id}.request-type.zip`);
  fs.writeFileSync(out, requestTypeZip(compiled[0]));
  console.log(`wrote ${out}: "${specs[0].name}"`);
  describe(compiled, specs);
  process.exit(0);
}

// Several types: one package — or parts, because import refuses (and creates nothing from) a package past ~50 components.
const name = nameArg ?? 'Request types';
let parts;
try { parts = splitForImport(specs); }
catch (e) { fail([e.message]); }
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'request-types';
for (const [i, part] of parts.entries()) {
  const label = parts.length > 1 ? `${name} (part ${i + 1} of ${parts.length})` : name;
  let pkg;
  try { pkg = buildRequestTypePackage(label, part); }
  catch (e) { fail([e.message]); }   // e.g. one custom field defined two ways across the package
  const base = outArg ? outArg.replace(/\.zip$/i, '') : path.join(dir, `${slug}.request-types`);
  const out = parts.length > 1 ? `${base}.part-${i + 1}.zip` : `${base}.zip`;
  fs.writeFileSync(out, packageZip(pkg.files));
  console.log(`wrote ${out}: ${part.length} type(s) — ${part.map((s) => `"${s.name}"`).join(', ')}`);
  describe(pkg.types, part);
}
if (parts.length > 1) console.log(`import the ${parts.length} parts one at a time, waiting for each to finish`);
