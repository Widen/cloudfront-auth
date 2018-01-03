all: config.js index.js package.json
	npm install
	zip cloudfront-google-auth.zip config.js index.js package-lock.json package.json -r node_modules
config.js: id_rsa.pub id_rsa
	touch config.js
	@read -p "Enter client id: " CLIENT_ID; \
	echo "const CLIENT_ID = '$$CLIENT_ID';" >> $@
	@read -p "Enter client secret: " CLIENT_SECRET; \
	echo "const CLIENT_SECRET = '$$CLIENT_SECRET';" >> $@
	@read -p "Enter callback path: " CALLBACK_PATH; \
	echo "const CALLBACK_PATH = '$$CALLBACK_PATH';" >> $@
	@read -p "Enter hosted domain: " HOSTED_DOMAIN; \
	echo "const HOSTED_DOMAIN = '$$HOSTED_DOMAIN';" >> $@
	@read -p "Enter the age of token(seconds): " TOKEN_AGE; \
	echo "const TOKEN_AGE = $$TOKEN_AGE;" >> $@
	echo "const PRIVATE_KEY = \`" >> $@
	cat id_rsa >> $@
	echo "\`;" >> $@
	echo "const PUBLIC_KEY = \`" >> $@
	cat id_rsa.pub >> $@
	echo "\`;" >> $@
	echo "" >> $@
	echo "exports.CLIENT_ID = CLIENT_ID;" >> $@
	echo "exports.CLIENT_SECRET = CLIENT_SECRET;" >> $@
	echo "exports.CALLBACK_PATH = CALLBACK_PATH;" >> $@
	echo "exports.HOSTED_DOMAIN = HOSTED_DOMAIN;" >> $@
	echo "exports.TOKEN_AGE = TOKEN_AGE;" >> $@
	echo "exports.PRIVATE_KEY = PRIVATE_KEY;" >> $@
	echo "exports.PUBLIC_KEY = PUBLIC_KEY;" >> $@
id_rsa.pub: id_rsa
	openssl rsa -in id_rsa -pubout -outform PEM -out id_rsa.pub
id_rsa:
	ssh-keygen -t rsa -b 4096 -f id_rsa -N ''
index.js:
	$(error No $@ found.)
package.json:
	$(error No $@ found.)
