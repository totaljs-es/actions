# AGENTS.md

Guidance for AI agents. This repository is a set of predefined [Total.js](https://www.totaljs.com) 5 actions, and it teaches an agent how to **create an action** (and its test) from a natural-language description, for example "an action that parses the response of a shipping API" or "an action that searches shipments between two cities".

## Project

An action is declared with `NEWACTION('Collection|verb', { name, summary, input, output, config, action })`: it has an input, an output and a function, and it can be called from code, from an HTTP route or as an MCP tool. The reference is `example/`.

Plain JavaScript in ES5 style, no TypeScript (Total.js does not support it: never add types or `.d.ts`). Requires `total5@beta`.

## Using it

1. Read [`SKILL.md`](SKILL.md): the workflow, the rules, how to write the test and the checklist.
2. Start from `example/action.js` and `example/test.js`.
3. Use [`docs/api.md`](docs/api.md) for the options of `NEWACTION`, the `$` object, the types, `REQUEST` and the test library.
4. Install and check the result:

```bash
npm install                            # once
node tools/check.js actions/<name>     # structure, style and runs the test
node tools/check.js                    # every action folder
```

## Repository layout

- `SKILL.md` is the skill: how to create an action. `.claude/skills/action/` and `.agents/skills/action/` point to it so Claude Code and Codex load it.
- `example/` is the template: `action.js` and `test.js`.
- `actions/<name>/` is one action: `action.js`, `test.js` and `fixtures/` when the test needs sample data. The older single files `actions/*.js` have no folder.
- `docs/api.md` is the reference of the API.
- `tools/check.js` checks an action folder and runs its test.
- `llms.txt` is the index for models. `CLAUDE.md`, `GEMINI.md` import this file.

## Conventions

- Name: `Collection|verb`, the collection in plural and capitalized, a pipe between the two parts (`Shipments|search`).
- Every action has `name`, `summary`, `input` and `output`, and answers exactly once with `$.callback()`, `$.success()` or `$.invalid()`.
- Configurable values (URL, token, limits) are in `config`; a secret is never committed, its default is an empty string or `YOUR_TOKEN`.
- Code: ES5, tabs, single quotes, Total.js prototypes before hand-written helpers; no `require()` in an action.
- Every action has a test with assertions that needs no network and no credentials; the data of a provider comes from `fixtures/`.
