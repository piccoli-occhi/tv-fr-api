set dotenv-load
set quiet

install:
    npm install
    npx lefthook install

start:
    docker compose -f docker-compose.dev.yml up -d
    sleep 2
    open "http://localhost:3000/api/status"

stop:
    docker compose stop

tests:
    npm run test
    npm run test:e2e

biome:
    npx biome check --write --unsafe

clean_db:
    docker exec -it tv-api-db psql -U tvfr -d tvfr -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

run_cron:
    curl -X GET "http://localhost:3000/api/xml-tv/run" \
        -H "x-internal-cron: tv-api"

init:
    curl -X GET "http://localhost:3000/api/tmdb/init" \
        -H "x-internal-cron: tv-api"

sync title="":
    if [ -n "{{title}}" ]; then \
        curl -G "http://localhost:3000/api/tmdb/sync" \
            -H "x-internal-cron: tv-api" \
            --data-urlencode "title={{title}}"; \
    else \
        curl -X GET "http://localhost:3000/api/tmdb/sync" \
            -H "x-internal-cron: tv-api"; \
    fi

sear title="":
    if [ -n "{{title}}" ]; then \
        curl -G "http://localhost:3000/api/searxng/sync" \
            -H "x-internal-cron: tv-api" \
            --data-urlencode "title={{title}}"; \
    else \
        curl -X GET "http://localhost:3000/api/searxng/sync" \
            -H "x-internal-cron: tv-api"; \
    fi

do title="":
    just sync "{{title}}"
    just sear "{{title}}"
    
fx endpoint="/api/status":
    curl "http://localhost:3000{{endpoint}}" | fx

adminer:
    open "http://localhost:8080/?pgsql=${DATABASE_HOST:-tv-api-db}&username=${DATABASE_USER:-tvfr}&db=${DATABASE_NAME:-tvfr}"
