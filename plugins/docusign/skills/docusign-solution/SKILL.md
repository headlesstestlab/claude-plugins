---
name: docusign-solution
description: Plans and builds a complete Docusign solution from a short business-process description - the full set of uploadable files (Workflow Builder workflows, web forms, Agreement Desk request types, document templates, eSignature templates, AI agents, CLM workflows, CLM doc-gen forms and eForms) with the upload order, the upload path per file, the account prerequisites and an honest list of what cannot be built. Use it when the request needs more than one kind of asset, which is most business processes - a document filled with per-deal data (names, amounts, terms) and sent for signature, anything started from Salesforce, HubSpot, an ERP, a form, a request, a schedule or an event that also needs its document or form built, approvals plus an agreement, an AI step in a process - or a demo build. When unsure whether one asset is enough, use this skill; it hands single assets to the per-asset skills. Not for a request that clearly asks for one asset only - use that docusign-* skill.
metadata:
  version: "v2026.11.24.2"
---

# Docusign solution builder

This skill turns a customer prompt into a **solution manifest** and compiles it into a **bundle**: a `.zip` of
every uploadable file, plus a `README.md` with the upload order, the upload path per file, the prerequisites
with how to check each, and what was not built. Every compiler here was proven against the live product, so
**never write a Docusign file by hand**: write specs and a manifest, and let `scripts/compile.mjs` build and
check them.

**Per-asset skills** go deeper on one asset: docusign-workflow, docusign-webform, docusign-request-type,
docusign-document-template, docusign-esignature-template, docusign-ai-agent and docusign-clm (CLM workflows, Doc
Gen forms, eForms). A Gen for Salesforce template (a Word file with `<# … #>` tags) is not a bundle asset: build it
with docusign-gen-salesforce (`references/planning.md` §1).

## Workflow

### 1. Read the prompt
Pin down: how it starts, who fills in what, which documents, who approves and in what order, who signs, where AI
is wanted, who is told at the end, the platform (IAM or CLM), languages and currencies.

### 2. Plan the asset set
Follow `references/planning.md` table by table: platform → start → data source → documents → approvals → AI →
notifications. Each row names the spec shape that builds it. Look every need up in
`references/capabilities.md`:
- **proven**: build it;
- **compiled-unproven**: build it, and tell the user it is not yet proven live;
- **not-modelled / refused**: it is a **gap**. Do NOT invent a step for it. Add a `gaps` entry (the need in the
  customer's words, the capability id, and `instead`: the nearest supported pattern, or "none").

### 3. Ask first, then apply defaults
**Before you build, ask** when the prompt leaves out the people (who approves, who countersigns: names and emails),
the account (CLM users, folders, attributes) or the wording of a document the customer owns. Ask in one message,
with the default you would use for each, and **wait for the answer**. Build with placeholders only when the user
says so, or says they do not know yet. Then use the defaults in `references/planning.md` §8 for the rest.
Ask a question only if its answer changes a file. `references/questions.md` lists the questions real prompts
needed, by asset set. Never ask for things the defaults settle.

### 4. Write the specs and the manifest
Make a project folder:
```
<project>/
  manifest.json                        the solution (references/solution-spec.md)
  account.json                         optional: account values READ from the account, never written to pass a compile
  workflows/specs/<id>.json            references/specs/workflow.md
  webforms/specs/<id>.json             references/specs/webform.md
  request-types/specs/<id>.json        references/specs/request-type.md
  document-templates/specs/<id>.json   references/specs/document-template.md
  agents/specs/<id>.json               references/specs/agent.md
  clm-workflows/specs/<id>.json        references/specs/clm-workflow.md
  clm-eforms/specs/<id>.json           references/specs/clm-eform.md
  esign-templates/specs/<id>.json      references/specs/esign-template.md (its PDFs: esign-templates/documents/)
```
**Write each spec from its reference** (`references/specs/<kind>.md`), following the planning rules. A library spec
(`references/library.md`) can be named by its id when it fits as is; copy it into the project under a NEW id when it
needs changes. A NEW eSignature template (`esignTemplates`, a fixed document sent as
is) goes in `esign-templates/specs/<id>.json` (`from` an inline document; `references/specs/esign-template.md`, and the
docusign-esignature-template skill goes deeper); `compile.mjs` prints its PDF into `esign-templates/documents/` with
headless Chrome or Chromium. A document filled from answers stays a document template + `sign`.

**Worked examples** (`references/examples/<prompt-id>/`, listed with what each shows in `references/library.md`):
twelve complete answers to real prompts (`prompt.json` is the prompt), chosen to show each asset kind and pattern
once. Most prompts have no matching example: plan them from the rules, and read an example only for a pattern it
shows (a shared request type, a Salesforce start, a new eSignature template, a CLM eForm, …). Never copy an
example's answer for a prompt it does not fit.

Other manifest keys worth knowing: `webformTemplates` (a web form built from a library eSignature template, signed on
its last page), `clmDocgenForms` (CLM doc-gen forms), `clmEforms` (CLM classic eForms: HTML to paste; planning.md §3b says when, and which answers are attributes), `integration` (API payloads, CSV headers: printed in the README),
`notBuildable` (required when nothing can be built as asked; say why). `references/planning.md` has the rules.

The rules that break solutions most often (the compiler refuses most of them):
- An agent never travels in a package: list it in `agents`, and every agent a workflow runs must be there.
- Two workflows that both open the same request type: list it in `sharedRequestTypes`; the first one with a
  Create a Request carries it.
- A request number cannot be branched on: give the intake a band dropdown.
- Approval steps exist only under a request start; elsewhere use a decision web form for the approver.
- Named users and groups are `{ "user": "<email>" }` / `{ "group": "<name>" }`. Without `account.json` they compile to
  placeholders and the README tells the customer to pick each one; only the account's own directory goes in `account.json`.
  The README says where a group is made; do not add your own "the group exists" prerequisite.
- A request **message** goes to a person, never a `{ "group" }`: Send Message from a Request takes users and email
  addresses only (a product limit; the compiler refuses a group). Message one person of the team (`{ "user": "<team>@example.com" }`),
  `owner`, `submitter` or a team mailbox (`{ "email": "…" }`); an approval may still go to the group.
- An agent's instructions name only tools its capabilities hold (the check refuses others, and names the
  capability to add: reading a document with `system_dms_get_documents` needs Find Agreements).
