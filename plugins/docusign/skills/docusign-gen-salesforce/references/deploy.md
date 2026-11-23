# Putting a Gen template into an org, and generating

Gen reads its template from records, so a compiled template goes in through the Salesforce API (or by hand in
the wizard). Do this in a sandbox or developer org first.

## 1. Insert the template record
`gen-template.json` holds the `dfsle__GenTemplate__c` fields. With the Salesforce CLI:

```bash
sf data create record --sobject dfsle__GenTemplate__c --values "$(node -e "const r=require('./gen-template.json');console.log(Object.entries(r).filter(([,v])=>v!==null).map(([k,v])=>k+'='+JSON.stringify(String(v))).join(' '))")" --json
```

or POST it to `/services/data/vXX.X/sobjects/dfsle__GenTemplate__c`. Keep every field: without the locale
fields (`dfsle__templateLocale__c` and the `USER` currency fields) generation fails with "No user Locale info
passed in payload". Note the new record id.

## 2. Attach each Word file
POST a `ContentVersion` per file: `Title` and `PathOnClient` from `content-versions.json`, `VersionData` = the
.docx in base64, **`FirstPublishLocationId` = the template id**, and the `dfsle__Generated…` and `dfsle__Rule__c`
fields from `content-versions.json`. A later edit is a new `ContentVersion` with the same `ContentDocumentId`
(Gen reads the latest version).

## 3. Generate on a record
- **Flow or REST:** the invocable action `dfsle__InvocableDocumentGenerationRequest` ("Generate agreement with
  Docusign"), inputs `sourceId` and `templateId`:
  `POST /services/data/vXX.X/actions/custom/apex/dfsle__InvocableDocumentGenerationRequest` with
  `{"inputs":[{"sourceId":"<record id>","templateId":"<template id>"}]}`. Limit: 100 generations per 10 minutes.
- **Apex:** the same action's global class, `dfsle.InvocableDocumentGenerationRequest.generateDocuments(…)`. There
  is no other public Gen Apex API.
- **A button:** the wizard's Create Button step, or a URL button to `/apex/dfsle__gendocumentgenerator` with
  `sId`, `templateId`, `recordId`, `recordName`, `title`.

The file lands in the record's **Files** in about 10–20 seconds, named `<prefix>_<record name>_<date>`. Watch
Files, not the `dfsle__Jobs__c` row (it stays "In Progress" long after). A run that fails leaves no file and a
line in *Docusign Logs* (`dfsle__Log__c`).

## 4. Read the output
Open the file (or extract its text) and look for red error text: `XPathException`, `TemplateErrorExists`,
"is not a valid element", or a leftover `<#`. Generation reports success even when a tag failed. Check that
each conditional clause appeared or disappeared as the record's data says.

## 5. Sending
To send after generating, link the Gen template to an Apps Launcher envelope template (same source object;
`dfsle__GenTemplate__c.dfsle__EnvelopeConfiguration__c`) whose signer roles are named `Signer 1`, `Signer 2` …
so the anchors become tabs. With Send Now and *launch automatically*, a scheduled job sends the generated file,
typically within 3–25 minutes.

## Debugging the data Gen sees
Gen evaluates any XPath 1.0 in a Content tag, so you can print the merge XML's shape:
`<# <Content Select="name(/Opportunity/*[3])" Optional="true"/> #>` prints the third element's name, and
`name(./*[2])` does the same inside a row.
