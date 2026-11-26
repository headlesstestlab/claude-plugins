---
name: docusign-workflow
description: Builds one Docusign Workflow Builder (formerly Maestro) workflow as an Import Workflow .zip - steps, approvals, parallel reviews, branches, identity checks and the start (link, Salesforce Flow, API call, envelope event or schedule), with optional upload in the user's signed-in browser. Use it when the request is only the automation and every document already exists or is uploaded at send time - notify people when an envelope completes or is declined, route a contract through a chain of approvers (any number, in order or in parallel), send a PDF a system already produced, have someone upload a file for another to acknowledge, a scheduled reminder or report. Not when a document, agreement, form, request type or AI agent must be built as well (a policy to acknowledge, an agreement with deal data, an intake form) - use docusign-solution.
metadata:
  version: "v2026.11.25.3"
---

# Docusign workflow builder

This skill turns a described process into a **Workflow Builder workflow package**: the `.zip` that
Automations ▸ Workflows ▸ Create Workflow ▸ **Import Workflow** takes.

The import endpoint answers any malformed package with the same opaque error. Worse, a package can
import cleanly and still show broken steps on the canvas. Every rule in the compiler was learned
against the live product, so **never write the definition or the package by hand.** Write a
**spec**, and let `scripts/compile.mjs` build and check the package.

## What it can build
- **Starts:**
  - from a link, manually, or by API (a Human or Automated process, with typed starting values);
  - from an Event (envelope completed, declined, voided, recipient events, …);
  - on a Schedule;
  - from an Agreement Desk request, or a request status change;
  - from a CLM workflow.
- **Steps:**
  - collect data with a web form;
  - generate a document from a document template, and send it for signature;
  - send an email, invite a participant, or show a confirmation screen;
  - branch with `if` or `switch`, or run `parallel` lanes;
  - ID data collection and risk assessment;
  - create an Agreement Desk request, plus the request steps (owner, status, due date, approval,
    followers, message, permissions, title);
  - connected-app steps: Salesforce read / write / files, Stripe, a lookup table, Make a Web Request,
    and the Docusign CLM app (archive, start a CLM workflow). Each needs the importing account's own
    active connection; `references/spec-format.md` lists them.

**What it can't carry:**
- **eSignature-template steps** (`esign`) need a PDF rendered from a template. Use **generate from a
  document template → sign** instead, or the docusign-solution skill: its bundle carries a library
  eSignature template in the workflow's package.
- **AI-agent steps** (`agent`) name an agent that must already be published in the importing
  account. Leave them out, and suggest adding the agent in the builder after import.

Tell the user about these limits when the request needs them; `compile.mjs` refuses both anyway.

## Workflow

### 1. Understand the process
Pin down:
- **How it starts**, and what starting data arrives (API variables, the request's fields, the
  event).
- **Who takes part:** the starter, plus any other participants. For each, decide where their name
  and email come from: a form answer `<form>.<field>`, a starting value `start.<name>`, or a fixed
  address.
- **The steps in order**, the decisions that branch, and what happens at the end.

Infer the obvious. Ask only what changes the design, such as who signs or what starts it.

### 2. Lay out the project folder
```
<project>/
  workflows/specs/<id>.json             the workflow
  webforms/specs/<id>.json              a form step's web form            (docusign-webform spec format)
  document-templates/specs/<id>.json    a generate step's template        (docusign-document-template spec format)
  request-types/specs/<id>.json         a request start or createRequest  (copy the shape from the examples)
```
A step names an asset by its id; the compiler reads that asset's spec and puts it in the package.
Write each web form or document template with its own skill's rules, and compile it with that skill
too, which catches its errors early.

### 3. Write the workflow spec
`references/spec-format.md` is the full reference: every key, start method, step, branch operator,
scoping rule and merge rule. Start from the closest example in `references/examples/`, each a
complete project folder:

| Example | Shows |
|---|---|
| `account-request-routing` | API start, `switch`, email, confirm; carries nothing else |
| `strategic-deal-quote` | API start, `switch`, generate from a template, sign |
| `signed-contract-handoff` | Event start, invite, create a request |
| `vendor-parallel-review` | request start, `parallel` lanes, approval |

