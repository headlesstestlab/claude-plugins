#!/usr/bin/env node
/**
 * Compile CLM specs: a CLM workflow (the designer's Import JSON), a CLM Doc Gen form (the form's configuration,
 * its build sheet and its Word template) or a CLM classic eForm (the HTML to paste, and its steps).
 *
 * A CLM workflow also gets <id>.setup.md: the task groups, people, attribute values and CLM settings it needs.
 *
 *   node compile.mjs <spec.json> [more …] [--out-dir <dir>] [--users <users.json>] [--folders <folders.json>] [--ids <ids.json>]
 *
 * The kind comes from the spec's shape: `steps` → CLM workflow, `sections` → eForm, `fields` → Doc Gen form.
 *   --users  {"<email>": "<CLM user GUID>"} for a workflow's { "user": "<email>" } participants
 *   --folders {"<folder name>": "<CLM folder uid>"} for a workflow's { "name": "<folder>" } folders
 *   --ids    {"Group.Field": "<attribute field id>"} for an eForm's attributes (the account's own ids)
 * Files are written beside each spec unless --out-dir is given.
 *
 * Exit 0: written. Exit 1: a spec has problems — each is printed and nothing is written for it.
 * Plain Node 18+, no dependencies: scripts/lib/ is generated from the gallery repo's measured compilers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { clmWorkflowSetup, compileClmWorkflow, validateClmSpec } from './lib/clm-workflow-spec.mjs';
import { compileDocgenForm, docgenMergeTags, docgenSheet, docgenTemplateDocx } from './lib/clm-docgen-form.mjs';
import { compileEform, eformSheet } from './lib/clm-eform-spec.mjs';
import { check } from './lib/asset-schemas.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const outDir = flag('--out-dir');
const readJson = (f, what) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { console.error(`ERROR   cannot read ${what} ${f} as JSON: ${e.message}`); process.exit(1); }
};
const usersArg = flag('--users');
const idsArg = flag('--ids');
const foldersArg = flag('--folders');
const users = usersArg ? readJson(usersArg, '--users') : {};
const ids = idsArg ? readJson(idsArg, '--ids') : {};
const folders = foldersArg ? readJson(foldersArg, '--folders') : undefined;
if (!args.length) {
  console.error('usage: node compile.mjs <spec.json> [more …] [--out-dir <dir>] [--users <users.json>] [--folders <folders.json>] [--ids <ids.json>]');
  process.exit(1);
}

let failed = 0;
for (const file of args) {
  const spec = readJson(file, 'spec');
  const dir = outDir ?? path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const write = (name, data) => { const p = path.join(dir, name); fs.writeFileSync(p, data); return p; };
  const json = (x) => `${JSON.stringify(x, null, 2)}\n`;
  try {
    if (Array.isArray(spec.steps)) {
      const errs = validateClmSpec(spec);
      if (errs.length) throw new Error(errs.join('; '));
      // A named user with no GUID given compiles to an empty assignee (it imports and publishes): picked after import.
      const unresolved = [];
      const unresolvedFolders = [];
      const wf = compileClmWorkflow(spec, { users, unresolved, ...(folders ? { folders } : {}), unresolvedFolders });
      const unmapped = [...new Set(unresolved.map((u) => u.user))];
      const problems = check('clm-workflow', wf);
      if (problems.length) throw new Error(`the compiled file fails the CLM workflow schema: ${problems.slice(0, 5).join('; ')}`);
      console.log(`wrote ${write(`${spec.id}.clm-workflow.json`, json(wf))}: CLM workflow "${spec.name}", ${spec.steps.length} steps`);
      console.log(`wrote ${write(`${spec.id}.setup.md`, clmWorkflowSetup(spec))}: the task groups, people, attribute values and CLM settings it needs, and the upload steps`);
      if (unmapped.length) console.log(`WARNING no CLM user GUID for ${unmapped.join(', ')} (--users): their steps carry an empty assignee; pick the user in the designer after import`);
      for (const f of unresolvedFolders) console.log(`WARNING no uid for the CLM folder "${f.folder}" (--folders): step ${f.step} carries an empty target folder; pick it in the designer after import`);
      if (/"(assignee|to)":/.test(JSON.stringify(spec))) console.log('WARNING every assignee arrives as the GUID in the file: check each assigned step in the designer');
      console.log('  after import: Save, then publish from the Versions panel (import does not publish)');
    } else if (Array.isArray(spec.sections)) {
      const c = compileEform(spec, { ids });
      const html = write(`${spec.id}.html`, c.html);
      const sheet = write(`${spec.id}.md`, eformSheet(spec, c, path.basename(html), spec.workflow));
      console.log(`wrote ${html} and ${sheet}: CLM eForm "${spec.name}", ${new Set(c.attributes).size} attribute(s), ${c.customIds.length} custom field(s)`);
      if (c.attributes.length) console.log(`WARNING these attributes must exist in an attribute group of the account: ${[...new Set(c.attributes)].join(', ')}`);
      if (c.missingIds.length) console.log(`WARNING ${c.missingIds.length} attribute field id(s) unknown (${c.missingIds.join(', ')}): the HTML holds REPLACE: placeholders; the steps file says how to fill them`);
    } else if (Array.isArray(spec.fields)) {
      const config = compileDocgenForm(spec);
      const written = [write(`${spec.id}.clm-form.json`, json(config)), write(`${spec.id}.clm-form.md`, docgenSheet(spec, docgenMergeTags(config)))];
      if (spec.template) written.push(write(`${spec.id}.docx`, docgenTemplateDocx(spec, spec.template)));
      console.log(`wrote ${written.join(', ')}: CLM Doc Gen form "${spec.name}", ${docgenMergeTags(config).length} merge tags`);
      if (!spec.template) console.log('WARNING no `template`: no Word template was written; a configuration needs one whose merge tags equal the form\'s');
    } else throw new Error('not a CLM spec: a workflow has `steps`, an eForm `sections`, a Doc Gen form `fields`');
  } catch (e) {
    console.error(`ERROR   ${file}: ${e.message}`);
    failed++;
  }
}
if (failed) { console.log(`${failed} spec(s) had errors; nothing was written for them`); process.exit(1); }
