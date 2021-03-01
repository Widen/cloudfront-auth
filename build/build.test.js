/*
 * Currently prompt.get() on module level blocks on load of build.js.
 * Do something like following if running test in a non-interactive environment:
 * $ echo \0 | npm test
*/

const rewire = require('rewire');
const build = rewire('./build.js');

const prepareOverrides = build.__get__('prepareOverrides')

const testCases = [
	// Simple case with everything prompted
	{
		'argv': [],
		'env': {},
		'expectedOverrides': {}
	},
	// All parameters from env, distribution name and auth method prompted
	{
		'argv': [],
		'env': {
			'TENANT': 'tenant-env',
			'CLIENT_ID': 'client_id-env',
			'CLIENT_SECRET': 'client_secret-env',
			'REDIRECT_URI': 'redirect_uri-env',
			'SESSION_DURATION': 'session_duration-env',
			'AUTHZ': 'authz-env',
			'JSON_USERNAME_LOOKUP': 'json_username_lookup-env',
			'HD': 'hd-env',
			'JSON_EMAIL_LOOKUP': 'json_email_lookup-env',
			'MOVE': 'move-env',
			'SERVICE_ACCOUNT_EMAIL': 'service_account_email-env',
			'PKCE_CODE_VERIFIER_LENGTH': 'pkce_code_verifier_length-env',
			'ORGANIZATION': 'organization-env',
			'BASE_URL': 'base_url-env'
		},
		'expectedOverrides': {
			'TENANT': 'tenant-env',
			'CLIENT_ID': 'client_id-env',
			'CLIENT_SECRET': 'client_secret-env',
			'REDIRECT_URI': 'redirect_uri-env',
			'SESSION_DURATION': 'session_duration-env',
			'AUTHZ': 'authz-env',
			'JSON_USERNAME_LOOKUP': 'json_username_lookup-env',
			'HD': 'hd-env',
			'AUTHZ': 'authz-env',
			'JSON_EMAIL_LOOKUP': 'json_email_lookup-env',
			'MOVE': 'move-env',
			'SERVICE_ACCOUNT_EMAIL': 'service_account_email-env',
			'PKCE_CODE_VERIFIER_LENGTH': 'pkce_code_verifier_length-env',
			'ORGANIZATION': 'organization-env',
			'BASE_URL': 'base_url-env'
		}
	},
	// All parameters from args
	{
		'argv': [
			'foo', 'bar',
			'--method=method-arg',
			'--distribution=distribution-arg',
			'--tenant=tenant-arg',
			'--client-id=client_id-arg',
			'--client-secret=client_secret-arg',
			'--redirect-uri=redirect_uri-arg',
			'--session-duration=session_duration-arg',
			'--json-username-lookup=json_username_lookup-arg',
			'--hd=hd-arg',
			'--authz=authz-arg',
			'--json-email-lookup=json_email_lookup-arg',
			'--move=move-arg',
			'--service-account-email=service_account_email-arg',
			'--pkce-code-verifier-length=pkce_code_verifier_length-arg',
			'--organization=organization-arg',
			'--base-url=base_url-arg'
		],
		'env': {},
		'expectedOverrides': {
			'method': 'method-arg',
			'distribution': 'distribution-arg',
			'TENANT': 'tenant-arg',
			'CLIENT_ID': 'client_id-arg',
			'CLIENT_SECRET': 'client_secret-arg',
			'REDIRECT_URI': 'redirect_uri-arg',
			'SESSION_DURATION': 'session_duration-arg',
			'AUTHZ': 'authz-arg',
			'JSON_USERNAME_LOOKUP': 'json_username_lookup-arg',
			'HD': 'hd-arg',
			'AUTHZ': 'authz-arg',
			'JSON_EMAIL_LOOKUP': 'json_email_lookup-arg',
			'MOVE': 'move-arg',
			'SERVICE_ACCOUNT_EMAIL': 'service_account_email-arg',
			'PKCE_CODE_VERIFIER_LENGTH': 'pkce_code_verifier_length-arg',
			'ORGANIZATION': 'organization-arg',
			'BASE_URL': 'base_url-arg'
		}
	},
	// Command line arguments have precedence
	{
		'argv': [
			'first', 'two',
			'--session-duration=session_duration-arg',
			'--json-email-lookup=json_email_lookup-arg',
		],
		'env': {
			'SESSION_DURATION': 'session_duration-env',
			'JSON_EMAIL_LOOKUP': 'json-email-lookup-env',
			'ORGANIZATION': 'organization-env'
		},
		'expectedOverrides': {
			'SESSION_DURATION': 'session_duration-arg',
			'JSON_EMAIL_LOOKUP': 'json_email_lookup-arg',
			'ORGANIZATION': 'organization-env'
		}
	}

]

const tableTest = (testCase, i) => test(`prepareOverrides test case #${i+1}`, () => {
	build.__set__('process', {
		env: testCase.env,
		argv: testCase.argv
	});
	expect(prepareOverrides()).toEqual(testCase.expectedOverrides);
});

testCases.map(tableTest);

