#!/usr/bin/env node
/**
 * Validate an Agent Studio AGENT SPEC and write its build sheet: a step-by-step, copy-paste page for
 * Docusign's Agent Studio editor (Automations ▸ Agents ▸ Create New). Agent Studio has no import, so
 * the sheet — not a file — is what carries the agent into an account.
 *
 *   node compile.mjs <agent.spec.json> [--out <file.md>]     writes <id>.build-sheet.md
 *
 * Exit 0: written. Exit 1: the spec has problems — each is printed and nothing is written.
 * Plain Node 18+, no dependencies: scripts/lib/agent-spec.mjs is generated from the gallery repo's
 * measured compiler (the same rules the editor enforces, and the capability → tool table).
 */
import fs from 'node:fs';
import path from 'node:path';
import { CAPABILITIES, KNOWLEDGE_FORMATS, compileAgent, instructionsOf, validateAgent } from './lib/agent-spec.mjs';

const args = process.argv.slice(2);
const i = args.indexOf('--out');
const outArg = i >= 0 ? args.splice(i, 2)[1] : undefined;
const file = args[0];
if (!file) { console.error('usage: node compile.mjs <agent.spec.json> [--out <file.md>]'); process.exit(1); }
const fail = (lines) => { for (const l of lines) console.error(`ERROR   ${l}`); console.log('nothing written'); process.exit(1); };

let spec;
try { spec = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { fail([`cannot read ${file} as JSON: ${e.message}`]); }

// The editor offers capabilities, never single tools: extraTools exist only for API-created agents.
const errors = [];
if (spec.extraTools?.length) errors.push(`"extraTools" (${spec.extraTools.join(', ')}) can't be added in the Agent Studio editor, which offers whole capabilities only. Remove them, or pick the capability that covers the need`);
errors.push(...validateAgent({ ...spec, extraTools: undefined }));
// Knowledge files are the user's own, beside the spec; the editor uploads them (PDF, TXT, DOC, DOCX, CSV).
const dir = path.dirname(path.resolve(file));
for (const k of spec.knowledge ?? []) if (!fs.existsSync(path.resolve(dir, k.file))) errors.push(`knowledge file "${k.file}" not found next to the spec (${path.resolve(dir, k.file)})`);
if (errors.length) fail(errors);
compileAgent({ ...spec, extraTools: undefined }, { stamp: 0 });   // the full compile: anything it refuses, the catalog would store wrongly

const caps = spec.capabilities.map((c) => CAPABILITIES.find((x) => x.id === c));
const outputs = spec.outputs ?? [];
const prompts = spec.starterPrompts ?? [];
const FORMAT = { string: 'String', number: 'Number', boolean: 'Boolean' };
const fence = (text) => { const ticks = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1))); return `${ticks}markdown\n${text}\n${ticks}`; };

const warn = [];
if (caps.some((c) => c.acts)) warn.push(`**This agent can create or change things** (${caps.filter((c) => c.acts).map((c) => c.label).join(', ')}). The editor will show "This agent has been granted write permissions". That's expected; test it on data you can afford to change.`);
if (caps.some((c) => c.interactive) && outputs.length) warn.push('**Ask the User pauses for a person.** Inside a workflow nobody answers, so the run would wait forever. Use this agent in chat, or remove Ask the User before using it in a workflow.');
for (const c of caps.filter((c) => c.needs)) warn.push(`**${c.label} needs ${c.needs}** in the account, or the agent's searches return nothing.`);

