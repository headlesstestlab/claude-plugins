# Spec format

A spec is a small JSON file that `scripts/compile.mjs` compiles into the upload configuration.
This page lists every key the compiler reads. An unknown key, or a key that does not apply to a
field's type, is refused rather than silently dropped.

Contents: [The form](#the-form) · [Pages](#pages) · [Fields](#fields) · [Options](#options) ·
[Rules](#rules) · [What the compiler refuses](#what-the-compiler-refuses)

## The form

```json
{
  "name": "Volunteer Sign-up",
  "description": "Notes for whoever edits this spec later; not compiled.",
  "locale": "en",
  "welcome": { "title": "Volunteer with us", "text": "Takes about 3 minutes.", "button": "Start" },
  "hidden": [ { "key": "campaign_id", "type": "text", "label": "Campaign ID" } ],
  "pages": [ { "title": "About you", "fields": [ ... ] } ],
  "summary": { "title": "Check your answers", "text": "Please review before submitting." },
  "thankYou": { "title": "Thank you!", "text": "We'll be in touch.", "button": { "text": "Visit our site", "url": "https://example.org" } },
  "rules": [ ... ]
}
```

| Key | Type | Default | Notes |
|---|---|---|---|
| `name` | string, required | — | The form's name in the Web Forms list |
| `description` | string | — | Documentation only |
| `locale` | `"en"` \| `"ja"` | `"en"` | The runtime language for built-in strings (buttons, errors) |
| `access` | `"public"` \| `"private"` | `"public"` | Private means API only, with no public link. It is written to the file, but upload ignores it, so still choose Private in the Activate dialog (see gotchas.md) |
| `welcome` | `{ title, text?, button? }` \| `false` | `{ title: name, button: "Start" }` | `text` is Markdown. `false` removes the welcome page |
| `hidden` | Field[] | — | A hidden page, placed first, for values supplied by URL or API prefill. Fields here cannot be required or be file fields |
| `pages` | Page[], required | — | One page each, in order |
| `summary` | `{ title?, text? }` \| `false` | "Summary" | The review page. `false` removes it |
| `thankYou` | `{ title, text?, button?: { text, url } }` | "Thank you" | The button URL must be http(s) with a dotted host. `mailto:` fails activation |
| `rules` | Rule[] | — | Conditional show and hide |

The compiler always writes `isStandalone: true`, the empty template lists, schema version 1 and the
submit action. None of those belong in the spec.

## Pages

| Key | Notes |
|---|---|
| `title` | Required and non-empty. The page heading, also repeated on the review page |
| `subtitle` | Markdown |
| `key` | An optional id, so a rule can show or hide the whole page |
| `apiName` | An optional API reference name for the page |
| `fields` | The page's fields and sections, in order |

## Fields

Every input field accepts these keys:
- `key`: the API reference name, required. It may contain letters, digits and `_` (in any script).
  It must not start with a digit, must be unique in the form, and must not look like
  `<Type>_<8 chars>`.
- `label`
- `description`: help text, shown as plain text.
- `required`, `readOnly` (a read-only field needs a `default` or prefill).
- `example`: a valid sample answer. It is never compiled, but it documents the field and is checked
  against `pattern`.

| `type` | Becomes | Extra keys |
|---|---|---|
| `text` | one-line text box | `placeholder`, `maxLength` (default 4000), `preset` (`zip` \| `extendedZip` \| `ssn`), `pattern { regex, message, example? }`, `default` |
| `longtext` | multi-line text box | `placeholder`, `maxLength`, `pattern`, `default`, `maxLineBreaks` |
| `email` | email (format-checked) | `placeholder`, `maxLength`, `default` |
| `number` | number | `placeholder`, `default` (a number), `numberFormat` (`periodSeparatedNumber` default, `commaSeparatedNumber`, `spacePeriod`, `spaceComma`) |
| `currency` | amount + currency | `currency` (one of aud brl cad chf cny cop eur gbp inr jpy krw mxn sgd usd vnd; default usd), `default` (the amount, a number), `currencyEditable` |
| `date` | date picker | `placeholder`, `dateFormat` (`MM_dd_yyyy` default, `dd_MM_yyyy`, `yyyy_MM_dd`), `default` in the field's own display format (`11/02/2026`), never ISO |
| `phone` | phone with country code | `countryCode` (digits, no `+`, default `"1"`), `default` (national number digits) |
| `dropdown` | single choice, list | `options` |
| `radio` | single choice, buttons | `options` (an option's `description` renders under it) |
| `checkbox` | multiple choice | `options`, `select { atLeast?, atMost?, exactly? }` (default: at least 1 if required) |
| `file` | attachment upload | `formats` (bare lower-case extensions: `["pdf","jpg"]`; default is the builder's 33-format list), `maxFileSizeInMB` (default 25) |
| `description` | display text, no input | `text` (Markdown: bold, italics, links, lists) |
| `section` | a titled group | `label` (the title), `text` (subtitle), `fields` (no section inside a section) |

A **single required "I agree" checkbox** is the standard acknowledgement:
`{ "key": "terms_ack", "type": "checkbox", "label": "I accept the terms above.", "options": ["I agree"], "required": true }`.

## Options

An option is either a string (its label) or `{ "label", "value"?, "selected"?, "description"? }`.
The value defaults to the label turned into an identifier: punctuation removed, spaces become `_`,
and a leading digit gets a `_` prefix. So `"Prefer not to say"` becomes `Prefer_not_to_say` and
`"10"` becomes `_10`. A dropdown or radio may have at most one `selected` option.

## Rules

```json
{ "when": [{ "field": "attending", "is": "Yes" }], "match": "all", "then": { "dietary_needs": "show", "pg_travel": "show" } }
```

- `when` is a list of conditions. Each is `{ "field": <key>, <operator>: <value> }`, with exactly one
  operator.
- `match` is `"all"` (AND, the default) or `"any"` (OR).
- `then` maps a target key to `"show"` or `"hide"`. A target can be a field, a section, a
  description, or a page `key`. Those are the only two effects.
- `show` hides its target until the conditions hold. Hidden fields are not validated.
- A page targeted by `show` is skipped from the flow until its condition holds, required fields
  and all. For a section, list its inputs in the same `then` as the section, because the section
  case was never measured on its own.

| Trigger field type | Operators |
|---|---|
| text, longtext, email | `is`, `isNot`, `contains`, `notContains`, `startsWith`, `endsWith`, `filled` (true/false) |
| dropdown, radio | `is`, `isNot`, `isAnyOf` [..], `isNoneOf` [..], `filled` |
| checkbox | `is` / `isNot` (one option or a list: the exact set ticked), `isAnyOf`, `isNoneOf`, `filled` |
| number, currency | `is`, `isNot`, `gt`, `gte`, `lt`, `lte` (numbers), `filled` |
| date | `is`, `isNot`, `before`, `after`, `onOrBefore`, `onOrAfter` (ISO `YYYY-MM-DD`), `today: true`, `onDayOfWeek: ["Saturday","Sunday"]`, `filled` |
| phone, file | `filled` |
| section, description | cannot be a trigger |

Values for choice fields may be the option label or its value. The compiler writes the value.

Number and currency `gt`/`lt` and date `before`/`after` work at run time, but the builder's rule
editor cannot edit them. If the user will maintain the form in the builder, prefer `filled`, `is`,
`onOrBefore` and `onOrAfter`.

## What the compiler refuses

- a duplicate key; a page key that equals a field key;
- an unknown key or type, or a key that does not apply to the type;
- a `preset`, `numberFormat`, `dateFormat`, `locale` or `currency` outside the measured values;
- a date default not in display format; a non-numeric number default;
- a section inside a section; a required field or file field on the hidden page; more than 15 file
  fields;
- `formats` with dots or capitals;
- a pattern that does not compile, is not anchored, or whose `example` does not match;
- impossible checkbox bounds; more than one `selected` option on a single-choice field;
- an empty page, welcome or thank-you title; a thank-you button without text or URL;
- a rule condition with zero or several operators; a non-numeric number condition; a non-ISO date
  condition; a rule naming a missing field or page; an effect other than show or hide.
