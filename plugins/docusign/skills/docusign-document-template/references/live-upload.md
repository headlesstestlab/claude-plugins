# Uploading for the user (optional)

Do this only when the user asks you to put the template into their account, and they have said yes
to **this** template. It creates a real template. Publishing it, or sending from it, needs a second
yes.

**Use their existing signed-in session.** If the browser shows a sign-in page, stop and ask the user
to sign in themselves. Never type a password, a one-time code or an API key, and never solve a
CAPTCHA.

## With a browser tool (Claude in Chrome, or a built-in browser)

1. Compile first, and only upload a `.zip` that `compile.mjs` wrote with no errors.
2. Open the account. A developer account is `https://apps-d.docusign.com/send/home` and production is
   `https://apps.docusign.com/send/home`; ask which if it isn't clear. Go to **Templates**, then
   **Document Templates**.
3. Choose **Create New** (on an account with no document templates yet, the empty page's **Create**
   button) and pick the upload option. The chooser adds its file inputs one at a time,
   so wait for the input that accepts `.zip`, then use the browser tool's file-upload action on it.
   Don't drag and drop.
4. Wait for the new template to appear as a **Draft** under the spec's `name`. Open it and check
   that the document text is present, the fields are listed and the signer roles are right.
5. Report what you saw, and ask before going further: *"It imported as a draft and the document looks
   right. Shall I publish it so it can be used?"*
6. Only on a yes, publish it from the row menu. Then offer a test run: Use Template, fill the spec's
   `examples` values, press **Next**. Report the generated document. Point out that the test left a
   draft envelope, and discard it only if the user agrees.

If any step fails, stop and report what the page showed. Don't retry the upload, because each retry
creates another template. Offer to delete only templates you created in this conversation, and only
if the user asks.

## Without a browser tool
Give the user the upload steps from SKILL.md §4. They take about a minute.
