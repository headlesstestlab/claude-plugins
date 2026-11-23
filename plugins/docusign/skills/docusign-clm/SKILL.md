---
name: docusign-clm
description: Builds Docusign CLM (Contract Lifecycle Management, formerly SpringCM) assets as files - Advanced Workflows as the designer's Import JSON (approvals, decisions, external review, signature, doc generation, child workflows, XPath on Params, attribute updates, folder moves), Doc Gen forms with their Word template, and classic eForms as HTML with attributes, show-if rules and the workflow each submit starts. Use it for anything that runs inside CLM - a CLM workflow, CLM intake or eForm, Doc Launcher or doc-gen form, a contract request, filing or metadata update in CLM - even if they only describe the process. Not for Workflow Builder (IAM) or Agreement Desk - use docusign-solution, docusign-workflow or docusign-request-type.
metadata:
  version: "v2026.11.23.5"
---

# Docusign CLM builder

This skill turns a CLM process into files:

| Asset | What you get | How it gets in |
|---|---|---|
| **CLM workflow** | `<id>.clm-workflow.json` and its setup sheet `<id>.setup.md` | the Workflow Designer's **Import**, then Save and publish |
| **CLM Doc Gen form** | `<id>.clm-form.json`, a build sheet `<id>.clm-form.md`, the Word template `<id>.docx` | no import: build the form from the sheet, then a configuration |
| **CLM eForm** | `<id>.html` and its steps `<id>.md` | no import: paste the HTML into the eForm designer |

Every rule in the compilers was measured against a live CLM account, so **never write these files by
hand.** Write a **spec**, and let `scripts/compile.mjs` build and check it.

## Workflow

### 1. Understand the process
Pin down:
- what starts it: a person by hand, an eForm submit, a Doc Gen configuration, an API call, a parent workflow;
- who approves, reviews or signs, in what order, and what happens on each outcome (approved, rejected,
  timed out, failed);
- which answers a form collects, and what each one is for.

Infer the obvious. Ask only what changes a file.

### 2. Pick the asset
`references/choosing.md` is the decision table. In short:
- a repeatable intake or task **inside CLM** whose answers classify the record or route a workflow:
  a **CLM eForm**, its submit folder, and the CLM workflow each submit starts;
- a **contract from a template** whose fields fill merge tags: a **CLM Doc Gen form** and a configuration;
- an intake that is a conversation (statuses, approvals, collaboration) on IAM: not CLM. Use the
  docusign-request-type skill. A form for people outside the company: the docusign-webform skill;
- a CLM intake that then drafts the contract: an eForm for the request, and its workflow opens the Doc
  Gen form prefilled (`prefillXml` → `createOrUploadDoc` `inputXml`). The Doc Gen configuration must
  launch a published workflow, or its form is an error page.

### 3. Write the specs
Start from the closest example in `references/examples/` (they belong to a fictional company,
"Fontara": use their shape, never their names):

| Example | Shows |
|---|---|
| `clm-workflows/internal-approval-and-signature` | Approve, a Decision on the deal tier, Send and Wait for Signature |
| `clm-workflows/msa-negotiation-external-review` | review and send, wait for the counterparty, each outcome recorded |
| `clm-workflows/external-review-with-comment-check` | a Rule on a variable |
| `clm-workflows/named-approver-with-system-variables` | a named user approves; `System.Link`, `System.Uid` in notices |
| `clm-workflows/docgen-intake-and-child` | Create or Upload Doc, XPath, Document Generation, a child workflow |
| `clm-workflows/nda-request-launched` | the workflow a Doc Gen configuration launches: reads `TemplateFieldData` |
| `clm-workflows/eform-request-prefills-draft` | `prefillXml`: an eForm's answers become the Doc Gen form's input XML, so the task's form opens filled in |
| `clm-workflows/archive-copy-and-status` | `updateMetadata` (an attribute), `copyOrMoveDocument` (copy with attributes, then move) |
| `clm-docgen-forms/msa-intake-form` | every field kind, a custom merge tag, a section, a table |
| `clm-docgen-forms/nda-request-conditional` | `mergeIf` conditions and a Word `template` |
| `clm-eforms/nda-request`, `contract-request` | intake eForms that start a workflow |
| `clm-eforms/third-party-paper` | show-if rules and a required attachment |
| `clm-eforms/vendor-onboarding` | a repeating attribute set |
| `clm-eforms/metadata-update` | a task form with `allowUpdates` |

The full references: `references/workflow-format.md` (CLM workflow), `references/docgen-format.md`
(Doc Gen form), `references/eform-format.md` and `references/eforms-guide.md` (eForm). For renewals, vendor paper and
external review, a CLM site integrated with Agreement Manager (CLM with IAM), or renaming workflows that smart rules
start, read `references/workflow-format.md` §7b first.

**CLM workflow rules** (the compiler refuses most violations):
- Names: letters, digits, spaces, `- _ '` only, at most 100 characters (no `·`), and unique in the account: an
  import under a name the account already has is refused, so check the Workflows list first.
- Folder names ≤100 characters (description ≤255), document names ≤255; none of `/ \ : * ? " < > |`, no leading or
  trailing space, no trailing period. An attribute value ≤400 characters; attribute and group names ≤50.
- A loop of `times` passes runs at least two activities a pass, and an instance stops at 10,000: split bigger work
  over several runs.
- Review and Send for Signature goes to one person (the submitter or a named user), never a task group: a
  group shows as a deleted user and no task appears.
