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

tmdb_init:
    curl -X GET "http://localhost:3000/api/tmdb/init" \
        -H "x-internal-cron: tv-api"

tmdb_sync title="":
    if [ -n "{{title}}" ]; then \
        curl -G "http://localhost:3000/api/tmdb/sync" \
            -H "x-internal-cron: tv-api" \
            --data-urlencode "title={{title}}"; \
    else \
        curl -X GET "http://localhost:3000/api/tmdb/sync" \
            -H "x-internal-cron: tv-api"; \
    fi
