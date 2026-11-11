# Create actions with an AI

This repository is prepared so an AI agent can create a Total.js 5 action and its test from a description. You describe what the action does, the agent writes it, and a checker runs the test.

## 1. Install

```bash
git clone https://github.com/totaljs/actions.git
cd actions
npm install
```

`npm install` installs `total5@beta`, which the actions and their tests need.

## 2. Open the folder with your AI agent

Open the `actions` folder in Claude Code, Codex, Gemini CLI or another agent that reads `AGENTS.md`. The agent reads `AGENTS.md` and loads the skill (`SKILL.md`) by itself: the rules, the template and the way to write the test are already there.

## 3. Describe the action

Say what it does, what goes in and what comes out. For example:

> Create an action `Shipments|search` that searches shipments between two cities in a shipping API. It receives `from` and `to` and returns a list with the id, the origin, the destination and the status. Add its test.

> Create an action `Shipments|parse` that converts this response of the API into a list of shipments. Add tests with this sample.

Tips:

- **Give a real sample** of the answer of the API, trimmed and without tokens or personal data. The agent saves it as the data of the test.
- **Split the work**: one action that only parses the answer (`parse`) and one that calls the API (`search`). The first one is tested with the sample, the second one with a local test server.
- **Ask for the tests** every time. An action without a test is not finished.
- Tell the agent to use https://forge.totaljs.es when it needs to check how something of Total.js 5 works.

## 4. What the agent does

- Creates the folder `actions/<name>/` with `<name>.js`, and `tests/<name>.js` with its test; the sample data of the test is written inside that file.
- Takes the template from `example/` and `example/test.js` and follows the rules of `SKILL.md`.
- Runs the checker and fixes what it reports:

```bash
node tools/check.js <name>
```

The checker verifies the name (`Collection|verb`), `name`, `summary`, `input` and `output`, that the action always answers, that no real secret is written in `config`, and then it runs all the tests.

## 5. Review the result

- Run `node tools/check.js <name>` yourself: it must end with `Errors: 0`.
- Read `tests/<name>.js`: it should cover a valid call, a missing required field, a bad answer of the API and the edge cases of your data.
- Check `config`: the URL and the token are configurable and the token is empty or `YOUR_TOKEN`.
- A test never calls the real service. To try the real API, call the action from your own application with your token.

## Test an action

All the tests are in the `tests/` folder, one file per action. The template is `example/test.js`: it loads the action and calls it the way an application does. A test you can read and run is the quickest way to see that the action works.

Run it with the checker, which also checks the action:

```bash
node tools/check.js <name>
```

or run only its test, or all the tests:

```bash
total5 test <name>
total5 test
```

Every check prints `[OK]` or `[FAIL]`. A failure stops the test with an error.

A test is a list of steps. Each step calls the action with `ACTION(...)` and records what it found with `Test.print`. This one tests an action `Hello|say` that receives a required `name` and returns `text`:

```js
require('../actions/hello/hello');

const USER = new User({ id: 'test', name: 'Test', sa: true, permissions: [] });

Test.push('Hello|say', async function(next) {

	var output = await ACTION('Hello|say', { name: 'Peter' }).user(USER).promise();
	Test.print('returns the greeting', output.text === 'Hello Peter!' ? null : 'got ' + output.text);

	try {
		await ACTION('Hello|say', {}).user(USER).promise();
		Test.print('rejects a missing name', 'did not fail');
	} catch (e) {
		Test.print('rejects a missing name');
	}

	next();
});
```

- `Test.print(message)` records a check that passed. `Test.print(message, error)` with a value records a failure.
- `.promise()` gives the answer of the action and rejects with the error, for example when a required field is missing.
- `.config({ ... })` replaces a value of `config` for one call, for example the URL of a local test server.
- A test does not call a real service and does not need a token. The answers of an API are sample data inside the test file.

The complete rules are in [SKILL.md](SKILL.md) and the API in [docs/api.md](docs/api.md).
