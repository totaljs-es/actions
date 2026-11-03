require('total5');
require('total5/test');
require('./action');

// A custom NPM dependencies name separated by the comma
const NPM = ''.split(',').trim();

// A default user
const USER = new User({ id: 'test', name: 'Test', sa: true, permissions: [] });

// A default environment
const ENVNAME = 'test';

NPM.wait(NPMINSTALL, function() {

	// Access to the DB
	// require('querybuilderpg').init('', 'postgresql://user:pass@localhost:5432/database');

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

	Test.run();
});
