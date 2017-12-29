all: config.js index.js package.json
	npm install
	zip cloudfront-google-auth.zip config.js index.js package-lock.json package.json -r node_modules
config.js:
	touch config.js
	@read -p "Enter client id: " CLIENT_ID; \
	echo "const CLIENT_ID = '$$CLIENT_ID';" >> $@
	@read -p "Enter client secret: " CLIENT_SECRET; \
	echo "const CLIENT_SECRET = '$$CLIENT_SECRET';" >> $@
	@read -p "Enter redirect URI: " REDIRECT_URI; \
	echo "const REDIRECT_URI = '$$REDIRECT_URI';" >> $@
	@read -p "Enter hosted domain: " HOSTED_DOMAIN; \
	echo "const HOSTED_DOMAIN = '$$HOSTED_DOMAIN';" >> $@
	echo "" >> $@
	echo "exports.CLIENT_ID = CLIENT_ID;" >> $@
	echo "exports.CLIENT_SECRET = CLIENT_SECRET;" >> $@
	echo "exports.REDIRECT_URI = REDIRECT_URI;" >> $@
	echo "exports.HOSTED_DOMAIN = HOSTED_DOMAIN;" >> $@
index.js:
	$(error No $@ found.)
package.json:
	$(error No $@ found.)
