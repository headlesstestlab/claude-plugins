# Gotchas the compiler can't check

These are about what happens after import. The compiler enforces everything that can be seen in the
file.

## Import, publish, generate
- **Import always creates a new Draft template**, with a new id, named from the spec's `name`.
  Uploading twice gives two templates.
- **Use Template needs a published template.** Publish it from the row menu.
- **Only Next merges.** Use Template's preview and its Download show the template with its fields
  unfilled. Press **Next** to see the generated document. That creates a **draft envelope**; a test
  run leaves one behind to discard.
- **A Word file with `{{tokens}}` uploaded directly** becomes a *classic* template, and Use Template
  refuses to generate from it ("Processing option is not valid for given template type"). Only the
  ADF body this skill writes generates.
- Create New's chooser adds its file inputs one at a time. When uploading through a browser, wait
  for the input that accepts `.zip`.

## Fields and labels
- **A field bound to a standard provision** (`bind: { provision }`) appears in Use Template under
  Docusign's own label (for example "Agreement Party"), not the spec's label.
- **Checkbox group minimum and maximum** compile into the template but are dropped when the
  envelope is generated. Don't rely on them to enforce a choice.
- **Sender values arrive as text.** In Word-format formulas, wrap numbers in `$number(...)`, as the
  `order-form` example does.
- Number fields allow at most two decimals.
- **A field bound to a custom field** binds the account's field of that name (stored as `C_<Name>`):
  check that it exists on the target account, with the same type, before the import.
- **Connected data** (Salesforce fields and tables) needs the account's own active Salesforce
  connection; without one, generation has no data source.

## Layout
- **Keep table cells short.** A long value wraps, and the PDF's text interleaves it with the next
  column. It reads fine on screen but breaks text extraction and search.
- **Line-item rows come from a CSV** that the sender uploads in Use Template ("Upload .CSV", with a
  "Download Example" link). Every line-item table needs at least one row to generate.
- Header and footer images aren't supported. Font-family changes don't render, and links in body
  text are unproven.
- **Word format** can't nest rules (the compiler flattens them), and a formula inside a repeating row
  can't be computed per row.

## Signing
- Every signer role is "Needs to sign"; a document template has no other recipient type. Roles are
  assigned to real people when the envelope is sent.
- Signer fields placed inside a conditional section are optional to the envelope. When the section
  is hidden, the field simply isn't there.
- A document template produces a document for signature. It doesn't collect data on its own. To
  gather answers first and then generate, use a workflow (the `docusign-workflow` skill): form, then
  generate, then sign.
