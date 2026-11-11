# AGENTS.md

Guidance for AI agents. This repository is a set of predefined [Total.js](https://www.totaljs.com) 5 actions, and it teaches an agent how to **create an action** (and its test) from a natural-language description, for example "an action that parses the response of a shipping API" or "an action that searches shipments between two cities".

## Project

An action is declared with `NEWACTION('Collection|verb', { name, summary, input, output, config, action })`: it has an input, an output and a function, and it can be called from code, from an HTTP route or as an MCP tool. The reference is `example/`.

Plain JavaScript in ES5 style, no TypeScript (Total.js does not support it: never add types or `.d.ts`). Requires `total5@beta`.

## Using it

1. Read [`SKILL.md`](SKILL.md): the workflow, the rules, how to write the test and the checklist.
2. Start from `example/example.js` and `example/test.js`.
3. Use [`docs/api.md`](docs/api.md) for the options of `NEWACTION`, the `$` object, the types, `REQUEST` and the test library.
4. Install and check the result:

```bash
npm install                            # once
total5 test                            # all the tests (the same as npm test)
total5 test <name>                     # the test of one action; several: total5 test audit, channels
node tools/check.js <name>             # structure and style of an action, then all the tests
node tools/check.js                    # every action folder, then all the tests
```

## Repository layout

- `SKILL.md` is the skill: how to create an action. `.claude/skills/action/` and `.agents/skills/action/` point to it so Claude Code and Codex load it.
- `example/` is the template action and `example/test.js` its test.
- `actions/<name>/` is one action: `<name>.js`, plus its README, `init.sql` or `data/` when it needs them. The folder can be copied into the `actions` folder of an application as it is.
- `tests/` holds all the tests, one file per action (`tests/<name>.js`, sample data inside it), an optional `tests/init.js` with the common preparation (for example a database connection) and `tests/config` with the config of the tests. `total5 test` runs them.
- `docs/api.md` is the reference of the API.
- `tools/check.js` checks the action folders and runs the tests.
- `llms.txt` is the index for models. `CLAUDE.md`, `GEMINI.md` import this file.

## Conventions

- Name: `Collection|verb`, the collection in plural and capitalized, a pipe between the two parts (`Shipments|search`).
- Every action has `name`, `summary`, `input` and `output`, and answers exactly once with `$.callback()`, `$.success()` or `$.invalid()`.
- Configurable values (URL, token, limits) are in `config`; a secret is never committed, its default is an empty string or `YOUR_TOKEN`.
- Code: ES5, tabs, single quotes, Total.js prototypes before hand-written helpers; no `require()` in an action.
- Every action has a test with assertions that needs no network and no credentials; the data of a provider is sample data inside its test file.
