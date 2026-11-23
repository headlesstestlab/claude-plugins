# Importing for the user (optional)

Do this only when the user asks you to put the request types into their account, and they have said
yes to **this** package. Before uploading, repeat the list of custom fields the package creates or
updates: those changes are account-wide and permanent.

**Never submit a request.** A submitted request can start the account's workflows, which may send
email or envelopes.

**Use their existing signed-in session.** If the browser shows a sign-in page, stop and ask the user
to sign in themselves. Never type a password, a one-time code or an API key, and never solve a
CAPTCHA.

## With a browser tool (Claude in Chrome, or a built-in browser)

1. Compile first, and only upload `.zip` files that `compile.mjs` wrote with no errors.
2. Open the account. A developer account is `https://apps-d.docusign.com/send/home`; production is
   `https://apps.docusign.com/send/home`. Ask which if it isn't clear. Go to **Requests ▸ Settings ▸
   Request types**.
3. Choose **Import**, and use the browser tool's file-upload action on the dialog's file input with
   the `.zip`. Don't drag and drop.
4. Wait for the import to report Completed or Failed.
   - **Failed:** don't retry. Read the request-type list and report whether the types were created
     anyway.
   - **Several parts:** import the next part only after the previous one has finished.
5. Report the types now in the list, under their imported names, and point out any "(1)" duplicate.
   To show a form, open **Create Request**, pick the type and read the form. Don't fill it in or
   submit it. Don't open the form builder.
6. Remind the user that the types are active now, and how to deactivate one in Settings.

Offer to delete only types you imported in this conversation, and only if the user asks. Deleting
a type doesn't remove the custom fields it created.

## Without a browser tool
Give the user the upload steps from SKILL.md §4.
