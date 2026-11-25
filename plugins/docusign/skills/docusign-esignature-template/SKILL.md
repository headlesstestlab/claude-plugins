---
name: docusign-esignature-template
description: Builds a classic Docusign eSignature (envelope) template as the JSON that Templates ▸ Upload Template takes, with the PDF and every tab placed - signer roles and signing order, parallel signers, access codes and IDV, witnesses, notary, in-person signers, CCs, conditional and calculated fields, payment tab, PowerForm, signing groups, SMS delivery, several documents, and the account settings each needs. Use it when the request is one fixed document and who signs it, how and in what order, including bulk send to a list from a CSV, signing inside your own portal, and a classic Send with Docusign button in Salesforce. Not when each send fills the document with deal data from a person or system (names, amounts, terms), when sending starts automatically from a system, schedule or form, when there are approvals, or when something must happen around the signing (verify identity first, notify a team after) - that is a generated document plus a workflow, use docusign-solution.
metadata:
  version: "v2026.11.24.4"
---

# Docusign eSignature template builder

This skill turns an agreement and its signers into a classic **eSignature template**: the `.json` that
**Templates ▸ Start ▸ Envelope Templates ▸ Upload Template** takes. The file holds the PDF, the recipient
roles and every tab. An upload always makes a **new** template.

Every rule in the compiler was measured against the live product: tab offsets, anchors, what the
API drops silently. So **never write the template JSON by hand.** Write a **spec**, and let
`scripts/compile.mjs` print the PDF, place the tabs and check everything.

## How a template is made
- The document is a **document template spec**: blocks of text with `{{field}}` slots, signature blocks
  and inline signer fields such as `[[initials:Role]]`. `from` names one of the gallery's library
  documents (`scripts/assets/document-templates/specs/`) or writes a new document **inline** in the same shape.
- **A classic template is static.** Every field that decides which clauses print, and every dropdown,
  is fixed in `variant` at build time, and the variant goes in the template's name.
- Every other field becomes a **text tab**, owned by the signer role `owners` names (default: the
  first signer).
- The compiler renders HTML, prints it to a PDF, and puts each tab on its own hidden anchor.

## Workflow

