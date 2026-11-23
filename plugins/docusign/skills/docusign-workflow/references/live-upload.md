# Importing for the user (optional)

Do this only when the user asks you to put the workflow into their account, and they have said yes
to **this** package. Import creates a workflow and a copy of everything the package carries. Request
types add permanent custom fields, so repeat that warning before uploading.

**Never publish or run the workflow.** A run sends real email and envelopes. Publishing and testing
stay with the user.

**Use their existing signed-in session.** If the browser shows a sign-in page, stop and ask the user
to sign in themselves. Never type a password, a one-time code or an API key, and never solve a
CAPTCHA.

## With a browser tool (Claude in Chrome, or a built-in browser)

1. Compile first, and only upload a `.zip` that `compile.mjs` wrote with no errors.
2. Open the account. A developer account is `https://apps-d.docusign.com/send/home` and production is
   `https://apps.docusign.com/send/home`; ask which if it isn't clear. Go to **Automations**, then
   **Workflows**.
3. Choose **Create Workflow ▸ Import Workflow**, and use the browser tool's file-upload action on the
   file input with the `.zip`. Don't drag and drop.
4. Wait for the import to finish. If it reports "Virus scan failed", retry once; that is the
   service, not the file. Any other failure: stop and report the message. Don't retry, because a
   failed import can still have created items.
5. Open the imported workflow and look at the canvas. Every step should render with no error marker.
   Report each step and any marker you see.
6. Tell the user what was created (the workflow, plus any forms, templates or request types) and
   that it is unpublished. Stop there. Publishing and a test run are theirs to do.

Offer to delete only items you imported in this conversation, and only if the user asks.

## Without a browser tool
Give the user the upload steps from SKILL.md §5.
