---
name: action
description: Create, change or test a Total.js 5 action (NEWACTION) for this repository, for example an action that calls an external API, parses a provider response or searches data. Output - a folder actions/<name>/ with action.js and test.js (and fixtures/ when the test needs sample data).
---

# Creating an action

An action is one unit of server logic: a name, the input it accepts, the output it returns and a function. The user describes what the action must do ("parse the response of a shipping API", "search shipments between two cities"). You deliver the action and a test that proves it works, without network and without credentials.

Read these first:

- `example/action.js` and `example/test.js`: the template: an action and its test, which calls the action and checks the result.
- `docs/api.md`: the options of `NEWACTION`, the `$` object, the types of `input` and `output`, how to call an action, `REQUEST` and the test library. **Do not use an option or method that is not there or in the template.**

## Setup (once)

```bash
npm install          # installs total5@beta
```

The repository needs the Total.js 5 **beta** (`total5@beta`): the template uses `User` and `.env()`, which the `latest` tag does not have.

## Output

```
actions/<name>/
  action.js        one or more NEWACTION(), name after the provider or the topic (lower case)
  test.js          runs the actions with assertions, no network, no credentials
  fixtures/        sample data for the tests (only if needed)
```

The older single files in `actions/*.js` stay as they are. A new action always has its folder and its test.

## Workflow

1. **Name it.** `Collection|verb`, the collection in plural and capitalized, the two parts separated by a pipe: `Shipments|search`, `Shipments|parse`. Check the existing files so the name is not taken. Verbs: `list`, `read`, `create`, `update`, `save`, `remove`, plus a domain verb when it fits (`search`, `parse`, `send`, `ask`).
2. **Write the contract** before the code, short: what goes in (`input`), what comes out (`output`), what is configurable (`config`), which errors it returns. Split by responsibility: a `parse` action only transforms data it receives (no network); a `search` action calls the provider and delegates the transformation to `parse`. Decide the open questions yourself and state the assumption; ask the user only when a decision changes the data contract.
3. **Write `action.js`** following the rules below.
4. **Collect fixtures** for the parsers: a real (trimmed, anonymized) response of the provider in `fixtures/`. No tokens, no personal data.
5. **Write `test.js`** following the section "Test".
6. **Check.** `node tools/check.js actions/<name>` checks the structure, the style and runs the test. Fix what it reports.
7. **Report** what was verified and what was not (for example: "the real API was not called; the parsing is verified against the fixture only").

## action.js

Start from `example/action.js`.

```js
NEWACTION('Shipments|search', {
	name: 'Search shipments',
	summary: 'Searches shipments between two cities',
	input: '*from,*to,limit:Number',
	output: 'success:Boolean, items:[{ id:String, from:String, to:String, delay:Number }]',
	config: { url: 'https://api.example.com', token: '' },
	action: function($, model) {

		var opt = {};
		opt.method = 'GET';
		opt.url = $.config.url + '/shipments?from=' + encodeURIComponent(model.from) + '&to=' + encodeURIComponent(model.to);
		opt.headers = { Authorization: 'Bearer ' + $.config.token };
		opt.callback = function(err, response) {

			if (err || response.status !== 200) {
				$.invalid(err || response.status);
				return;
			}

			$.action('Shipments|parse', { data: response.body }).callback($);
		};

		REQUEST(opt);
	}
});

/*
	EXAMPLE:
	ACTION('Shipments|search', { from: 'Berlin', to: 'Vienna' }).config({ token: 'YOUR_TOKEN' }).callback(console.log);
*/
```

Rules:

