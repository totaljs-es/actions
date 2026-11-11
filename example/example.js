NEWACTION('Example', {
	name: 'Example',
	summary: 'Summarization of this action',
	input: '*name:String, age:Number',
	output: 'success:Boolean, value:String',
	config: {},
	// route: true,
	// user: true,
	// mcp: true,
	// permissions: 'admin',
	// timeout: 60 * 1000,
	action: function($, model) {

		// $ {Object} an action instance
		// @model {Object} payload

		// if ($.env === 'test') {}

		model.id = UID();

		// $.config {Object} a custom configuration (default: empty object)
		// $.env {String} an environment defined in .env() method (default: empty)
		// $.query {Object} a parsed URL query arguments (default: empty object)
		// $.payload {Object} a payload (default: empty object)
		// $.controller {Object} a Total.js controller (default: null)
		// $.user {Object} an user object (default: null)
		// $.ip {String} an IP address (default: empty)
		// $.ua {String} a parsed user-agent (default: empty)
		// $.language {String} a language (default: empty)

		// $.invalid(error);
		// $.callback(response);
		// $.success(value);

		$.success(model.id);
	}
});