### 1. Understand the agreement
Find out:
- the document (an existing library one, or the customer's own text);
- the signer roles, in order, and who signs at the same time;
- who fills which blank, and which blanks the sender or a workflow fills (`lockedFields`);
- who only gets a copy (`carbonCopies`) or must view it (`viewers`);
- any identity check, witness, in-person signing, payment or public link.

Infer the obvious. Ask only what changes the file, such as who signs or in what order.

### 2. Lay out the project folder
```
<project>/
  esign-templates/specs/<id>.json        the spec (the file name is its id)
  esign-templates/documents/<id>.pdf     printed by compile.mjs; <id>-2.pdf … for more documents
```

### 3. Write the spec
`references/spec-format.md` is the full reference: every key, signer field token, tab option, the
anchor offsets and the rules from the lab. Start from the closest example in `references/examples/`,
each a complete project folder with its PDFs:

| Example | Shows |
|---|---|
| `mutual-nda-fontara-uk` | a library document at a fixed variant, field `owners` |
| `board-written-consent` | `routingOrder`: parallel directors, then the secretary |
| `customer-onboarding-packet` | two documents, a copy, reminders, expiration, a locked brand |
| `residency-affidavit` | `inPerson`, `witnesses`, `viewers`, `messages`, `conditional` |
| `supply-order-acknowledgment` | tab options, `formulas`, `signingOrder: false`, `lockedFields` |
| `camp-registration` | `payment` and `powerForm` |
| `settlement-payment-authorization` | `auth`: access code and IDV |
| `field-trip-permission` | a new document written inline |
| `mutual-nda-salesforce` | `salesforce`: an eSignature for Salesforce envelope template |

The examples belong to a fictional company, "Fontara". Use their *shape*, never their names.

The rules that break templates (the compiler refuses most of them):
- **Fix in `variant`** every field a condition reads and every dropdown. A formula field of a document
  template cannot be computed; use `formulas` and `[[calc:Role:Label]]`.
- **A role that fills fields signs first**, or the sender or workflow prefills them. The compiler warns.
- **No phone tab** (`[[phone:…]]`): it is a notary tab. Use `[[text:Role:Phone]]`.
- `signingOrder: false` and `routingOrder` together are refused.
- `warnDays` must be less than `afterDays`.
- **Never put an account's ids in a spec.** A brand is `{ "name"?, "lock"? }`: by its exact name on the target
  account, or no name = the account's sending default brand. A signing group (`signingGroups`) is named, and must
  exist on the target account (Settings ▸ Signing Groups) or the role stays a plain recipient. Leave the payment
  gateway out and the compiler warns; the target account sets it (Settings ▸ Payments).
- **SMS / WhatsApp** (`delivery`): at most 5 text-message recipients, and only for signers, viewers and copies, never an
  in-person signer or a witness (refused).
- **IDV** names the account's ID Verification workflow by label; the user confirms it exists.
- In a Workflow Builder Send step only **signer** roles can be addressed: a template meant for a
  workflow keeps every role a signer and has no `carbonCopies`.

### 4. Check what is supported
Look each need up in `references/capabilities.md`:
- **proven**: build it;
- **compiled-unproven**: build it, and tell the user it is not yet proven live (for example a notary
  role: it needs the Docusign Notary add-on and a notary profile);
- **refused** or **not-modelled**: don't fake it. Tell the user, and offer the nearest supported
  pattern. Examples: composite templates, conditional routing, notary tabs, electronic seals, EU QES,
  a template password, signer markup (`allowMarkup`: accounts refuse it), a DOCX source.

**Account settings.** Many features need an eSignature account setting (witnesses, in-person, signer
attachments, signing groups, calculated / conditional fields, SMS, document visibility, tab order, ID
Verification, notary). `compile.mjs` prints each one the template needs (`ACCOUNT SETTING` lines), with who can turn it
on: an account admin (eSignature Admin ▸ Sending Settings) or only Docusign (an Account Plan Editor item such as
"Allow Tab Order", or an add-on such as Notary or ID Verification). A **blocking** one (document visibility, tab
order, ID Verification, notary) breaks the template while off: tell the user before they upload. The others save,
but the feature is missing until the setting is on.

### 5. Compile
```bash
node <skill-dir>/scripts/compile.mjs <project>/esign-templates/specs/<id>.json
```
- It prints each missing PDF with headless Chrome or Chromium (set `CHROME` to its path if it is not
  found), then writes `<project>/<id>.esign-template.json`.
- No browser: it writes the HTML beside each missing PDF. Print it to that PDF (Letter, no headers or
  footers) and run it again. The gallery's PDFs were printed by Chromium; a PDF from another engine
  may place a payment tab wrongly.
- With `powerForm` it also writes `<id>.powerform.json`; with `salesforce`, `<id>.salesforce-tree.json`.
- **ERROR** means nothing was written; fix the spec. Pass every **WARNING** to the user.

### 6. Deliver
Give the user the `.esign-template.json`, the project folder and a short summary: the roles in order,
who fills what, the settings, and anything not built. Then give these upload steps
(`references/upload.md` has the screens and the common errors):
1. In eSignature: **Templates ▸ Start ▸ Envelope Templates ▸ Upload Template**, and choose the `.json`.
2. Open the template and check the documents, the roles and every tab, plus the reminders, expiration
   and copies.
3. **PowerForm:** create it from the uploaded template (Templates ▸ the template ▸ Create PowerForm), or
   `POST /powerforms` with the `.powerform.json` and the template's id.
4. **Payment:** connect a payment gateway (Settings ▸ Payments) and choose it on the payment tab.
5. **Salesforce:** insert the records in `<id>.salesforce-tree.json` (sObject Tree API) after replacing
   `<uploaded template id>`.
6. Send a test envelope to yourself before sharing the template.

### 7. Optional: upload it for them
Only if the user asks, and only with their explicit OK for this file. Follow
`references/live-upload.md`: their own signed-in browser, never their credentials, upload and inspect
only. **Never send an envelope.**

## Hand-off (always the last step)

Do this every time you finish, without being asked: the user must never have to ask where the file is.

1. **Name it** `<customer>-<document>.esign-template.json` (lowercase words and hyphens, for example `acme-lease.esign-template.json`): pass it to `--out`. Never a bare name such as `bundle.zip`.
2. **Share it as a file**, in each way your surface has:
   - a folder the user picked or named (Cowork): write it there;
   - `/mnt/user-data/outputs/` exists (the Claude app, claude.ai): copy it there and share it with your file-sharing
     (present files) tool, so the chat shows a file card with a download arrow. A file only in your workspace
     (`/home/claude/…`) cannot be downloaded;
   - otherwise (Claude Code, on the user's computer): it is on their disk already; print its absolute path.
   Never say a file is shared or saved where you did not put it.
3. **End your reply with this block**, filled in (keep all three places unless you are sure which surface you are on):

   **Your template:** `<customer>-<document>.esign-template.json` — download it from the file card above (Claude app/chat) · it's in `<folder>` (Cowork) · `<absolute path>` (Claude Code).
   **Next:** Demo Hydrator ▸ Asset exchange ▸ Load a bundle, drop the .json (or in eSignature: Templates ▸ Start ▸ Envelope Templates ▸ Upload Template).

## Files
- `scripts/compile.mjs`: spec → PDF(s) → upload `.json`, with checks.
- `scripts/lib/`, `scripts/assets/`: the compiler and the library documents `from` can name, generated
  from the gallery repo. Don't edit them.
- `references/spec-format.md`: every key, token, tab option and lab finding.
- `references/account-binding.md`: your account's id and Salesforce / CLM connections for connected-app steps (without them a package carries placeholders: set your Salesforce connection first).
- `references/capabilities.md`: what is proven, compiled-unproven, refused or not modelled.
- `references/examples/<id>/`: nine complete project folders, each with its PDFs.
- `references/upload.md`: the upload screens, the checks after and the common errors.
- `references/live-upload.md`: the browser upload procedure.

**Gallery repo only (not this skill):** its deploy and verify runs read the account settings first and print
on / CAN TURN ON / NEEDS DOCUSIGN; `--enable-account-settings` turns on the editable ones, `--settings-only` stops
after that plan, `--create-signing-groups` makes a missing group (Test accounts `DS_ACCOUNT=test1…testdiff`
only; every write ledgered). Gen for Salesforce envelope templates (AutoPlace anchors) store the Nth signer's role
as `Signer <N>`: a role named "Customer" gets no tabs.