- Every step is reachable, every step but Finish has a way out, and the workflow ends at a **Finish**.
- Declare every variable a step sets or reads. Never change `Params`; copy it first.
- A participant is `"submitter"` or `{ "user": "<email>" }`; a task's `assignee` can also be a task group,
  `{ "taskGroup": "<name>", "member"?: <participant> }`, which must exist on the account. A named user takes the account's CLM user GUID
  (`--users`), read from the account; without it the step's assignee is left empty, to pick after import. Never
  invent a GUID (the compiler refuses made-up ones such as `00000000-…`).
- An account folder is `{ "name": "<folder>" }`: its uid comes from `--folders`, read from the account; without it the
  target folder is left empty, to pick after import. Never write a made-up `{ "uid" }` (it is refused).
- Read an answer as text with `setVariable` `{ "var": "<path>" }`; an Evaluate an XPath must write an XML variable
  (into a Text variable it fails at run time). Give Document Generation with `outputDocuments` an
  `outputDocumentName`, and each Send for Signature recipient a `name`. A Doc Gen field a workflow fills is a text
  field, not a Text Box (it prints raw HTML).
- An eForm-started workflow reads an attribute at `Params ▸ Document ▸ <Group> ▸ <Field>` and a custom
  answer at `Document/CustomFormFields/<id>`. A Doc Gen-launched one reads `TemplateFieldData ▸ <tag>`.

**eForm rules: attribute or custom field?** For each answer ask: must it be **searched, reported on, or
route the workflow by attribute**? Then it is an attribute (`"kind": "attribute"`, `"Group.Field"`),
which must already exist in an attribute group of the account: this skill never creates attributes, so
list each missing one for the user. Every other answer is a custom field (`id` in camelCase letters and
digits), saved with the form only. Default: party, entity, business unit, owner, dates and
classification are attributes; free text, notes and one-off questions are custom. Also:
- use `select`, never radio buttons; give every option a value;
- keep the first form short (sections of 3–6 fields), with `showIf` for an optional part;
- `allowUpdates` only for a form a task edits again;
- never rename a custom id that submitted forms already hold (`keepIds`).

**Doc Gen form rules:** merge tags have no spaces or special characters; a dropdown tag does not end in
`Dropdown`; at most 50 options and 16 table columns; a condition's source is a dropdown, radio or checkbox.

### 4. Check what is supported
Look each need up in `references/capabilities.md`:
- **proven**: build it;
- **compiled-unproven**: build it, and tell the user it is not yet proven live (for example the Extract
  PDF Fields step);
- **refused** or **not-modelled**: don't fake it. Tell the user, with the nearest supported pattern
  (public eForms, creating attributes, and most of the 109 designer steps are not built here).

### 5. Compile
```bash
node <skill-dir>/scripts/compile.mjs <spec.json> [more …] [--out-dir <dir>] [--users users.json] [--ids ids.json]
```
- The kind comes from the spec's shape. `--users` maps emails to CLM user GUIDs; `--ids` maps
  `"Group.Field"` to the account's attribute field ids (otherwise the HTML holds `REPLACE:` placeholders,
  and the steps file says how to fill them).
- **ERROR** means nothing was written for that spec. Pass every **WARNING** to the user.

### 6. Deliver
Give the user the files, the specs and a short summary: what starts it, each step and outcome, the
attributes and folders it needs, and anything not built. Give them each workflow's `<id>.setup.md` (the compile writes
it): it is their checklist of task groups, people, attribute values and CLM settings, so copy from it, not from memory. Then the upload steps, in this order
(`references/upload.md` has the screens, the checks after and the common errors):
1. **CLM workflow:** Automation Tools ▸ Workflows ▸ New Workflow ▸ Advanced Workflow ▸ "start without
   content" ▸ Create ▸ **Import** the `.json` ▸ **Save**. Re-pick every assignee, then publish from the
   Versions panel. A form or configuration that starts it needs it published.
2. **Doc Gen form:** Document Generation ▸ Forms ▸ Create Form, field by field from the build sheet. Then
   upload the `.docx` into the destination folder, and Document Generation ▸ Configurations ▸ Add
   Configuration: the form, the `.docx`, the folder, and the workflow to launch.
3. **eForm:** Admin ▸ eForms ▸ Form ▸ Create ▸ paste the `.html` ▸ Save; then Routing ▸ Set Submit
   Folder, Routing ▸ Set Workflow, Access ▸ Allow Submission, as the `<id>.md` steps say. **Every Save
   turns Allow Submission off again.**

**CLM account settings to confirm** (CLM ▸ Admin; tell the user for each step kind the workflow uses):
- signature steps: Electronic Signature Settings has the e-signature service user (Account-Wide access, Send on
  Behalf; under SSO its login policy must let it sign in) and the signing order;
- task steps (approve, choice, edit, review data, fill or edit a form, choose documents or users): unified task
  management and the updated task page are on;
- external review: completion by email is on;
- Use Docusign AI: the AI Data Insights step and Agreement Summarization (ask Docusign if not offered);
- party steps: party management is on;
- a child workflow: Next Workflow Step Wait Time ≤ 90 s, and Delay purge for workflows with sub-workflows on.

Never import, publish, start a workflow or submit a form for the user unless they ask and confirm each
item; a run can send email and envelopes.

## Files
- `scripts/compile.mjs`: specs → workflow JSON, Doc Gen form files or eForm HTML, with checks.
- `scripts/lib/`, `scripts/assets/`, `scripts/docs/`: the compilers and their data, generated from the
  gallery repo. Don't edit them.
- `references/choosing.md`: which form for which need.
- `references/workflow-format.md`, `references/docgen-format.md`, `references/eform-format.md`,
  `references/eforms-guide.md`: the spec references and the product facts.
- `references/capabilities.md`: what is proven, compiled-unproven, refused or not modelled.
- `references/examples/`: every library spec, by kind; `expected.json` is the selftest's answer key.
- `references/upload.md`: the upload screens, the checks after and the common errors.
