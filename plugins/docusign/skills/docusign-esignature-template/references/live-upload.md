# Uploading for the user (optional)

Do this only when the user asks you to put the template into their account, and they have said yes to
**this** file. An upload always makes a new template; uploading twice makes two.

**Never send an envelope.** A send emails real people. Testing stays with the user.

**Use their existing signed-in session.** If the browser shows a sign-in page, stop and ask the user to
sign in themselves. Never type a password, a one-time code or an API key, and never solve a CAPTCHA.

## With a browser tool (Claude in Chrome, or a built-in browser)

1. Compile first, and only upload a `.esign-template.json` that `compile.mjs` wrote with no errors. Read its
   `ACCOUNT SETTING` lines to the user first: a setting marked BLOCKS that is off on their account (document
   visibility, tab order, ID Verification, notary) breaks the template, so they turn it on (or ask Docusign) before
   the upload. A signing group or brand the spec names must already exist on the account, by that name.
2. Open the account. A developer account is `https://apps-d.docusign.com/send/home` and production is
   `https://apps.docusign.com/send/home`; ask which if it isn't clear. Go to **Templates**.
3. Choose **Start ▸ Envelope Templates ▸ Upload Template**, and use the browser tool's file-upload action
   on the file input with the `.json`. Don't drag and drop.
4. Wait for the template to open. Any error: stop and report the message (`references/upload.md` lists
   the common ones).
5. Check the template: each document, each role in order, and the tabs on each page. Report what you see.
6. Tell the user the template's name, and what is still theirs to do: a PowerForm, a payment gateway, the
   Salesforce records, a test send.

Offer to delete only a template you uploaded in this conversation, and only if the user asks.

## Without a browser tool
Give the user the upload steps from SKILL.md §6.
