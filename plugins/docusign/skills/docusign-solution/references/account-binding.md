# Your account's values for connected-app steps

Workflow steps that use a connected app (Read from Salesforce, Store files in Salesforce, Use Salesforce Files, Read from
Stripe, Archive to CLM, Start CLM Workflow) and Word document templates with Salesforce fields name the Docusign
account they run on and its app connections. The compiler cannot know yours, so it reads them from a JSON file:
`$DOCUSIGN_ACCOUNT_BINDING`, or `account-binding.json` in the folder you run the compiler from. Without the file
the packages carry placeholders (the connection named `SET-YOUR-SALESFORCE-CONNECTION`, ids of zeros): **set your Salesforce
connection** (and the other values your steps use) before you import such a package.

```json
{
  "accountId": "<API Account ID>",
  "salesforce": { "connectionId": "<id>", "connectionName": "<name>", "appInstanceId": "<id>" },
  "clm": { "connectionId": "<id>", "connectionName": "<name>" }
}
```

Give only what your steps use. Where to read each value on your own account:

- `accountId`: eSignature Settings ▸ Apps and Keys ▸ API Account ID.
- `salesforce`: build one small workflow in Workflow Builder with a Read from Salesforce step on your Salesforce
  connection and export it. The export names the connection (`currentConnection` / `connectionInstanceId`, and
  `connectionInstanceName`) and the app instance (`appInstanceId`). Ask the user for them, or read them from that file.
- `clm`: the same, with an Archive to CLM step: `connectionInstanceId` and the connection's name.

A package without connected-app steps needs none of this.
