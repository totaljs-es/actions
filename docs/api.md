# Actions API

Reference for writing actions in this repository. It was extracted from the source of `total5@beta` and checked by running it. More documentation: https://docs.totaljs.com

## NEWACTION

```js
NEWACTION('Collection|verb', { ...options });
```

| Option | Type | Meaning |
|---|---|---|
| `name` | String | Human name, used in logs and tools |
| `summary` | String | Description of the action; it is the description of the tool when `mcp: true` |
| `input` | String / `'@Schema'` | Body of the call, see "Types". Without `input` the action gets no payload |
| `output` | String | Shape of the answer. Only the declared keys are returned, everything else is removed |
| `params` | String | Route parameters (`$.params`) |
| `query` | String | Query string (`$.query`) |
| `config` | Object | Default configuration, read as `$.config`; a call can override keys with `.config({})` |
| `route` | String / `true` | Creates an HTTP route; `true` is `API ?` (`+API ?` when `user` or `permissions` are set) |
| `user` | Boolean | `true` requires a user, `false` requires no user; otherwise the answer is `401` |
| `permissions` | String | `'users,admin'`: the user needs any of them (`sa`/`su` users always pass); otherwise `401` |
| `sa` / `su` | Boolean | Only for super users |
| `timeout` | Number | Milliseconds; when exceeded the action answers `Timeout.` |
| `mcp` | Boolean | Exposes the action as an MCP tool (`Collection\|verb` becomes `Collection_verb`). The endpoint `POST /$mcp/` of the application is active with `CONF.$mcp = true` |
| `cache` | Object | Keeps the answer, see "Cache" |
| `oninput` | Function | `function($)`, runs before `action`; the input is in `$.input` |
| `onoutput` | Function | `function(err, response, $)`, runs when the action has answered |
| `action` | Function | `function($, model)`, may be `async` |

The `user`, `permissions` and `sa` checks run before the input is validated and before `action`.

## Cache

```js
cache: { expire: '5 minutes', input: true }
```

The answer is kept and returned for the same key without running `action`. `expire` defaults to `5 minutes`. The key is made of the values of the listed parts: `input`, `query`, `params` (`true` for all the declared fields or a text `'from,to'`), `user` (`true` is the `id`, or a text `'id,role'`) and `language: true`. **Without `input: true` two different inputs share one cached answer.** A cache is not a good fit for an action with side effects.

## Types of `input`, `output`, `params`, `query`

A text specification, fields separated by a comma: `'*from,*to,limit:Number,types:[String]'`.

- `*name` is required. A required list that is empty counts as missing.
- `name:Type` sets the type, the default is `String`. `String(50)` limits the length.
- `[Type]` is a list. `[{ id:String, delay:Number }]` is a list of objects.
- Types: `String`, `Number`, `Boolean`, `Date`, `Object`, `Email`, `URL`, `Phone`, `UID`, `GUID`, `JSON`, `Base64`, `DataURI`, `Color`, `Icon`, `Zip`, `Lower`, `Upper`, `Capitalize`, `SmallInt`, `TinyInt`.
- A value is converted to the type (`'1'` to a `Boolean`, a text to a `Date`, `Email` is lower-cased). A value that cannot be converted is an error.
- `'@Name'` uses a schema defined with `NEWSCHEMA('@Name', '...')`.

An invalid input answers with an error list: `[{ name: 'to', error: '@', path: 'to' }]`.

## The `$` object

Inside `action: function($, model)`:

| Member | Meaning |
|---|---|
| `model` (second argument), `$.payload`, `$.input` | The validated input |
| `$.config` | The configuration (defaults of the action + overrides of the call) |
| `$.env` | The environment set with `.env(name)` of the call |
| `$.query`, `$.params` | Query and route parameters |
| `$.user` | The user or `null` |
| `$.controller`, `$.ip`, `$.ua`, `$.language`, `$.headers`, `$.body`, `$.files` | Only in a request that came over HTTP, otherwise `null`/empty |
| `$.callback(data)` | Answers with data |
| `$.success(value)` | The success answer of the app (`{ success: true, value: value }` by default) |
| `$.invalid(error)` | Answers with an error: a text, `'@(Text)'` for a translatable one, a number is the HTTP status (`$.invalid(404)`) |
| `$.action('Collection\|verb', payload)` | Calls another action (same user, query and params); `.callback($)` passes its answer or error on |
| `$.promisify(fn, a, b)` | Wraps a Node callback function in a promise; an error ends in `$.invalid` |

Answer exactly once and `return`. After `$.invalid()` the action is finished.

## Calling an action

```js
ACTION('Shipments|search', { from: 'Berlin', to: 'Vienna' })
	.config({ token: 'abc' })   // override keys of config
	.env('test')                // $.env
	.user(USER)                 // $.user
	.query({})                  // $.query
	.params({})                 // $.params
	.callback(function(err, response) {});
```

Instead of `.callback(fn)` use `.promise()`: it resolves with the answer and **rejects** with the error list. In an action use `.promise($)`: an error answers the current action.

A test user: `new User({ id: 'test', name: 'Test', sa: true, permissions: [] })`.

## REQUEST

```js
var opt = {};
opt.method = 'POST';              // default GET
opt.url = 'https://api.example.com/path';
opt.headers = { Authorization: 'Bearer ' + $.config.token };
opt.type = 'json';                // sets Content-Type: json | urlencoded | xml | text | html | raw
opt.body = JSON.stringify(data);
opt.timeout = 8000;               // ms, default 8000
opt.keepalive = true;
opt.callback = function(err, response) {
	// response.status   {Number}
	// response.body     {String}
	// response.headers  {Object}
};
REQUEST(opt);
```

Without `opt.callback` the call returns a promise. Parse the body with `response.body.parseJSON()`. A non-2xx status is not an `err`: check `response.status`.

`RESTBuilder` is the chained alternative: `await RESTBuilder.GET(url).header('Authorization', 'Bearer ' + token).timeout(5000).promise($)`.

## Parsing helpers

`'...'.parseJSON()`, `'...'.parseXML()`, `'...'.parseCSV(delimiter)`, `'...'.parseDate()`, `'...'.format(a, b)` (`'{0}-{1}'`), `'...'.slug()`, `encodeURIComponent()`. Time: `NOW` is the current date, `NOW.add('5 minutes')`. Ids: `UID()`, `GUID()`.

## Test library

`total5 test` loads the framework, the test library, `tests/config`, the optional `tests/init.js` and the test files, and runs them. A test file only registers its steps.

```bash
total5 test                      # all the files of tests/
total5 test audit                # tests/audit.js
total5 test audit, channels      # several files, in this order
```

| Call | Meaning |
|---|---|
| `Test.push(name, function(next) {})` | Registers a step; call `next()` when it ends (the function may be `async`) |
| `Test.print(message, error)` | Records `[OK] message`; with a truthy `error` it records `[FAIL]` and the process exits with code 1 |
| `Test.fake(name, action)` | Replaces the action `name` with a fake (the same object as in `NEWACTION`); the original is kept |
| `Test.restore()` | Removes the fakes and puts the original actions back; the last step of a file that uses `Test.fake()` |
| `Test.run()` | Runs the steps in order and ends the process; `total5 test` calls it |

## Globals used in a test

`Total.FsPromises` is `node:fs/promises`. `PATH.root(file)` is relative to the folder where the test runs. `Total.Fs`, `Total.Http`, `Total.Path` give access to Node.js modules without `require`.

## Environment

Secrets and URLs come in `config`; the application that uses the action fills them from its own configuration. Do not read `process.env` in an action.