- **Always give `name`, `summary`, `input` and `output`.** `summary` is the description that an AI client sees when the action is exposed (`mcp: true`). `output` is also a filter: only the declared keys leave the action.
- **Answer exactly once, then `return`.** `$.callback(data)`, `$.success(value)` or `$.invalid(error)`. An action that never answers hangs the caller. Every `err` of a callback ends in `$.invalid(err)`.
- **Everything configurable goes to `config`** (URL of the API, token, limits) and is read as `$.config.<key>`. The default of a secret is an empty string or a `YOUR_TOKEN` placeholder; never a real token. Tests and applications override it with `.config({ ... })`.
- **The base URL is in `config`.** It is what lets the test point the action at a local server.
- **Validate at the border.** `input` marks required fields with `*`. Whatever the provider returns is not trusted: check that the keys you read exist and return `$.invalid('@(Unknown format)')` instead of crashing.
- **Reuse other actions** with `$.action('Collection|verb', payload)`: `.callback($)` returns its answer or its error as the answer of the current action; `await ... .promise($)` gives the value inside an `async` action. Do not copy code between actions.
- A text for a person is `@(Text)`.
- Code: ES5 style (`var`, `function`), tabs, single quotes, Total.js prototypes (`parseJSON`, `parseXML`, `parseCSV`, `format`, `slug`, `findItem`...) before hand-written helpers. No TypeScript. No `require()` in `action.js`: use `Total.Fs`, `Total.Path`, `Total.Crypto`, etc. A dependency from npm is allowed only when it is really needed and is listed in the `NPM` constant of the test (see `example/test.js`).
- A comment `EXAMPLE:` at the end shows how to call the action.
- `route: true`, `user: true`, `permissions`, `timeout` and `mcp: true` only when the task asks for them (see `docs/api.md`).

## Test

`test.js` runs the action as the application would (`ACTION(...)`), with the test library of Total.js, and **asserts** the result. A test that only prints is not a test.

```js
require('total5');
require('total5/test');
require('./action');

const USER = new User({ id: 'test', name: 'Test', sa: true, permissions: [] });
const FIXTURE = Total.Fs.readFileSync(PATH.root('fixtures/shipments.json'), 'utf8');

let server;
let url;

function call(name, input, config) {
	return ACTION(name, input).env('test').user(USER).config(config || {}).promise();
}

// A local server answers instead of the real provider
Test.push('start the fixture server', function(next) {
	server = Total.Http.createServer(function(req, res) {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(FIXTURE);
	});
	server.listen(0, '127.0.0.1', function() {
		url = 'http://127.0.0.1:' + server.address().port;
		next();
	});
});

Test.push('Shipments|parse', async function(next) {

	var out = await call('Shipments|parse', { data: FIXTURE });
	Test.print('returns 2 items', out.items.length === 2 ? null : 'got ' + out.items.length);

	try {
		await call('Shipments|parse', { data: '{}' });
		Test.print('rejects an unknown format', 'did not fail');
	} catch (e) {
		Test.print('rejects an unknown format');
	}

	next();
});

Test.push('Shipments|search', async function(next) {
	var out = await call('Shipments|search', { from: 'Berlin', to: 'Vienna' }, { url: url });
	Test.print('returns items', out.items.length === 2 ? null : 'got ' + out.items.length);
	server.close();
	next();
});

Test.run();
```

- `Test.push(name, fn)` registers a step, `Test.print(message, error)` records it: `null`/missing error is `[OK]`, any value is `[FAIL]` and the process ends with exit code 1. `Test.run()` runs the steps in order and ends the process.
- Cover, for every action: a valid call, a call with a missing required field, the unknown or empty answer of the provider, and the edge cases of the data (empty list, missing optional keys, a different format).
- The test never calls the real provider and never needs a token. Provider answers come from `fixtures/`, served by the local server above or passed directly to a `parse` action. An optional live test is a separate file that is skipped unless the user asks for it.
- The test finishes by itself (close the server) and does not depend on the order of the files on disk: call actions by their explicit name, not with `Object.keys(Total.actions)[0]`.
- Run from the folder of the action: `PATH.root(...)` is the folder where `node test.js` runs, which is how `tools/check.js` runs it.

## Checklist

- [ ] `Collection|verb` name, `name`, `summary`, `input`, `output`.
- [ ] Every path answers once (`$.callback`, `$.success` or `$.invalid`) and returns.
- [ ] Configurable values in `config`, no real secret in the repository.
- [ ] Fixtures without tokens or personal data.
- [ ] `test.js` with assertions: valid input, invalid input, bad provider answer, edge cases.
- [ ] `node tools/check.js actions/<name>` passes.
