---
name: docusign-document-template
description: Builds a Docusign document template, the generated-agreement kind (Templates ▸ Document Templates, Agreement Template Builder), as an importable .zip - NDAs, MSAs, SOWs, offers, leases, order forms and proposals with merge fields, conditional clauses, line-item tables, formulas and signer fields, with optional upload in the user's signed-in browser. Use it when someone asks only for the template - create, draft or convert a doc-gen template, a table of pasted rows, or rework one downloaded with Download ▸ Zip. Not when the request also says who signs in what order, who sends it, or what starts it - a generated document is sent by a workflow, so use docusign-solution. For Gen for Salesforce use docusign-gen-salesforce; for CLM Doc Gen use docusign-clm.
metadata:
  version: "v2026.11.24.2"
---

# Docusign document template builder

This skill turns a plain-language request into a Docusign **document template** file. That is the
`.zip` that Templates ▸ Document Templates ▸ Create New imports. A sender then opens the template's
**Use Template** screen, fills its fields, and Docusign generates the finished agreement with
signature fields already placed.

The body format (ADF) is a reverse-engineered binary, and every rule in the compiler was measured
against the live product. So **never write the template JSON by hand.** Write a short **spec**, and
let `scripts/compile.mjs` build and validate the file.

## Is a document template the right thing?

| The user wants | Build |
|---|---|
| A contract whose text changes with answers: names, dates, amounts, optional clauses, line items | **This skill** |
| Totals or other calculated values (`price × qty`) | This skill, with `"format": "word"`: only the Word format has formulas |
| An existing PDF, signed as is, with fields dropped on it | A plain **eSignature template** (Templates ▸ Upload). This skill doesn't make those; say so |
| Data collection with no document | A web form: the `docusign-webform` skill |
| The template generated automatically inside a process (form, then generate, then sign) | This skill for the template, then the `docusign-workflow` skill to wire it in |

## Workflow

### 1. Understand the agreement
Find out:
- what it is and who the parties are;
- the **signer roles**: one role per party who signs, in signing order;
- the **sender fields**: what the person preparing it types in, such as names, dates, amounts,
  choices;
- any clauses that appear only under some condition;
- any repeating rows (line items);
- whether anything must be calculated.

Draft real clause text for the use case, in plain and professional wording. Don't leave lorem
ipsum or `[insert clause]` stubs. A template is only as useful as its words. Ask only about what
changes the document materially, such as governing law or the parties involved. Infer the rest.

### 2. Write the spec
`references/spec-format.md` is the full grammar. Use the example in `references/examples/` closest to
the request:

| Example | Shows |
|---|---|
| `mutual-nda` | the canonical small builder spec |
| `liability-waiver` | inline signer fields and a radio |
| `offer-letter` | many rules, checkbox and radio |
| `change-order` | a line-item table |
| `order-form` | Word format with formulas summing a table |

Conventions that keep a template working:
- **Every declared field must be printed** with `{{key}}`, or drive a rule. The compiler refuses
  unused fields.
- **Signer fields** go inline as tokens:
  - `[[initials:Role]]`, `[[text:Role:Label]]`, `[[date:Role:Label]]`, `[[check:Role:Label]]`;
  - `[[radio:Role:Group:A|B|C]]`, `[[email:Role:Label]]`, `[[company:Role]]`,
    `[[attach:Role:Label]]`.
  - A `sign` block places the standard signature, name, title, company and date for a role.
  - Every role must be in `signers`.
- **Rules** (`if`) take exactly one operator (`is`, `isNot`, `gt`, `lt`, `gte`, `lte`).
  Number-only comparisons apply to number fields. Word format can't nest rules; the compiler
  flattens them.
- **Table cells hold short values.** A long value wraps, and the generated PDF interleaves it with
  the next column.
- **Numbers** carry at most two decimals. Use `money: true` for amounts. Don't use a Currency type,
  which would create an account-wide custom field.
- Give the spec an `id` (kebab-case) and a `name` of 100 characters or fewer.
- Add at least one entry to `examples` with realistic `values` (every sender field except Salesforce and
  calculated ones; rows for each line-item table). It documents the template, the user can type it straight
  into Use Template to test, and the docusign-solution check refuses a template without one.

### 3. Compile
```bash
node <skill-dir>/scripts/compile.mjs <slug>.spec.json
```
This writes `<slug>.zip` (the file to upload) and `<slug>.json` (the same template, readable). It
prints the sender fields and each signer's field counts.
- An **ERROR** means nothing was written. Fix the spec and run again.
- A **note** that a field is never printed is fine when the field only drives rules.

To read a template someone downloaded (Download ▸ Zip), run
`node <skill-dir>/scripts/compile.mjs --inspect <file.zip>`. It lists the fields and signers and
writes the decoded body beside the file. That output is for understanding the template, not a
spec, so rebuild the template as a spec.

### 4. Deliver
Give the user the `.zip` and the spec, and summarise the template in a few lines: signers, sender
fields, each rule, any line items or formulas. Then give these upload steps:
1. In Docusign: **Templates ▸ Document Templates ▸ Create New**, then choose the `.zip`. It arrives
   as a **Draft** with a new id; import never overwrites an existing template.
2. **Publish** it from the template's row menu. Use Template is available only on a published
   template.
3. **Use Template**: fill the fields (the spec's `examples` give test values) and press **Next**.
   Only Next merges the values. The preview and Download before it show the unmerged template.
   Next creates a **draft envelope** holding the generated document; discard it if it was a test.
4. Assign real people to the signer roles when sending.

Read `references/gotchas.md` before answering "why does it look like…" questions.

### 5. Optional: upload it for them
Do this only if the user asks, and only with their explicit OK for this specific template. It
creates a template in their real account. Follow `references/live-upload.md`: their own signed-in
browser, never their credentials, and no publishing or sending without a second OK.

## Hand-off (always the last step)

Do this every time you finish, without being asked: the user must never have to ask where the file is.

1. **Name it** `<customer>-<document>-template.zip` (lowercase words and hyphens, for example `acme-mutual-nda-template.zip`): pass it to `--out`. Never a bare name such as `bundle.zip`.
2. **Share it as a file**, in each way your surface has:
   - a folder the user picked or named (Cowork): write it there;
   - `/mnt/user-data/outputs/` exists (the Claude app, claude.ai): copy it there and share it with your file-sharing
     (present files) tool, so the chat shows a file card with a download arrow. A file only in your workspace
     (`/home/claude/…`) cannot be downloaded;
   - otherwise (Claude Code, on the user's computer): it is on their disk already; print its absolute path.
   Never say a file is shared or saved where you did not put it.
3. **End your reply with this block**, filled in (keep all three places unless you are sure which surface you are on):

   **Your template:** `<customer>-<document>-template.zip` — download it from the file card above (Claude app/chat) · it's in `<folder>` (Cowork) · `<absolute path>` (Claude Code).
   **Next:** Demo Hydrator ▸ Assets ▸ Load a bundle, drop the .zip (or in Docusign: Templates ▸ Document Templates ▸ Create New).

## Files
- `scripts/compile.mjs`: spec to `.zip`, or `--inspect` an export.
- `scripts/lib/*.mjs`: the compiler. It is generated from the gallery repo; don't edit it.
- `references/spec-format.md`: the full grammar (fields, blocks, rules, signer fields, limits).
- `references/account-binding.md`: your account's id and Salesforce / CLM connections for connected-app steps (without them a package carries placeholders: set your Salesforce connection first).
- `references/examples/*.spec.json`: five complete real specs.
- `references/gotchas.md`: behaviour the compiler can't check.
- `references/live-upload.md`: the browser upload procedure.
