---
name: docusign-gen-salesforce
description: Builds Docusign Gen for Salesforce templates (Docusign Apps Launcher, namespace dfsle) as files - the Word document with every Gen merge tag (Content, TableRow, Repeat, Conditional, Signature anchors), the Object Mappings JSON (fields, lookups, related lists with SOQL filters) and the dfsle__GenTemplate__c record - and lints a Gen Word file against its mapping. Use it when someone wants to create, fix or check a Gen template, or a quote, order form, SOW or contract generated from a Salesforce record with Gen. Not for IAM document templates fed by Salesforce (docusign-document-template), CLM Doc Gen (docusign-clm), or a Salesforce process with a workflow (docusign-solution).
metadata:
  version: "v2026.11.23.4"
---

# Docusign Gen for Salesforce builder

Gen for Salesforce generates a Word or PDF file from a Salesforce record, inside Salesforce. A Gen template is a
`dfsle__GenTemplate__c` record whose **Object Mappings** list the fields it reads, plus Word files whose
`<# … #>` tags Gen merges with XPath 1.0 against the record's XML. This skill writes all of it from a **spec**:

| File | What it is | How it gets in |
|---|---|---|
| `<id>/<file>.docx` | the Word file with its tags | a `ContentVersion` on the template (`references/deploy.md`), or the wizard's Upload Documents |
| `<id>/gen-template.json` | the template record's fields | insert as `dfsle__GenTemplate__c` (REST, `sf data create record`, Data Loader) |
| `<id>/content-versions.json` | each file's generated name, suffix, Word/PDF, document rule | fields of that file's `ContentVersion` |
| `<id>/mappings.json` | the Object Mappings, readable | already inside `gen-template.json` |

The mapping is **derived from the paths the document uses**, so a document can never print a field the mapping
lacks (Gen would print a red `XPathException` and still report success). Every rule here was measured in a live
org; **never hand-write tags or mapping JSON.** The wizard reopens a template built this way and saves the
same JSON byte for byte.

A Gen template that is one part of a larger process (a workflow that sends it, an approval before it, an eSignature for
Salesforce envelope template) belongs to a solution: plan the rest with docusign-solution, and hand this skill's
files over beside its bundle.

## Workflow

### 1. Understand the document
Pin down: the **source object** (the record the button or Flow runs on), the fields and parties it prints, the
tables (which related list, filter, order, how many rows), the clauses that switch on data, and who signs.
Infer the obvious; ask only what changes a file. Read the org's real field API names (Setup ▸ Object Manager,
or `sf sobject describe`): Gen names are **case-sensitive API names**, never labels.

### 2. Write the spec
Start from the closest example in `references/examples/` (a fictional company, "Fontara": use their shape,
never their names or values):

| Example | Shows |
|---|---|
| `order-form-opportunity` | line-item table, a cell shown only on discounted lines, Match/Test conditionals, signature blocks |
| `order-form-discount-term` | a computed column (`{{= round(…)}}`), "any line more than 15% below list" approval clause, a multi-year clause from the CPQ primary quote (lookup), `in` on a picklist |
| `msa-opportunity` | two Word files, a document rule (generate the DPA only when a field says so) |
| `nda-account`, `nda-account-counterparty` | Account source, mutual/one-way switch, `repeat` over Contacts (LIMIT 1) for the signatory, a parent-account clause, law by entity |
| `sow-quote-opportunity` | **two levels of related lists**: Opportunity → Quotes (WHERE primary) → Quote Lines in a nested table, a lookup from each line (Product), a per-quote clause |

The full format, every block and condition, and the measured facts behind them: `references/format.md`.

The essentials:
- `sourceObject`, `fields` (formats: dates `MMMM D, YYYY`; currency `symbol`; **a DATETIME needs a format**),
  `lists` (`orderBy`, `max` 1–2000, `filter`, `fields`, and `lists` for the 2nd level), `documents[]` (`file`,
  `output` name/suffix/Word|PDF, optional `rule`, `header`, `footer`, `body`).
