# Gotchas the compiler can't check

## Import
- **Import never overwrites.** It always creates new types with new ids. A name the account
  already has imports as "… (1)".
- **Types arrive active**, offered in Create Request at once, whatever the file says. Inactive,
  draft and default states are set in Settings after import.
- **"Failed" can still have created the type.** Check the request-type list before importing again,
  or you may end up with duplicates.
- **About 50 components per import at most** (each type and its form count, plus each distinct
  custom field). Past that, import reports Failed and creates nothing. `compile.mjs` splits a large
  set into parts for this reason; import them one at a time.
- **Statuses aren't part of a request type.** They're account-wide and set up separately (a
  workflow package can carry the statuses it uses).

## Custom fields
- **Account-wide and hard to undo.** Import creates any the account lacks and *updates* any it has: a
  new label renames the field in every form; a `Dropdown` option list replaces the account's.
  Deleting the type leaves them all behind. Only an admin can remove one, by hand (Manage ▸ Fields ▸
  the row's ⋮ ▸ Delete; the public API refuses), and values already stored stay.
- **Check the account's fields before the first import** (Manage ▸ Fields): reuse a field that has the
  same name, label and type; a field the account has with another label or type is changed by the
  import, in every form that uses it. On a new account, all the fields a set of packages needs are
  created by the first import that carries them.
- **One field, one definition.** A package that defines the same field two ways is refused, because
  import would keep only one.
- A custom-field category other than "Other" isn't supported, and neither is a `Table` field.

## Forms
- **Opening a type's form in the builder saves it back** to the account. That's harmless for the
  user's own types, but don't open one "just to look" in an account you're only inspecting.
- **A rule can show or hide Party** (the multi-party field), but **can't read it**: a condition on
  Party never fires, so the compiler refuses it.
- **Currency** answers must go to a currency provision (Total Contract Value, Annual Contract Value,
  Liability Cap). A Text custom field refuses them at Submit.
- **Number** answers need a `Number` custom field; a Text field refuses a number at Submit.
- Email and phone verification apps are bound to one account and aren't carried.
- A file field's uploads land on the request's **Documents** tab.

## Routing
- **Workflow triggers match a request type by its display name.** If a workflow (the
  `docusign-workflow` skill) starts from "NDA Request", a second type imported as "NDA Request (1)"
  won't start it. Rename or remove duplicates.
- A request type tells Agreement Desk what was asked. What happens next (status, owner, approvals,
  documents) is a workflow's job.
