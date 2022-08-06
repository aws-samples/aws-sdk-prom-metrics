config ?= testing.yaml
export config

.PHONY: build
build: clean
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Compiling JS from TypeScript @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	npm run build

.PHONY: docker
docker: validate
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Creating Docker Image @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	docker build -t aws-sdk-prom-metrics:latest -f executor/Dockerfile .

.PHONY: validate
validate: prepareEnv
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Validating Models and Schemas will Function @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	npm run validate

.PHONY: prepareEnv
prepareEnv: build
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Detecting and Installing Required Libraries @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	npm run prepareEnv

.PHONY: runLocal
runLocal: validate
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Running the node.js server locally.  Connect on http://localhost:4000/metrics @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	node build/executor/lib/index.js

.PHONY: deployRole
deployRole:
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Using the CDK to deploy the IRSA IAM Role @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	cdk deploy --require-approval=never

.PHONY: destroyRole
destroyRole:
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Using the CDK to destroy the IRSA IAM Role @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	cdk destroy

.PHONY: deployEks
deployEks: build
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Using the kubectl API to deploy the namespace and metric-gather deployment @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	npm run deployEks

.PHONY: clean
clean:
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	@echo "@@@ Cleaning out the build directory @@@"
	@echo "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@"
	rm -rf build/
	rm -rf cdk.out/