- Unknown people (after you asked, and only when the user agrees): `<role>@example.com` placeholders.
- **Never invent account values** (user GUIDs, ids, keys) to pass a compile. If the compiler wants one, stop and
  ask for it, or leave it out of `account.json`: without it a user or group stays a placeholder, a CLM assignee or a
  CLM folder (`{ "name" }`) compiles empty and the README says where to pick it, and an eForm attribute id stays
  `REPLACE:`. Say so to the user. The compiler refuses made-up ids (`00000000-…`, a repeated digit, `placeholder…`,
  a directory user at `@example.com`); no worked example ships an `account.json`.
- **A library spec must travel to any account.** No account's ids: an eSignature brand is named (or the
  account's sending default), a signing group by its name (it must exist there, or the role is a plain recipient), a
  Make a Web Request step gets the account's own connection, and a workflow's `esign` step names a library eSignature template,
  which its package carries (a step on the account's own template, `fromAccount`, names a `library` fallback too). Library people are
  placeholder personas: on the account they become the account's users (the README lists each to pick).
- Every document template needs at least one `examples` entry: a value for each sender field from the prompt's own
  data (placeholder people), a listed option for each dropdown, rows for each line-item table, and 2–3 `expect`
  strings. The check refuses a template without one (the generate gate runs it).

### 5. Compile and check until clean
```bash
node <skill-dir>/scripts/compile.mjs <project>/manifest.json [--account <project>/account.json] --out <customer>-<process>-bundle.zip
```
It compiles every asset, checks every file against the product's schemas, each workflow's required drawer
fields and export-key parity, and every gap (a gap on a proven capability is refused: build it). **ERROR**
lines mean nothing was written: fix the specs and run again. Pass every **WARNING** to the user (custom fields an
import creates are account-wide and only an admin can delete them by hand; the README lists the not-yet-proven
capabilities too). Also pass on:
- the **CONFIRM** lines: the account prerequisites (connected apps the workflows use, Docusign Connect for event and
  schedule starts, CLM account settings for the CLM step kinds, notary, tab order, …);
- the **ACCOUNT SETTING** lines: each eSignature setting a template needs and who can turn it on (an account admin,
  or only Docusign: an Account Plan Editor item or an add-on). One marked BLOCKS breaks that template while off.

Refused by the compiler, so plan around them: a markdown table in agent instructions; more than 5 SMS / WhatsApp
recipients, or text delivery to an in-person signer or witness; a template-linked web form on a template with an
in-person, witness or notary role; CLM folder / document names with `/ \ : * ? " < > |` or over the length limits,
attribute values over 400 characters, a CLM loop past 10,000 activities, and a CLM workflow name the account already
has. Not built by these skills: Agreement Manager worksheets (an AI worksheet is made in the product), notary tabs,
conditional routing, a template password and signer markup (`allowMarkup`).

**Never delete or edit a gap, a prerequisite or a warning to change what the README says.** A gap you built
anyway (a compiled-unproven setting) keeps its entry with `instead` starting "built: …": the README lists it as
built, not yet proven live. If a README line looks wrong, tell the user; do not hide it.

**Never ship text you know is false.** No email, invite, screen, form or document may say a gap happened ("The
signed copy is on the opportunity" when storing it is Not built): word it for what is built ("The signed NDA is in
Docusign"), or leave it out, or ask. The check warns when a step's wording reads like a not-built gap; fix the text
and compile again. An `instead` that points outside the bundle (a Salesforce setting, another product) says whether
it is proven; an unproven one is never written as a prerequisite.

**A lab or test copy:** `--lab-prefix "ZZ Lab "` renames the objects only (agents drop any character but letters,
digits and spaces from it: Agent Studio refuses "·"). Never write a second manifest that swaps
addresses or renames people: the placeholders stay, and are replaced in the account as the README lists.

### 6. Deliver
**Every way the build differs from what the user asked for is a `gaps` entry in the manifest** (`need` in their
words, `instead`: what the bundle does), compiled before you deliver, so the README's "Not built" lists it: a
Yes/No per option instead of a multi-select, an invite with a link instead of a plain email, a person who writes
what the prompt said an approver's comment would carry. The customer reads the README, not the chat. Never write
a "how it differs" section in the chat that the README does not have.

Hand over the bundle `.zip` as **Hand-off** below says, name the project folder, and summarise in a few lines: what starts it, the steps,
what each upload creates, and the **Not built** list with its alternatives. **Copy the "Not built" and "not yet
proven" lists from this compile's README** (its "Not built" and "Built, not yet proven live" sections) and its
WARNING lines, never from memory or the references: a capability proven since is not listed there, and saying it
is unproven misleads the customer. Point them at the bundle's
`README.md` for the upload order, the upload path of each file and the prerequisites to confirm first.
**Agreements Demo Studio** (Assets ▸ Load a bundle) takes this `.zip` as it is: it previews what each upload creates
on the connected account, loads them in the README's order, and Undo deletes them; its "Load as test copies" prefixes
every name. Never upload, publish or run anything for them unless they ask and confirm, file by file.

**Salesforce:** an eSignature for Salesforce envelope template built for Gen (AutoPlace anchors) names its Nth
signer's role `Signer <N>`; any other role name (Customer, Counterparty) reaches the signer with no tabs. Check
every signer's tabs on a test send.

**Gallery repo only** (the deploy tooling behind these compilers, not this skill): `deploy-scenario` reads the account
first and prints a plan: the connected apps each workflow needs (a missing one is refused before any write), the custom
fields to create (`--create-custom-fields`, once, before any import), the signing groups (`--create-signing-groups`)
and the eSignature account settings (on / CAN TURN ON / NEEDS DOCUSIGN; `--enable-account-settings`, `--settings-only`).
Its Test accounts are `DS_ACCOUNT=test1…testdiff`; every write is ledgered and the account name checked first.

## Hand-off (always the last step)

Do this every time you finish, without being asked: the user must never have to ask where the file is.

1. **Name it** `<customer>-<process>-bundle.zip` (lowercase words and hyphens, for example `john-deere-vendor-onboarding-bundle.zip`): pass it to `--out`. Never a bare name such as `bundle.zip`.
2. **Share it as a file**, in each way your surface has:
   - a folder the user picked or named (Cowork): write it there;
   - `/mnt/user-data/outputs/` exists (the Claude app, claude.ai): copy it there and share it with your file-sharing
     (present files) tool, so the chat shows a file card with a download arrow. A file only in your workspace
     (`/home/claude/…`) cannot be downloaded;
   - otherwise (Claude Code, on the user's computer): it is on their disk already; print its absolute path.
   Never say a file is shared or saved where you did not put it.
3. **End your reply with this block**, filled in (keep all three places unless you are sure which surface you are on):

   **Your bundle:** `<customer>-<process>-bundle.zip` — download it from the file card above (Claude app/chat) · it's in `<folder>` (Cowork) · `<absolute path>` (Claude Code).
   **Next:** Agreements Demo Studio ▸ Assets ▸ Load a bundle, drop the .zip.

## Files
- `scripts/compile.mjs`: manifest + project folder → bundle `.zip`, with every check (and the ACCOUNT SETTING lines).
- `scripts/lib/`, `scripts/docs/`, `scripts/assets/`: the compilers and their data, generated from the gallery
  repo; don't edit them.
- `references/planning.md`: the decision table, defaults and the gap rule.
- `references/account-binding.md`: your account's id and Salesforce / CLM connections for connected-app steps (without them a package carries placeholders: set your Salesforce connection first).
- `references/solution-spec.md`: every manifest key, the bundle, the prerequisites.
- `references/capabilities.md` (`.json`): every product capability and its status.
- `references/questions.md`: questions that change the output, with defaults.
- `references/specs/`: the spec reference of each asset kind.
- `references/library.md`: the worked examples (what each shows) and the library specs they compile from
  (`references/library/`).
- `references/examples/`: worked prompt → manifest answers, each with the hash of the bundle the gallery compiles
  (`evals/selftest.mjs` checks it).
