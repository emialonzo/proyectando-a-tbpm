#!/bin/sh

npm install
./node_modules/bower/bin/bower install
if [ ! -e "app/env.js" ]; then
  cp app/env.js-template app/env.js
fi
if [ ! -d "app/XMLbasicos" ]; then
  mkdir app/XMLbasicos
fi
if [ ! -d "app/XMLejecutables" ]; then
  mkdir app/XMLejecutables
fi
if [ ! -d "app/XMLestandar" ]; then
  mkdir app/XMLestandar
fi
if [ ! -d "app/ejemplosRepositorio" ]; then
  mkdir app/ejemplosRepositorio
fi
if [ ! -d "$dirname" ]; then
  sh downloadYaoqiang.sh
fi
