# Gotchas the compiler can't check

## Import
- **Import never overwrites.** It creates a new workflow, plus new copies of every web form,
  document template, request type and status the package carries, and rewires the workflow to the
  copies. Importing twice gives two of everything.
- **Request-type custom fields are permanent and account-wide.** Import adds any the account lacks.
  If the account already has a field with that name, import updates its label and dropdown
  options. Deleting the request type later leaves the fields. Tell the user before importing a
  package that carries a request type.
- **Agreement Desk triggers match the request type by its display name.** If the account already
  has a request type with that name, check after import which one the trigger points at.
- A status name can't reuse the name of a status that was deleted earlier; the import fails
  (ERR_10026).
- A package past roughly 50 components (types, forms, templates, statuses, custom fields) fails and
  creates nothing.
- "Virus scan failed" is the import service failing. Retry it.

## After import
- **A clean import can still fail on the canvas.** Open the workflow and check every step for an
  error marker before publishing. The common causes:
  - a participant with no source for their name or email;
  - a step whose required data comes from a branch that has merged.
- **Participant ids are regenerated** on import. Nothing outside the workflow should depend on them.
- **AI agents never travel.** A step added for one in the builder must point at an agent published
  in that account.
- **Connections are the account's own.** A step on Salesforce, Stripe, the Docusign CLM app or Make a
  Web Request uses the importing account's connection; with no active one the step shows an error
  until someone connects the app (App Center ▸ the app ▸ Connections) and picks it in the drawer. A
  web request never brings the builder's connection along: pick one before publishing.
- **People are the account's own.** A user named in the spec (an owner, an approver) who is not in the
  importing account must be picked again in the drawer.
- **Event and schedule starts need Docusign Connect** on the account: without it an event-started
  workflow cannot be published, and a scheduled one stays a draft after "publish". A weekly schedule
  is compiled as every 7 days (the drawer shows Daily; do not Apply it).
- A workflow imported as a draft does nothing until it is published. A test run sends real email
  and real envelopes to whoever the participants are, so use the user's own addresses for testing.

## Design
- **Starters and invites:** under a link, Manual or API (Human) start, the starter is the first
  step's participant, and inviting them is refused. Everyone else needs an invite on the same path
  before their first step. An invite inside one branch doesn't count after the merge.
- **No starter** under an Event, Schedule, CLM or Automated API start, so the first participant
  needs an invite too.
- **Generate needs its source data before it runs.** Map every required template field from a form
  answer, a starting value or `run.startDate` (date fields only). A template dropdown accepts only a
  form dropdown whose options it all has.
- **One document per send.** Two templates waiting for one `sign` are refused; Docusign's importer
  refuses that shape even in its own exports.
- An email can't follow an Agreement Desk start (use a request `message` instead), and neither can
  `createRequest`.
