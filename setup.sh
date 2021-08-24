#!/bin/bash
ROOT=$(pwd)

cd "$ROOT/analyzer"; yarn; yarn build
cd "$ROOT/language-server"; yarn; yarn build
cd "$ROOT/vsc-extension"; yarn
