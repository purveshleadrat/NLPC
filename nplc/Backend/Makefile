IMAGE_NAME := product-memory
CONTAINER_NAME := product-memory

.PHONY: infra-up infra-down infra-restart infra-logs build

build:
	docker build -t $(IMAGE_NAME) .

infra-up: build
	docker run -d --name $(CONTAINER_NAME) --env-file .env -p 4000:4000 $(IMAGE_NAME)

infra-down:
	-docker stop $(CONTAINER_NAME)
	-docker rm $(CONTAINER_NAME)

infra-restart: infra-down infra-up

infra-logs:
	docker logs -f $(CONTAINER_NAME)
