---
name: docusign-webform
description: Builds a Docusign Web Form as an importable configuration .json (Start ▸ Web Forms ▸ Upload Configuration) - intake, registration, survey, application, onboarding or claims forms with pages, fields, uploads, validation and show/hide rules, with optional upload and activation in the user's signed-in browser. Use it when someone wants only a data-collection form - create, convert or fix a web form, a web form JSON or form config, or clean an exported form for re-upload. Not when anyone signs on or after the form, or the submission must generate a document, send an email or route approvals - that needs a template or workflow as well, so use docusign-solution.
metadata:
  version: "v2026.11.24.3"
---

# Docusign Web Form builder

This skill turns a plain-language use case into a Docusign **web form configuration file**, the
`.json` that **Start ▸ Web Forms ▸ Upload Configuration** imports. Every rule the compiler applies
was measured against the live product. No public schema exists, and the upload endpoint accepts
almost anything, broken forms included. So **never write the configuration JSON by hand.** Write a
short **spec**, then let `scripts/compile.mjs` turn it into the config and validate it.

## What this can and cannot build

Upload accepts **standalone** web forms only. A standalone form collects data, shows a review page
and a thank-you page, and creates **no envelope, no template tabs and no Docusign signature**. A
template-linked form, the "fill it in, then sign it" kind, is refused on upload. That kind can only
be built in the Web Forms builder from an eSignature template.

Tell the user this early if their request needs signing. Then offer one of:
- a standalone form with a **typed-name attestation** (`references/blocks.md`), which is fine for
  acknowledgements, consents and internal attestations;
- the standalone form, plus a note that they can build the signing version in the builder (Start ▸
  Web Forms ▸ Create ▸ from a template). The docusign-solution skill (`webformTemplates`) builds that
  eSignature template and a field-by-field sheet for the builder. Its template may have only remote
  signers, copies and viewers: an in-person, witness or notary role cannot be on a web form.

Field types that do not exist, and what to use instead:

| Asked for | Use |
|---|---|
| Signature / initials | typed-name attestation block |
| Address component | street / city / state / ZIP fields (US address block) |
| URL, time, VIN, EIN, IBAN, ID numbers | `text` with an anchored `pattern` (see the table in `blocks.md`) |
| Country picker | `dropdown` with a list of countries |
| Repeating rows ("add another") | a fixed number of slots, each section shown by a rule ("How many dependents?" → show dependent 1..N) |
| Cross-field checks (end after start, two values match) | not possible; say so in help text |
| Yes/No toggle | `radio` with Yes / No |
| Rating / NPS / Likert | `radio` with the scale as options |

## Workflow

### 1. Understand the form
Find out the purpose, who fills it in, the pages, the fields (and which are required), any
conditional logic ("only ask X if Y"), the language (`en` or `ja`), and the welcome and thank-you
wording. **Infer sensible defaults rather than asking about everything.** A good form for the stated
purpose is better than a questionnaire about the questionnaire. Ask only what changes the form a
lot, such as who the audience is, or whether payment or bank details are in scope.

### 2. Write the spec
Read `references/spec-format.md` for the full key reference. Look at one or two of the files in
`references/examples/` that are closest to the use case:
- `contact-inquiry`: one page;
- `customer-feedback`: hidden prefill and NPS;
- `it-access-request`: heavy rules;
- `data-subject-request`: file uploads;
- `kitchen-sink`: every field type.

Reuse blocks from `references/blocks.md` (address, bank account, privacy notice, attestation,
validated patterns) rather than reinventing them.

Conventions that keep a form working:
- **Keys** are the API reference names that responses are stored under. Use `snake_case`, make them
  unique across the form, and never use a shape like `Email_ab12cd34`, which collides with the
  builder's auto-names.
- **One rule per target.** A target with both a show rule and a hide rule stays visible until the
  trigger is answered.
- **Put a rule's target after its trigger.** A target on an earlier page or position is not hidden.
- **Conditionally required** means `required: true` plus a `show` rule. Hidden fields are not
  validated, so this is safe.
- **Hidden pages and hidden sections differ.** A page shown by a rule (through its `key`) is
  skipped while hidden, and its required fields with it; this was measured, so targeting the page
  alone is enough. A section hidden by a rule was never measured. When you show a section, also
  list each input inside it in the same rule's `then`.
