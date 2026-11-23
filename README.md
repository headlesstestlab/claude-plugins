# Docusign demo skills for Claude Code

A Claude Code plugin marketplace, `demo-studio`, with one plugin, `docusign`: Claude skills that design and
build Docusign demo assets (eSignature and document templates, web forms, Maestro workflows, CLM, AI agents and more)
from a plain-language request. Each skill loads when a request matches its description.

Skills: `docusign-ai-agent`, `docusign-clm`, `docusign-document-template`, `docusign-esignature-template`, `docusign-gen-salesforce`, `docusign-request-type`, `docusign-solution`, `docusign-webform`, `docusign-workflow`.

## Install

In Claude Code:

```
/plugin marketplace add headlesstestlab/claude-plugins
/plugin install docusign@demo-studio
```

Then run `/reload-plugins` or start a new session. The skills show as `docusign:<skill>`.

## Update

`/plugin marketplace update demo-studio`, then `/reload-plugins`. A new version is published here when the skills change.

## Notes

- Not an official Docusign product, and not supported by Docusign. Use it with a Docusign developer (demo) account.
- Provided as is, without warranty of any kind. Check what a skill builds before you use it with real data.
- This repository is generated; pull requests to it are overwritten. Questions and bug reports: open an issue here.

Maintained by Steven Cooke.
