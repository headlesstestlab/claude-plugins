# Filling in Agent Studio for the user (optional)

Do this only when the user asks you to create the agent in their account, and they have said yes to
**this** agent. It creates a real agent; an account holds at most 100, drafts included. **Publishing
needs a second yes.** So does a test run of an agent that can write (Manage Requests, Send Envelopes,
Generate Documents): its test is a live run that can change the account's data.

**Use their existing signed-in session.** If the browser shows a sign-in page, stop and ask the user
to sign in themselves. Never type a password, a one-time code or an API key, and never solve a
CAPTCHA. Fill in the editor's own fields only. Don't call the product's internal APIs, and don't read
tokens out of the page.

## With a browser tool (Claude in Chrome, or a built-in browser)

1. Compile first, and only work from a build sheet that `compile.mjs` wrote with no errors.
2. Open the account. A developer account is `https://apps-d.docusign.com/send/home`; production is
   `https://apps.docusign.com/send/home`. Ask which if it isn't clear. Go to **Automations ▸ Agents**,
   choose **Create New**, and skip the **✦ Create Agent** AI builder if it is offered.
3. Follow the build sheet in order:
   - **name and description;**
   - **In chat:** each starter prompt, then Save;
   - **In a workflow:** each output's Name, Format and Description (More Outputs between rows), then
     Save;
   - **instructions:** after entering them, check the headings and lists render as formatted text,
     and use the toolbar to fix any that show raw `#` or `-`;
   - **capabilities:** exactly the listed ones;
   - **knowledge files:** upload each one, with the browser tool's file-upload action.
4. **Save draft.** Report what the editor shows: every field, capability and output, and any error
   banner ("Resolve N errors").
5. Offer a **Test** with the sheet's test question. For an agent that writes, ask first and say what
   it could change. Report the answer and whether it contains the expected words.
6. Only on a further yes, **Publish**.

If any step fails, stop and report what the page showed. Don't start a second agent, because each
attempt uses up quota. Offer to delete only an agent you created in this conversation, and only if
the user asks.

## Without a browser tool
Give the user the build sheet; it is written for a person to follow.
