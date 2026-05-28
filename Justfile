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
    npm run biome

clean_db:
    docker exec -it tv-fr-postgres psql -U tvfr -d tvfr -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
