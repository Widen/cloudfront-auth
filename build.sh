#!/usr/bin/env bash
set -euo pipefail

if [ ! -d "distributions" ]; then
  if [ ! -L "distributions" ]; then
    mkdir distributions
  fi
fi

npm run-script build-ci "$@"
