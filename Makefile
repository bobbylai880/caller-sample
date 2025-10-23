.PHONY: infra-up infra-down backend-dev generate

infra-up:
	docker compose -f infra/docker-compose.yml up -d

infra-down:
	docker compose -f infra/docker-compose.yml down

backend-dev:
	npm install
	npm run dev

generate:
	npm run generate