- Text: `{{Path}}` (`Amount`, `Account.Name`, `Account.Owner.Name`; in a row `Quantity`, `Product2.Name`),
  `{{Path?}}` (nothing when empty), `{{= <XPath>}}`, `**bold**`.
- Blocks: `title`, `h`, `p`, `bullets`, `fields` (key-terms table), `table` (`rows`, `columns`, `showIf`,
  `hideRowIf`, `footer`), `repeat` (`rows`, `body`), `if`/`then`/`else`, `pageBreak`, `image`, `signature`.
- Conditions: `equals`/`notEquals` (compiles to the wizard's Match), `in`, `isTrue`, `gt`/`gte`/`lt`/`lte`,
  `empty`, `count`, `all`/`any`/`not`, `test` (raw XPath 1.0).

**What Gen's data looks like** (why the compiler writes what it writes):
- Values arrive **as formatted text**: currency `$1,720.00`, dates in the mapping's format, checkboxes
  `True`/`False`, numbers `4,000.00`. Number tests strip formatting (`number(translate(x,'$,',''))`);
  `format-number()` fails.
- Lookups are flat elements named by path (`/Opportunity/Account.Owner.Name`); a related list is
  `<Rel>_Container/<Rel>` rows (`/Opportunity//OpportunityLineItems`); a list of each row is read `.//<Rel>`.
- Gen allows lookups four levels deep and two levels of related lists; one lookup from a row is proven.
- A tag is parsed as XML: `&` must be `&amp;` (the compiler does it). Tag names are case-sensitive (`Html`).
- Signature fields are anchor text in white (`\s1\`, `\n1\`, `\d1\` …). They place tabs only for envelope
  template roles named **`Signer 1`**, **`Signer 2`** … (AutoPlace).

### 3. Compile
```bash
node <skill-dir>/scripts/compile.mjs <spec.json> [more …] [--out-dir <dir>] [--describe <describe.json | folder of sObject describes>]
```
- Without `--describe` the bundled describe is used (standard Sales Cloud objects and Salesforce CPQ). For the
  customer's org, pass their describes (`sf sobject describe --sobject Opportunity --json > describes/Opportunity.json`,
  one per object the spec reads): a field, picklist value or related list the org lacks is then an ERROR here,
  not a failed generation there.
- **ERROR** means nothing was written for that spec. Pass every **WARNING** to the user.

### 4. Lint a Word file made or edited by hand
```bash
node <skill-dir>/scripts/compile.mjs --lint <file.docx> --spec <spec.json>
node <skill-dir>/scripts/compile.mjs --lint <file.docx> --mappings <ObjectMappings.json>   # copied from the template record
```
It checks every tag: names and case, Conditional/Repeat/Group pairs, every field or list a Select or Test reads is
in the mapping (root, lookup, row, nested list), bare `&`, checkbox `'true'`, currency compared without
`translate()`, `format-number()`, signature anchors beyond the template's signers; and the mapping's block keys
(a lookup block is keyed by its dotted path, a 2nd-level list by `<list>.<list>`).

### 5. Put it in the org and generate
`references/deploy.md`: insert the record and the files, generate on a real record (button, Flow action
*Generate agreement with Docusign*, or Apex), and read the output for red error text before calling it done.
Give the user the files and the steps; don't claim a generation you did not see.

## Limits to tell the user
- Agreement Cloud Editor (in-browser) templates are not built here; this is the Microsoft Word kind.
- `Group`, `TableColumn` and `RichText` have no spec block yet (the tags work; a hand-written file lints).
- Gen for Salesforce is a paid add-on (or Salesforce CPQ Plus); the user needs the Document Generator permission.
- Gen & Send (a linked envelope template that sends after generating) is sent by a scheduled job, minutes later.
