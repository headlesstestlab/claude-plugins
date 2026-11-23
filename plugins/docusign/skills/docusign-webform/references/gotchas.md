# Gotchas the compiler cannot enforce

The compiler catches everything that can be seen in the file. These points are about what happens
after upload, or about the product's limits. Use them to set expectations and to answer questions.

## Upload and activation
- **Upload creates a new Draft**, with new ids, every time. It never overwrites an existing form,
  so uploading twice gives two forms. To change a live form, either edit it in the builder, or
  upload the new version, activate it, and retire the old one.
- **A draft cannot be filled in.** It must be **activated** first. Activation is also when the
  server checks names, so a form that uploads but fails to activate points at a naming problem.
  The compiler prevents the known causes.
- **Private access** (API only, no public link) is chosen in the **Activate** dialog. A spec with
  `"access": "private"` writes `isPrivateAccess: true` into the file, but upload ignores it, so the
  Activate dialog is still where it takes effect.
- Branding and **Data Verification** apps (for example "Verified by Twilio" on an email field) are
  bound to one account's ids, so they are set in the builder after upload, never carried in the
  file. `portable.mjs` strips them from an export.
- Verification badges render only in a **live** activated form. They do not appear in the builder's
  Preview.

## Standalone means no envelope
- A standalone form produces **form data**, not an envelope. Responses are read in the Web Forms
  UI, or through the Web Forms API (form instances and their `formValues`), where each value is
  keyed by the field's `key`. **That is why stable, meaningful keys matter.**
- The public Web Forms API can **create instances** of an activated form, with prefill and embedded
  or remote delivery. It **cannot create or upload configurations**. Promoting a form from a
  developer account to production is done by downloading and then uploading the file.
- If the user needs a signature, the form must be built in the builder from an eSignature template.
  A typed-name attestation is the only standalone substitute.

## Prefill and hidden fields
- `hidden` fields sit on a page the respondent never sees. They are meant to be filled by URL or
  API prefill (campaign ids, account numbers). **How a value reaches a hidden field at run time has
  not been verified end to end**, so test with a real instance before relying on it.
- A `readOnly` field with no `default` shows empty unless prefill supplies a value.

## Respondent experience
- Field help text (`description` on an input) is **plain text**. Markdown renders only in
  `description`-type blocks, page subtitles and the welcome text.
- The review page repeats every page title as a heading, so give pages short, meaningful titles.
- Validation messages for `pattern` are the `message` you write. Make it say how to fix the
  answer ("Enter the EIN as 12-3456789"), not just that it is wrong.
- A form cannot compare two fields (for example, "confirm account number" matching, or end date
  after start date). Say so in help text rather than implying a check that does not exist.

## Limits
- At most **15 file fields**, none on the hidden page.
- No signature, address, URL, time or country field types; no repeating groups; no cross-field
  validation; no masked input. See the alternatives table in SKILL.md.
- Only two rule effects exist: show and hide. "Required when…" is `required: true` plus a show rule.
