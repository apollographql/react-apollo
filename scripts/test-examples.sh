#!/usr/bin/env bash

EXAMPLES_DIR=$(dirname $0)/../examples

cd $EXAMPLES_DIR/base
npm install
npm test

cd $EXAMPLES_DIR/components
npm install
npm test
