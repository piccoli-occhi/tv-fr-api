# tv-fr-api

Provides api for [XML-TV-Fr](https://github.com/racacax/XML-TV-Fr).

## Endpoints

Projets provides docs with [swagger](https://tv-api.miceli.click/api/docs).

You can test endpoints on [https://tv-api.miceli.click](https://tv-api.miceli.click) (with rate-limit).

Api endpoints : 

- `/api/channels`
- `/api/channels/:id`
- `/api/program/:id`
- `/api/programs/now`
- `/api/programs/:day`

## Project setup

For easy command you can use [Just](https://github.com/casey/just).

```bash
# just install
npm install
npx lefthook install
```

## Compile and run the project

```bash
# development
$ npm run start # just start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# just tests
npm run test
npm run test:e2e
```

