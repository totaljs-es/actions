// Checks an action folder: structure, style and runs its test.
//
// node tools/check.js actions/<name>    one folder
// node tools/check.js                   every folder in actions/ and example/

var Fs = require('fs');
var Path = require('path');
var Child = require('child_process');

var ROOT = Path.resolve(__dirname, '..');
var errors = 0;
var warnings = 0;

function error(message) {
	errors++;
	console.log('  [ERROR] ' + message);
}

function warn(message) {
	warnings++;
	console.log('  [WARN]  ' + message);
}

function ok(message) {
	console.log('  [OK]    ' + message);
}

function syntax(filename) {
	var res = Child.spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
	if (res.status !== 0)
		error(Path.basename(filename) + ': syntax error\n' + (res.stderr || '').trim());
	else
		ok(Path.basename(filename) + ' has a valid syntax');
}

function line(code, index) {
	return code.substring(0, index).split('\n').length;
}

function checkaction(code, template) {

	var regname = /NEWACTION\(\s*'([^']+)'/g;
	var match;
	var names = [];

	while (match = regname.exec(code))
		names.push({ name: match[1], index: match.index });

	if (!names.length) {
		error('action.js: no NEWACTION() found');
		return;
	}

	for (var i = 0; i < names.length; i++) {

		var item = names[i];
		var next = names[i + 1] ? names[i + 1].index : code.length;
		var body = code.substring(item.index, next);
		var where = 'action.js:' + line(code, item.index) + ' ' + item.name + ': ';

		if (!template && !(/^[A-Z][A-Za-z0-9]*\|[a-z][a-z0-9]*$/).test(item.name))
			error(where + 'the name must be "Collection|verb" (capitalized collection, pipe, lower case verb)');

		if (!(/\bname\s*:\s*'/).test(body))
			error(where + 'missing "name"');

		if (!(/\bsummary\s*:\s*'/).test(body))
			error(where + 'missing "summary"');

		if (!(/\binput\s*:/).test(body))
			warn(where + 'no "input" (is it an action without payload?)');

		if (!(/\boutput\s*:/).test(body))
			warn(where + 'no "output" (without it the answer is not filtered and not documented)');

		if (!(/\$\.(callback|success|invalid)\(/).test(body))
			error(where + 'it never answers: use $.callback(), $.success() or $.invalid()');
	}

	if (!template && !(/EXAMPLE:/).test(code))
		warn('action.js: add a comment "EXAMPLE:" that shows how to call the action');

	// Secrets in config
	var regconfig = /\b(\w*(token|secret|password|apikey|key)\w*)\s*:\s*'([^']+)'/gi;
	while (match = regconfig.exec(code)) {
		var value = match[3];
		if (!(/^YOUR_/).test(value) && !(/^https?:/).test(value))
			error('action.js:' + line(code, match.index) + ': "' + match[1] + '" looks like a real secret; use an empty string or a YOUR_... placeholder');
	}

	var rules = [
		[/\brequire\s*\(/, 'no require() in an action: use Total.Fs, Total.Path, Total.Crypto...'],
		[/=>/, 'ES5 style: use "function" instead of an arrow function'],
		[/\bconst\s/, 'ES5 style: use "var" (or "let") instead of "const"'],
		[/`/, 'ES5 style: use \'{0}\'.format() instead of a template literal'],
		[/\bprocess\.env\b/, 'do not read process.env in an action: use $.config']
	];

	for (var j = 0; j < rules.length; j++) {
		match = rules[j][0].exec(code);
		if (match)
			warn('action.js:' + line(code, match.index) + ': ' + rules[j][1]);
	}
}

function checktest(code) {

	if (!(/Test\.print\(/).test(code))
		error('test.js: no assertions. Use Test.push() and Test.print(message, error); see SKILL.md');

	if (!(/Test\.run\(/).test(code))
		warn('test.js: missing Test.run()');

	if (!(/\.promise\(|\.callback\(/).test(code))
		warn('test.js: it does not call an action with ACTION()');

	if ((/Object\.keys\(Total\.actions\)/).test(code))
		warn('test.js: call the actions by their name instead of Object.keys(Total.actions)[0]');

	if ((/https?:\/\/(?!127\.0\.0\.1|localhost)/).test(code.replace(/\/\/.*$/gm, '')))
		warn('test.js: it seems to use a remote URL; a test must not need the network');
}

function runtest(folder) {
	var res = Child.spawnSync(process.execPath, ['test.js'], { cwd: folder, encoding: 'utf8', timeout: 60000 });
	var output = ((res.stdout || '') + (res.stderr || '')).trim();
	if (res.error || res.status !== 0) {
		error('test.js failed' + (res.error ? ' (' + res.error.code + ')' : ' with exit code ' + res.status));
		console.log(output.split('\n').map(function(text) { return '          ' + text; }).join('\n'));
	} else {
		var count = (output.match(/Tests: (\d+)/) || [])[1];
		ok('test.js passed' + (count ? ' (' + count + ' assertions)' : ''));
	}
}

function check(folder) {

	console.log(Path.relative(ROOT, folder) || '.');

	var action = Path.join(folder, 'action.js');
	var test = Path.join(folder, 'test.js');

	if (!Fs.existsSync(action)) {
		error('missing action.js');
		return;
	}

	if (!Fs.existsSync(test)) {
		error('missing test.js');
		return;
	}

	var before = errors;
	syntax(action);
	syntax(test);

	if (errors > before)
		return;

	// example/ is the template: its name is not Collection|verb
	var template = Path.basename(folder) === 'example';

	checkaction(Fs.readFileSync(action, 'utf8'), template);

	checktest(Fs.readFileSync(test, 'utf8'));

	if (!Fs.existsSync(Path.join(ROOT, 'node_modules', 'total5'))) {
		error('total5 is not installed: run "npm install"');
		return;
	}

	runtest(folder);
}

function folders() {
	var arr = [Path.join(ROOT, 'example')];
	var dir = Path.join(ROOT, 'actions');
	Fs.readdirSync(dir).forEach(function(name) {
		var path = Path.join(dir, name);
		if (Fs.statSync(path).isDirectory())
			arr.push(path);
	});
	return arr;
}

var args = process.argv.slice(2);
var list = args.length ? args.map(function(name) { return Path.resolve(name); }) : folders();

list.forEach(function(folder) {
	check(folder);
	console.log('');
});

console.log('Errors: ' + errors + ', warnings: ' + warnings);
process.exit(errors ? 1 : 0);
