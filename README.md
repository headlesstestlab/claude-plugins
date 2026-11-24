# Docusign demo skills for Claude Code

A Claude Code plugin marketplace, `demo-studio`, with one plugin, `docusign`: Claude skills that design and
build Docusign demo assets (eSignature and document templates, web forms, Maestro workflows, CLM, AI agents and more)
from a plain-language request. Each skill loads when a request matches its description.

Skills: `docusign-ai-agent`, `docusign-clm`, `docusign-document-template`, `docusign-esignature-template`, `docusign-gen-salesforce`, `docusign-request-type`, `docusign-solution`, `docusign-webform`, `docusign-workflow`.

## Install

In Claude Code, one command at a time:

**1. Add the catalogue**

```
/plugin marketplace add headlesstestlab/claude-plugins
```

**2. Install**

```
/plugin install docusign@demo-studio
```

**3. Load the skills (or start a new session)**

```
/reload-plugins
```

The skills show as `docusign:<skill>`. To check it is installed and see its version, run `/plugin`.

## Update

A new version is published here when the skills change. To get it:

**1. Update the catalogue**

```
/plugin marketplace update demo-studio
```

**2. Load the skills**

```
/reload-plugins
```

## Notes

- Not an official Docusign product, and not supported by Docusign. Use it with a Docusign developer (demo) account.
- Provided as is, without warranty of any kind. Check what a skill builds before you use it with real data.
- This repository is generated; pull requests to it are overwritten. Questions and bug reports: open an issue here.

Maintained by Steven Cooke.
