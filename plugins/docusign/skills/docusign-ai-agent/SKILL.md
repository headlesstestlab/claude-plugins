---
name: docusign-ai-agent
description: Designs a Docusign AI agent (Agent Studio, Automations ▸ Agents) and produces a validated build sheet for Agent Studio's editor - capabilities, instructions, chat starter prompts, workflow outputs and knowledge files - with optional entry in the user's signed-in browser. Use it when someone wants just the agent - a chat assistant that answers from signed agreements, or the agent of an Execute AI Agent step (triage, NDA check, obligation extraction, summaries, risk scoring) - even if they only describe what it should do. Not when the agent is one step of a process that also needs a workflow, request type or documents built - use docusign-solution.
metadata:
  version: "v2026.11.23.3"
---

# Docusign AI agent builder

This skill designs an **Agent Studio agent**: its name, description, instructions, the capabilities
(tools) it may use, its chat starter prompts, and the outputs it hands a Workflow Builder workflow.

**Agent Studio has no import or export.** Agents are made in its editor, so the deliverable is a
**build sheet**: a step-by-step, copy-paste page for **Automations ▸ Agents ▸ Create New**. Before
writing it, `scripts/compile.mjs` checks the spec against the editor's own limits and the measured
capability table.

## Workflow

### 1. Understand the job
Find out:
- what the agent should decide, extract or answer, and from what data (agreements, requests,
  documents, a connected CRM);
- whether people will **chat** with it, a **workflow** will run it, or both;
- for a workflow, which values later steps need, such as a risk level, a route or a date;
- whether it must **change** anything. Most agents only read; say so.

### 2. Pick capabilities, the fewest that do the job
The editor grants whole capabilities, never single tools:

| Capability | Kind | Use for |
|---|---|---|
| Find Agreements | reads | searching and reading completed agreements, their fields and hierarchy |
| Party Insights | reads | statistics and reporting on counterparties |
| Review Documents | reads | AI review of a document, Word redlines and comments |
| Search Salesforce / HubSpot / Microsoft Dynamics 365 | reads | records in a connected CRM; that account must be connected |
| Manage Requests | **writes** | reading **and** creating or changing Agreement Desk requests, notes, messages, approvals |
| Send Envelopes | **writes** | sending, updating or voiding envelopes |
| Generate Documents | **writes** | creating documents from templates |
| Ask the User | **pauses** | asking a person a question. In chat only: a workflow run would wait forever |

- **No capability** is valid: the agent works from its prompt alone, like an address splitter or a
  classifier.
- **Any writing capability needs `"acts": true`** in the spec. It is the only way to read a request's
  attachments, too. The instructions should then say what the agent must *not* change.
- **Knowledge files** (PDF, TXT, DOC, DOCX, CSV) are searched only when the agent has at least one
  capability.

### 3. Write the spec
`references/spec-format.md` is the full reference: every field, the capabilities, how instructions
render, workflow outputs, and what the editor can't express. Start from the closest example in
`references/examples/`:

| Example | Shows |
|---|---|
| `address-splitter` | no capabilities, workflow outputs |
| `nda-quick-check` | reads and reviews |
| `renewal-notice-watcher` | six outputs |
| `third-party-paper-triage` | writing capability, request routing |

The examples belong to a fictional company, "Fontara", so write for the user's organisation instead.

Conventions:
- **Name:** letters, numbers and spaces only, 50 characters at most; no `·`, `-` or `&`.
  **Description:** 1000 characters at most.
- **Instructions** are markdown in this shape (the shape Agent Studio's own builder uses, plus
  Rules):
  - "You are …" and the job, in one or two sentences, plus when to use the tools;
  - `## Core workflow`: numbered steps, including what to do when something isn't found;
  - `## Rules`: output rules, "Never invent …", and "Always set every output" for workflow agents;
  - `## Voice and tone`.
  - Write `instructions` as an array, one item per line. The compiler joins items so headings and
    lists render. There are no tables in the editor, so use lists: the compiler refuses a markdown
    table in the instructions.
- **Starter prompts:** at most 3, each 200 characters at most, naming the kind of data the account
  holds.
- **Workflow outputs:** `{name, format, description}`. `format` is `string`, `number` or `boolean`.
  The name is a variable name. The description tells the agent what to put there, so write it as an
  instruction ("Exactly one of GREEN, YELLOW or RED").
- **Knowledge:** `[{ "file": "playbook.pdf" }]`, with the file next to the spec.
- Add `testPrompt` and `testExpect`, a question about real data and the words a good answer
  contains. They become the sheet's test step. `testAgreements` (exact agreement titles on the
  account) adds those agreements to the test, as the editor's Test panel does.
- **Chat, workflow or both:** an agent with no `outputs` is a chat agent (starter prompts); one with
  outputs and no capabilities only reads what its workflow step hands it, so give it no starter
  prompts.
- Don't use `extraTools`; the editor can't add single tools.

### 4. Compile
```bash
node <skill-dir>/scripts/compile.mjs <agent>.spec.json
```
This writes `<id>.build-sheet.md`.
- **ERROR** means nothing was written; fix the spec.
- **WARNING** (writes data, pauses for a person, needs a connected CRM) must be passed on to the
  user.

### 5. Deliver
Give the user the build sheet and the spec, and summarise the agent: its job, capabilities, outputs
and starter prompts. The sheet walks through:
- name and description;
- In chat (starter prompts) and In a workflow (outputs);
- instructions;
- capabilities;
- knowledge files;
- **Save draft ▸ Test ▸ Publish**.

Only a published agent can be picked in a workflow's **Execute AI Agent** step. The
`docusign-workflow` skill can't carry agents in its packages, so add that step in the workflow
builder after import, then point it at this agent.

### 6. Optional: fill in the editor for them
Do this only if the user asks, and only with their explicit OK for this agent; it creates an agent
in their real account. Follow `references/live-upload.md`. It uses their own signed-in browser,
never their credentials, saves a draft only, and never publishes or runs an acting test without a
second OK.

## Files
- `scripts/compile.mjs`: spec to a validated build sheet.
- `scripts/lib/agent-spec.mjs`: the editor's rules and capability table, generated from the gallery
  repo. Don't edit it.
- `references/spec-format.md`: fields, capabilities, instructions, outputs and limits.
- `references/examples/*.spec.json`: four complete real specs.
- `references/live-upload.md`: filling the editor in a browser.
