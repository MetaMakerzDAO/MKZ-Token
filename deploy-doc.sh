#!/usr/bin/env sh

# abort on errors
set -e

# build
npm run compile

# navigate into the build output directory
cd docs
git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:vachmara/sparkso-token.git main:gh-pages

cd -
