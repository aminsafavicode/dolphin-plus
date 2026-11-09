.PHONY: help up down restart logs ps test migrate createsuperuser clean

help:
	@echo "Dolphin Flow Development Commands:"
	@echo "  make up               - Build and start all services in background"
	@echo "  make down             - Stop all services"
	@echo "  make restart          - Restart web and worker containers"
	@echo "  make logs             - View live output logs from all services"
	@echo "  make ps               - View status of all running containers"
	@echo "  make test             - Execute all backend unit and integration tests"
	@echo "  make migrate          - Run database migrations manually"
	@echo "  make createsuperuser  - Create an administrative user interactively"
	@echo "  make clean            - Remove all container volumes and caches"

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart web celery_worker celery_beat

logs:
	docker compose logs -f

ps:
	docker compose ps

test:
	docker compose exec web python manage.py test --noinput

migrate:
	docker compose exec web python manage.py migrate

createsuperuser:
	docker compose exec -it web python manage.py createsuperuser

clean:
	docker compose down -v
