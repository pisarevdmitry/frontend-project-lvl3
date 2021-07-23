install:
	npm ci
publish:
	npm publish --dry-run
lint:
	npx eslint .
start-dev:
	npx webpack serve
build: 
	NODE_ENV=production npx webpack
tests:
	npm test	
tests-coverage:	
	npm test -- --coverage --coverageProvider=v8		