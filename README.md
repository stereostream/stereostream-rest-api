stereostream-rest-api
=====================

StereoStream REST API.

## Install prerequisites

### Node

  0. node & npm (tested with node v8)
  1. Run: `npm install -g typings typescript bunyan`
  2. `cd` to directory you've cloned this repo into
  3. Run: `typings install`
  4. Run: `npm install`

### External

  - Database, e.g.: Postgres. Set `RDBMS_URI` env var accordingly.
  - Redis. Set `REDIS_URL` env var accordingly; otherwise defaults are used.

## Compile+run app

    tsc
    node main.js

## Misc

### Cleanup compiled output

When not add *.js to `.gitignore`, clean out compiled js with this GNU findutils solution:

    find -name '*.js.map' -type f -exec bash -c 'rm "${1}" "${1%????}"' bash {} \;

Or delete all '*.js' outside of `node_modules` with:

    find \( -name node_modules -prune \) -o -name '*.js' -type f -exec rm {} \;find \( -name node_modules -prune \) -o -name '*.js' -type f -exec rm {} \;

More complicated solution handling "foo.ts" & "foo.js" without "foo.js.map" coming at some point.