The rules that break workflows (the compiler refuses most violations):
- **Who exists when.** Under a link, Manual or API (Human) start, the starter is the first step's
  participant. Every *other* participant needs an `invite` (with a non-empty message) before their
  first step, on the same path. Under an Event, Schedule, CLM or Automated API start there is no
  starter, so everyone needs an invite. Once someone else has acted, bring the starter back with
  `{"invite": {"participant": "starter"}}`.
- **Data made inside a branch is gone after the merge.** Use a branch's form, document or approval
  inside that branch, or make it before the rule.
- **One document per send:** each `generate` is followed by its own `sign`.
- **`{{merge}}` text** works only in certain fields: email subject and body, confirm title, invite
  subject, request titles and messages. It is refused elsewhere.
- **Limits:** at most 15 cases per `switch`, 2–15 lanes per `parallel`, and at most 2 parallels per
  workflow with one participant per lane. A status name is 40 characters at most. No email or
  createRequest after an Agreement Desk start.

### 4. Compile
```bash
node <skill-dir>/scripts/compile.mjs <project>/workflows/specs/<id>.json
```
This writes `<id>.workflow.zip` beside the spec and prints what the package will create.
- **ERROR** lines mean nothing was written. Each says what is wrong and where: an unknown key, a
  missing participant invite, a missing referenced spec (with the file it expected).
- **WARNING** lines must be passed to the user, especially that request types add permanent,
  account-wide custom fields.

### 5. Deliver
Give the user the `.zip` and the project folder, and summarise the workflow in a few lines:
- how it starts;
- who takes part;
- each step and branch;
- what the import will create.

Then give these upload steps:
1. In Docusign: **Automations ▸ Workflows ▸ Create Workflow ▸ Import Workflow**, then choose the
   `.zip`. Import makes **new copies** of the workflow and of everything it carries; it never
   overwrites. If it reports "Virus scan failed", try again.
2. Open the imported workflow and **check the canvas**: every step should render with no error
   marker. A clean import can still show a step error on the canvas. Fix that step in the builder
   (or in the spec, then re-import).
3. **Publish** it yourself when it looks right, and test it once with a real run.

Read `references/gotchas.md` for what happens after import, and tell the user before the import
about anything it needs on their account: each connected app's active connection, the named users
and groups, and Docusign Connect for an event or schedule start.

### 6. Optional: upload it for them
Do this only if the user asks, and only with their explicit OK for this specific package. Follow
`references/live-upload.md`: their own signed-in browser, never their credentials, import and
inspect only. **Never publish or run the workflow**; those stay the user's.

## Hand-off (always the last step)

Do this every time you finish, without being asked: the user must never have to ask where the file is.

1. **Name it** `<customer>-<process>-workflow.zip` (lowercase words and hyphens, for example `acme-contract-approval-workflow.zip`): pass it to `--out`. Never a bare name such as `bundle.zip`.
2. **Share it as a file**, in each way your surface has:
   - a folder the user picked or named (Cowork): write it there;
   - `/mnt/user-data/outputs/` exists (the Claude app, claude.ai): copy it there and share it with your file-sharing
     (present files) tool, so the chat shows a file card with a download arrow. A file only in your workspace
     (`/home/claude/…`) cannot be downloaded;
   - otherwise (Claude Code, on the user's computer): it is on their disk already; print its absolute path.
   Never say a file is shared or saved where you did not put it.
3. **End your reply with this block**, filled in (keep all three places unless you are sure which surface you are on):

   **Your workflow:** `<customer>-<process>-workflow.zip` — download it from the file card above (Claude app/chat) · it's in `<folder>` (Cowork) · `<absolute path>` (Claude Code).
   **Next:** Demo Hydrator ▸ Asset exchange ▸ Load a bundle, drop the .zip (or in Docusign: Automations ▸ Workflows ▸ Create Workflow ▸ Import Workflow).

## Files
- `scripts/compile.mjs`: spec (with its project folder) to an Import Workflow `.zip`, with checks.
- `scripts/lib/`: the compiler and the export-key table. It is generated from the gallery repo;
  don't edit it.
- `references/spec-format.md`: every key, start, step, operator and rule.
- `references/account-binding.md`: your account's id and Salesforce / CLM connections for connected-app steps (without them a package carries placeholders: set your Salesforce connection first).
- `references/examples/<id>/`: four complete project folders.
- `references/gotchas.md`: behaviour after import.
- `references/live-upload.md`: the browser import procedure.
