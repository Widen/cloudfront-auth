define get_required_consts
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
	@echo "const PRIVATE_KEY = \`" >> $@
	@cat id_rsa >> $@
	@echo "\`;" >> $@
	@echo "const PUBLIC_KEY = \`" >> $@
	@cat id_rsa.pub >> $@
	@echo "\`;" >> $@
endef

define export_required_consts
	@echo "exports.CLIENT_ID = CLIENT_ID;" >> $@
	@echo "exports.CLIENT_SECRET = CLIENT_SECRET;" >> $@
	@echo "exports.CALLBACK_PATH = CALLBACK_PATH;" >> $@
	@echo "exports.HOSTED_DOMAIN = HOSTED_DOMAIN;" >> $@
	@echo "exports.TOKEN_AGE = TOKEN_AGE;" >> $@
	@echo "exports.PRIVATE_KEY = PRIVATE_KEY;" >> $@
	@echo "exports.PUBLIC_KEY = PUBLIC_KEY;" >> $@
endef

all: config.js auth.js index.js package.json
	@npm -q install
ifneq (,$(wildcard google-authz.json))
	@zip -q cloudfront-google-auth.zip config.js index.js package-lock.json package.json auth.js google-authz.json -r node_modules
else
	@zip -q cloudfront-google-auth.zip config.js index.js package-lock.json package.json auth.js -r node_modules
endif
config.js: id_rsa.pub id_rsa
		@touch config.js
		@# Get unconditionally required consts
		$(call get_required_consts)
		@rm -f auth.js
ifneq (,$(wildcard google-authz.json))
		@read -p "Enter user email with permissions to access the Admin APIs: " USER_EMAIL;\
		echo "const USER_EMAIL = '$$USER_EMAIL';" >> $@
		@echo "" >> $@
		@echo "exports.USER_EMAIL = USER_EMAIL;" >> $@
		cp authz/google-groups-lookup.js auth.js
else
		@read -p "Enter email lookup URL(leave blank to skip): " EMAIL_LOOKUP_URL; \
		if [ "$$EMAIL_LOOKUP_URL" == "" ]; \
		then \
		cp authz/hosted-domain.js auth.js; \
		else \
		cp authz/http-email-lookup.js auth.js; \
		fi
		@echo "const EMAIL_LOOKUP_URL = '$$EMAIL_LOOKUP_URL';" >> $@
		@echo "" >> $@
		@echo "exports.EMAIL_LOOKUP_URL = EMAIL_LOOKUP_URL;" >> $@
endif

		@# Export unconditionally required consts
		$(call export_required_consts)
id_rsa.pub: id_rsa
	openssl rsa -in id_rsa -pubout -outform PEM -out id_rsa.pub
id_rsa:
	ssh-keygen -t rsa -b 4096 -f id_rsa -N ''
auth.js:
	$(error No $@ found.)
index.js:
	$(error No $@ found.)
package.json:
	$(error No $@ found.)
