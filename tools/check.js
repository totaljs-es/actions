// Checks the action folders (structure and style) and the tests folder, and runs the tests.
//
// node tools/check.js conversations     one action folder (actions/conversations), then the tests
// node tools/check.js                   every action folder, then the tests
// node tools/check.js --skip-tests      only the structure and the style

var Fs = require('fs');
var Path = require('path');
var Child = require('child_process');

var ROOT = Path.resolve(__dirname, '..');
var current = '';
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
		error(current + ': no NEWACTION() found');
		return;
	}

	for (var i = 0; i < names.length; i++) {

		var item = names[i];
		var next = names[i + 1] ? names[i + 1].index : code.length;
		var body = code.substring(item.index, next);
		var where = current + ':' + line(code, item.index) + ' ' + item.name + ': ';

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
		warn(current + ': add a comment "EXAMPLE:" that shows how to call the action');

	// Secrets in config
	var regconfig = /\b(\w*(token|secret|password|apikey|key)\w*)\s*:\s*'([^']+)'/gi;
	while (match = regconfig.exec(code)) {
		var value = match[3];
		if (!(/^YOUR_/).test(value) && !(/^https?:/).test(value))
			error(current + ':' + line(code, match.index) + ': "' + match[1] + '" looks like a real secret; use an empty string or a YOUR_... placeholder');
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
			warn(current + ':' + line(code, match.index) + ': ' + rules[j][1]);
	}
}

function checktest(code) {

	if (!(/Test\.print\(/).test(code))
		error('tests: no assertions. Use Test.push() and Test.print(message, error); see SKILL.md');

	if (!(/\.promise\(|\.callback\(/).test(code))
		warn('tests: they do not call an action with ACTION()');

	if ((/Object\.keys\(Total\.actions\)/).test(code))
		warn('tests: call the actions by their name instead of Object.keys(Total.actions)[0]');

	if ((/https?:\/\/(?!127\.0\.0\.1|localhost)/).test(code.replace(/\/\/.*$/gm, '').replace(/'[^']*example\.com[^']*'/g, '')))
		warn('tests: they seem to use a remote URL; a test must not need the network');
}

function runtests() {
	var res = Child.spawnSync(process.execPath, [Path.join(ROOT, 'node_modules', 'total5', 'bin', 'total5'), 'test'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
	var output = ((res.stdout || '') + (res.stderr || '')).trim();
	if (res.error || res.status !== 0) {
		error('tests failed' + (res.error ? ' (' + res.error.code + ')' : ' with exit code ' + res.status));
		console.log(output.split('\n').slice(-25).map(function(text) { return '          ' + text; }).join('\n'));
	} else {
		var count = (output.match(/Tests: (\d+)/) || [])[1];
		if (count)
			ok('tests passed (' + count + ' assertions)');
		else
			error('the tests did not run: the installed total5 has no "test" command, run "npm install total5@beta"');
	}
}

function checktests(skip) {

	var dir = Path.join(ROOT, 'tests');
	console.log('tests');

	var before = errors;
	var all = '';

	(Fs.existsSync(dir) ? Fs.readdirSync(dir) : []).filter(function(name) { return /\.js$/.test(name); }).forEach(function(name) {
		syntax(Path.join(dir, name));
		all += Fs.readFileSync(Path.join(dir, name), 'utf8') + '\n';
	});

	if (errors > before)
		return;

	if (!all) {
		ok('no test files');
		return;
	}

	checktest(all);

	if (skip)
		return;

	if (!Fs.existsSync(Path.join(ROOT, 'node_modules', 'total5'))) {
		error('total5 is not installed: run "npm install"');
		return;
	}

	runtests();
}

function check(folder) {

	console.log(Path.relative(ROOT, folder) || '.');

	var filename = Path.basename(folder) + '.js';
	var action = Path.join(folder, filename);

	if (!Fs.existsSync(action)) {
		error('missing ' + filename);
		return;
	}

	current = filename;
	var before = errors;
	syntax(action);

	if (errors > before)
		return;

	// example/ is the template: its name is not Collection|verb
	checkaction(Fs.readFileSync(action, 'utf8'), Path.basename(folder) === 'example');
}

function folders() {
	var dir = Path.join(ROOT, 'actions');
	var list = (Fs.existsSync(dir) ? Fs.readdirSync(dir) : []).filter(function(name) {
		return Fs.existsSync(Path.join(dir, name, name + '.js'));
	}).sort().map(function(name) {
		return Path.join(dir, name);
	});
	list.push(Path.join(ROOT, 'example'));
	return list;
}

var args = process.argv.slice(2);
var skip = args.indexOf('--skip-tests') !== -1;
args = args.filter(function(name) { return name !== '--skip-tests'; });
var list = args.length ? args.map(function(name) {
	// A name of an action ("conversations") or a path ("actions/conversations")
	var folder = Path.join(ROOT, 'actions', name);
	return Fs.existsSync(folder) ? folder : Path.resolve(name);
}) : folders();

list.forEach(function(folder) {
	check(folder);
	console.log('');
});

checktests(skip);
console.log('');

console.log('Errors: ' + errors + ', warnings: ' + warnings);
process.exit(errors ? 1 : 0);
