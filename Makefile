install:
	npm ci
publish:
	npm publish --dry-run
lint:
	npx eslint .
start-dev:
	npx webpack serve
build: 
	npx webpack 