---
name: docusign-request-type
description: Builds Docusign Agreement Desk request types - the entries in Create Request's picker with the intake form a requester fills in - as an importable .zip, with fields stored to agreement fields or the account's custom fields and show/hide rules, with optional import in the user's signed-in browser. Use it when someone wants only the intake side of Agreement Desk - a request type, intake form, legal front door, request catalogue, or requests that arrive by email - for NDAs, contracts, legal questions, purchases or policy exceptions. Not when the request must also be handled automatically (generate, approve, send) - use docusign-solution; for CLM eForms use docusign-clm.
metadata:
  version: "v2026.11.24"
---

# Docusign request type builder

This skill turns an intake process into Agreement Desk **request types**: the `.zip` that
**Requests ▸ Settings ▸ Request types ▸ Import** takes. Each type is a tile in Create Request's
picker plus the form a requester fills in. Each answer is stored on the request, either in one of
Docusign's own agreement fields (a *provision*) or in one of the account's *custom fields*.

There is no public schema for the package, and every rule in the compiler was measured against the
live product. So **never write the package JSON by hand.** Write a **spec**, and let
`scripts/compile.mjs` build and check it.

## Before anything else: custom fields are permanent
A field bound with `{"custom": "<Name>"}` writes the account-wide custom field `C_<Name>`.
- Import **creates it, or updates it if it already exists**. A different label or option list
  rewrites that field in every form in the account.
- Deleting the request type later leaves the field behind.

So:
- **Prefer a provision** whenever one fits: Party, Effective Date, Expiration Date, Total Contract
  Value, Payment Terms, Governing Law, and the rest listed in `references/spec-format.md`.
- **Name custom fields for the organisation**, specific enough not to collide with fields the
  account may already have. Ask the user whether their account already has intake fields to reuse.
- **Bind dropdowns, radios and checkboxes as `Text`** (the options stay in the form), never as an
  account-wide `Dropdown`, unless the user explicitly wants that.
- **Tell the user** which custom fields a package creates. `compile.mjs` lists them.

## Workflow

### 1. Understand the intake
Find out:
- which request types the team needs, and one sentence each on what it's for;
- what a requester must tell legal (or the receiving team) for each;
- which answers decide routing or urgency;
- which questions appear only sometimes.

Infer a sensible form from the purpose rather than interviewing at length.

### 2. Write one spec per type
`references/spec-format.md` is the full reference: every key, field type, provision, custom-field
rule, rule operator and limit. The form's fields follow the web-form spec. Pick the closest example
in `references/examples/`:

| Example | Shows |
|---|---|
| `general-legal-request` | short |
| `nda-request` | Party, provisions, urgency rule |
| `msa-request` | many rules |
| `new-software-request` | uploads and data questions |

The examples belong to a fictional company, "Fontara". Use their *shape*, never their company names
or `Intake…` field names as they stand.

Conventions:
- `name` is the picker tile, and **workflow triggers match it by name**, so make it distinct.
  `description` is 400 characters at most.
- **Bind every data field**, to a provision or a custom field; an unbound field's answer may not be
  stored. A file field stays unbound, and its files become the request's documents.
- **Show/hide rules only.** A field that is required only sometimes is `required: true` plus a `show`
  rule; a hidden required field doesn't block Submit.
- **Keep option labels ASCII**, because values are derived from labels.
- **Single page** is the proven shape.
- **At most 15 file fields** per form.

### 3. Compile
```bash
node <skill-dir>/scripts/compile.mjs <type>.spec.json
node <skill-dir>/scripts/compile.mjs a.spec.json b.spec.json c.spec.json --name "Legal intake"
```
- One spec writes `<id>.request-type.zip`.
- Several specs write one shared package. The compiler splits it into `part-N.zip` files when
  import would otherwise refuse it (more than about 50 types, forms and custom fields in one import
  creates *nothing*).
- **ERROR** means nothing was written; fix the spec.
- Pass the **WARNING** about custom fields on to the user, with the list.

### 4. Deliver
Give the user the `.zip` files and the specs. Summarise each type: its fields, what each is stored
as, its rules, and the custom fields the package creates. Then give these upload steps:
1. In Docusign: **Requests ▸ Settings ▸ Request types ▸ Import**, then choose the `.zip`. Import one
   part at a time, waiting for each to finish.
2. Import creates **new** types (a name already taken becomes "… (1)") and they arrive **active**:
   immediately offered in Create Request. Deactivate a type in Settings if it isn't ready.
3. **If Import reports "Failed", don't retry straight away.** Check the request-type list first; a
   "Failed" import has been seen to create the type anyway.
4. Open Create Request and pick the new type to see its form.

Read `references/gotchas.md` for the rest.

### 5. Optional: import it for them
Do this only if the user asks, and only with their explicit OK for this specific package, after
repeating the custom-field warning. Follow `references/live-upload.md`. It uses their own signed-in
browser, never their credentials, and never submits a request.

## Hand-off (always the last step)

Do this every time you finish, without being asked: the user must never have to ask where the file is.

1. **Name it** `<customer>-<intake>-request-type.zip` (lowercase words and hyphens, for example `acme-nda-request-request-type.zip`): pass it to `--out`. Never a bare name such as `bundle.zip`.
2. **Share it as a file**, in each way your surface has:
   - a folder the user picked or named (Cowork): write it there;
   - `/mnt/user-data/outputs/` exists (the Claude app, claude.ai): copy it there and share it with your file-sharing
     (present files) tool, so the chat shows a file card with a download arrow. A file only in your workspace
     (`/home/claude/…`) cannot be downloaded;
   - otherwise (Claude Code, on the user's computer): it is on their disk already; print its absolute path.
   Never say a file is shared or saved where you did not put it.
3. **End your reply with this block**, filled in (keep all three places unless you are sure which surface you are on):

   **Your request type:** `<customer>-<intake>-request-type.zip` — download it from the file card above (Claude app/chat) · it's in `<folder>` (Cowork) · `<absolute path>` (Claude Code).
   **Next:** Agreements Demo Studio ▸ Assets ▸ Load a bundle, drop the .zip (or in Docusign: Requests ▸ Settings ▸ Request types ▸ Import).

## Files
- `scripts/compile.mjs`: specs to import `.zip`(s), with checks.
- `scripts/lib/`: the compiler, generated from the gallery repo. Don't edit it.
- `references/spec-format.md`: every key, binding, provision and limit.
- `references/examples/*.spec.json`: four complete real specs.
- `references/gotchas.md`: behaviour after import.
- `references/live-upload.md`: the browser import procedure.
