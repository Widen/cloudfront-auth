all: build/id_rsa.pub
	cd build; npm install
	npm install
	npm run-script build
build/id_rsa.pub: build/id_rsa
	openssl rsa -in build/id_rsa -pubout -outform PEM -out build/id_rsa.pub
build/id_rsa:
	ssh-keygen -t rsa -b 4096 -f build/id_rsa -N ''
