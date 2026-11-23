# Uploading for the user (optional)

Do this only when the user asks you to put the form into their account, and they have said yes to
**this** form. Uploading creates a real object in their Docusign account, and activating it makes
it fillable by anyone who has the link.

**Use their existing signed-in session.** If the browser lands on a sign-in page, stop and ask the
user to sign in themselves. Never type a password, a one-time code or an API key, and never solve a
CAPTCHA.

## With a browser tool (Claude in Chrome, or a built-in browser)

1. **Validate first:** `node scripts/compile.mjs --validate <file>.webform.json`. Do not upload a
   file with errors.
2. Open the account's home page. For a developer account that is `https://apps-d.docusign.com/send/home`;
   for production it is `https://apps.docusign.com/send/home`. Ask the user which one if it is not
   clear. Then go to **Start ▸ Web Forms**. The list of web forms is at `…/send/forms`.
3. Find **Upload Configuration** on the Web Forms list (it may be under a menu next to the create
   button), and choose the `.webform.json` file. Use the browser tool's file-upload action on the
   file input. Do not drag and drop.
4. Wait for the new form to appear in the list as a **Draft**, under the spec's `name`. Open it.
5. **Check it in the builder:** every page is present, no field shows an error marker, and no label
   reads "Untitled". Then open **Preview** and step through the pages without submitting. On the
   review page, the last button submits.
6. Report what you saw, and ask before activating: *"It uploaded as a draft and previews correctly.
   Shall I activate it? Public link, or private (API only)?"*
7. Only on a yes, click **Activate**, choose public or private in the dialog, and confirm. Report
   the form's status and, for a public form, where its link is shown. Do not send the link to
   anyone.

If any step fails, stop and report what the page showed. Do not retry an upload, because each
retry creates another draft. If something went wrong, offer to delete the drafts you created, and
only those.

## Without a browser tool
Give the user the upload steps from SKILL.md §4 instead. They take under a minute.