const steps = [];
steps.push(`1. Open **Automations ▸ Agents** and choose **Create New**. If it offers **✦ Create Agent** (the AI builder), skip it: the builder writes instructions of its own, and this sheet already has them. Fill in the editor directly.`);
steps.push(`2. **Name:** \`${spec.name}\`\n   **Description:**\n   > ${spec.description || '(leave empty)'}`);
let n = 3;
if (prompts.length) steps.push(`${n++}. Under **Define what starts this agent**, open **In chat** and add these conversation starter prompts, then **Save**:\n${prompts.map((p) => `   - ${p}`).join('\n')}`);
if (outputs.length) steps.push(`${n++}. Open **In a workflow** and add one output per row (**More Outputs** for the next), then **Save**:\n\n   | Name | Format | Description |\n   |---|---|---|\n${outputs.map((o) => `   | \`${o.name}\` | ${FORMAT[o.format]} | ${o.description.replace(/\|/g, '\\|')} |`).join('\n')}`);
steps.push(`${n++}. **Instructions:** paste the text below. It's markdown, and the editor renders \`##\` as a heading and \`1.\`/\`-\` as lists. After pasting, check that the headings and lists show as formatted text, not as \`#\` and \`-\` characters. If they show raw, apply them with the editor's toolbar (Heading level, lists).\n\n${fence(instructionsOf(spec)).replace(/^/gm, '   ')}`);
steps.push(caps.length
  ? `${n++}. **Capabilities:** add exactly these, and no others:\n${caps.map((c) => `   - **${c.label}**${c.acts ? ' (writes)' : ''}${c.interactive ? ' (pauses for the user)' : ''}`).join('\n')}`
  : `${n++}. **Capabilities:** add none. This agent works from its instructions and the prompt alone.`);
if (spec.knowledge?.length) steps.push(`${n++}. **Knowledge Sources ▸ + Add ▸ Upload documents:** upload ${spec.knowledge.map((k) => `\`${k.file}\`${k.name ? ` (shown as "${k.name}")` : ''}`).join(', ')}. The editor takes ${KNOWLEDGE_FORMATS.map((f) => f.toUpperCase()).join(', ')}. An agent only searches its knowledge when it has at least one capability.`);
steps.push(`${n++}. **Save draft.** Nothing runs until it is published.`);
steps.push(spec.testPrompt
  ? `${n++}. **Test** (a live run against the account's real data). Ask:\n   > ${spec.testPrompt}\n${spec.testExpect ? `   A good answer contains: ${[spec.testExpect].flat().map((x) => `"${x}"`).join(', ')}.` : ''}${caps.some((c) => c.acts) ? '\n   This agent can change data: test it only on records you can afford to change.' : ''}`
  : `${n++}. **Test** it with a question about real data in the account. It's a live run, not a simulation${caps.some((c) => c.acts) ? ', and this agent can change data' : ''}.`);
steps.push(`${n++}. **Publish** when the answers are right. Only a published agent can be picked in a workflow's **Execute AI Agent** step${outputs.length ? `, whose later steps then read the outputs as \`<step name>.<output>\`` : ''}.`);

const sheet = [
  `# Agent Studio build sheet: ${spec.name}`,
  '',
  `${spec.summary ?? spec.description}`,
  '',
  `Built from \`${path.basename(file)}\`. Agent Studio has no import, so follow these steps in the editor. It takes about five minutes. Every value below was checked against the editor's own limits.`,
  ...(warn.length ? ['', ...warn.map((w) => `> ${w}`)] : []),
  '',
  '## Steps',
  '',
  ...steps.flatMap((s) => [s, '']),
  '## After creating it',
  '- **Share** it (Agent Actions ▸ Share) with the people or groups who should use it: Can Use, Can Edit or Can Manage.',
  '- Re-create rather than edit when the spec changes a lot. A hand edit in the editor is the agent\'s new truth, and it no longer matches this sheet.',
  '- An account holds at most 100 agents, drafts included. Delete experiments you don\'t keep.',
  '',
].join('\n');

const out = outArg ?? path.join(path.dirname(file), `${spec.id}.build-sheet.md`);
fs.writeFileSync(out, sheet);
console.log(`wrote ${out}: "${spec.name}", ${caps.length} capabilit${caps.length === 1 ? 'y' : 'ies'}${caps.length ? ` (${caps.map((c) => c.label).join(', ')})` : ''}, ${outputs.length} workflow output(s), ${prompts.length} starter prompt(s)`);
for (const w of warn) console.log(`WARNING ${w.replace(/\*\*/g, '')}`);
