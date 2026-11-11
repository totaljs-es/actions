require('./example');

// The template of a test. Copy it to tests/<name>.js and load the action with:
// require('../actions/<name>/<name>');
//
//   total5 test <name>               the test of one action
//   cd example && total5 test test   this template

// A custom NPM dependencies name separated by the comma
const NPM = ''.split(',').trim();

// A default user
const USER = new User({ id: 'test', name: 'Test', sa: true, permissions: [] });

// A default environment
const ENVNAME = 'test';

// Access to the DB is prepared in tests/init.js

Test.push('Dependencies', function(next) {
	NPM.wait(NPMINSTALL, next);
});

Test.push('Example', async function(next) {

	const input = {};

	input.name = 'Peter';
	input.age = 42;

	// A valid call
	const output = await ACTION('Example', input).env(ENVNAME).user(USER).promise();
	Test.print('returns success', output.success === true ? null : 'success: ' + output.success);
	Test.print('returns the id', output.value ? null : 'the value is empty');

	// A call without the required "name"
	try {
		await ACTION('Example', { age: 42 }).env(ENVNAME).user(USER).promise();
		Test.print('rejects a missing name', 'did not fail');
	} catch (e) {
		Test.print('rejects a missing name');
	}

	next();
});
