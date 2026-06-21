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

restart:
    docker compose -f docker-compose.dev.yml restart

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
    echo ""
    just sear "{{title}}"
    
fx endpoint="/api/status":
    curl "http://localhost:3000{{endpoint}}" | fx

adminer:
    open "http://localhost:8080/?pgsql=${DATABASE_HOST:-tv-api-db}&username=${DATABASE_USER:-tvfr}&db=${DATABASE_NAME:-tvfr}"

sdk-js version:
    docker run --rm \
        -v ${PWD}:/local \
        openapitools/openapi-generator-cli generate \
        -i /local/openapi.json \
        -g typescript-fetch \
        -o /local/sdk/js \
        -t /local/.openapi-templates/typescript-fetch \
        --git-host github.com --git-user-id piccoli-occhi --git-repo-id tv-fr-api \
        --additional-properties npmName=@amiceli/tv-fr-api,npmVersion={{version}},supportsES6=true
    sed -i '' 's/"description": ".*"/"description": "Lib to use the tv-fr API based on xml-tv-fr"/' sdk/js/package.json
    sed -i '' 's/"author": ".*"/"author": "amiceli"/' sdk/js/package.json

sdk-php version:
    docker run --rm \
        -v ${PWD}:/local \
        openapitools/openapi-generator-cli generate \
        -i /local/openapi.json \
        -g php \
        -o /local/sdk/php \
        -t /local/.openapi-templates/php \
        --git-host github.com --git-user-id piccoli-occhi --git-repo-id tv-fr-api-php \
        --additional-properties invokerPackage=PiccoliOcchi\\TvFrApi,composerPackageName=piccoli-occhi/tv-fr-api-php,packageVersion={{version}}
    sed -i '' 's/"description": ".*"/"description": "Lib to use the tv-fr API based on xml-tv-fr"/' sdk/php/composer.json
    sed -i '' 's/"name": "OpenAPI"/"name": "amiceli"/' sdk/php/composer.json
    sed -i '' 's#"homepage": "https://openapi-generator.tech"#"homepage": "https://github.com/piccoli-occhi/tv-fr-api-php"#' sdk/php/composer.json

publish-js version:
    just sdk-js {{version}}
    cd sdk/js && npm publish
    sed -i '' 's/"js": ".*"/"js": "{{version}}"/' versions.json

publish-php version:
    just sdk-php {{version}}
    cd sdk/php && bash git_push.sh piccoli-occhi tv-fr-api-php "Release {{version}}"
    cd sdk/php && git tag {{version}} && git push origin {{version}}
    sed -i '' 's/"php": ".*"/"php": "{{version}}"/' versions.json

publish-js-beta version:
    just sdk-js {{version}}
    cd sdk/js && npm publish --tag beta
    sed -i '' 's/"js_beta": ".*"/"js_beta": "{{version}}"/' versions.json

publish-php-beta version:
    just sdk-php {{version}}
    cd sdk/php && bash git_push.sh piccoli-occhi tv-fr-api-php "Beta release {{version}}"
    cd sdk/php && git tag {{version}} && git push origin {{version}}
    sed -i '' 's/"php_beta": ".*"/"php_beta": "{{version}}"/' versions.json