- **Patterns** must be anchored `^…$` and carry an `example` that matches.
- **Dates:** a field `default` uses the field's display format (`11/02/2026`). A date in a rule
  condition is ISO (`2026-11-02`).
- **Options** are labels. The compiler makes each value an identifier (`Prefer_not_to_say`). Rules
  may name an option by its label.
- **Co-visible fields need distinct labels.** Two "Email" fields on one page confuse respondents and
  the review page.
- Use at most 15 file fields, and put none on the hidden page.
- Field `description` (help text) is plain text. Markdown only renders in `description`-type blocks
  and in the welcome text.

Save the spec as `<slug>.spec.json` in the user's working folder, or in the outputs folder on
claude.ai.

### 3. Compile and validate
```bash
node <skill-dir>/scripts/compile.mjs <slug>.spec.json
```
This writes `<slug>.webform.json` next to the spec.
- **ERROR** lines mean nothing was written. Fix the spec and run again. Each message says what is
  wrong and why.
- **WARNING** lines mean the file uploads but something may surprise the user. Fix it, or explain it
  to them.

To check a config the user already has (hand-edited, or from someone else):
`node <skill-dir>/scripts/compile.mjs --validate <file>.json`.

To copy a form between accounts, or re-upload one, start from the builder's **Download
Configuration** export and run `node <skill-dir>/scripts/portable.mjs <export>.json`. This strips
ids, the brand and account-bound verification apps.

The scripts need only Node 18+. If `node` is unavailable, say so. Do not fall back to hand-writing
the config.

### 4. Deliver
Give the user the `.webform.json`, and the spec for later edits. Summarise the form in a few lines:
the pages, the field count, what each rule does, and anything you approximated. Then give these
upload steps:

1. In Docusign: **Start ▸ Web Forms**, then **Upload Configuration** (on the Web Forms list), and
   pick the file.
2. The form arrives as a **Draft** with new ids. Open it and check it in the builder and in
   **Preview**.
3. Click **Activate**. To make the form **private** (API only, no public link), choose that in the
   Activate dialog. The upload ignores the privacy flag.
4. Optional: brand it, or attach Data Verification apps to email and phone fields, in the builder.
   These settings are tied to an account, so they are not in the file.

Read `references/gotchas.md` when the user asks about prefill, private access, data access after
submission, or why something behaves unexpectedly.

### 5. Optional: upload it for them
Do this only if the user asks, and only with their explicit OK for this specific form, because it
creates a form in their real Docusign account. Follow `references/live-upload.md`. It uses the
user's own signed-in browser session. **Never type their credentials.** Do not activate the form
without a second explicit OK.

## Hand-off (always the last step)

Do this every time you finish, without being asked: the user must never have to ask where the file is.

1. **Name it** `<customer>-<form>.webform.json` (lowercase words and hyphens, for example `acme-vendor-intake.webform.json`): pass it to `--out`. Never a bare name such as `bundle.zip`.
2. **Share it as a file**, in each way your surface has:
   - a folder the user picked or named (Cowork): write it there;
   - `/mnt/user-data/outputs/` exists (the Claude app, claude.ai): copy it there and share it with your file-sharing
     (present files) tool, so the chat shows a file card with a download arrow. A file only in your workspace
     (`/home/claude/…`) cannot be downloaded;
   - otherwise (Claude Code, on the user's computer): it is on their disk already; print its absolute path.
   Never say a file is shared or saved where you did not put it.
3. **End your reply with this block**, filled in (keep all three places unless you are sure which surface you are on):

   **Your web form:** `<customer>-<form>.webform.json` — download it from the file card above (Claude app/chat) · it's in `<folder>` (Cowork) · `<absolute path>` (Claude Code).
   **Next:** Demo Hydrator ▸ Asset exchange ▸ Load a bundle, drop the .json (or in Docusign: Start ▸ Web Forms ▸ Upload Configuration).

## Files
- `scripts/compile.mjs`: spec to config, with validation. `--validate` checks an existing config.
- `scripts/portable.mjs`: cleans an exported config for re-upload.
- `scripts/webform-spec.mjs`: the compiler itself (generated, do not edit).
- `references/spec-format.md`: every spec key, field type and rule operator.
- `references/blocks.md`: reusable field groups and anchored regex patterns.
- `references/examples/*.spec.json`: complete real specs.
- `references/gotchas.md`: behaviour the compiler cannot enforce.
- `references/live-upload.md`: the browser upload and activation procedure.
