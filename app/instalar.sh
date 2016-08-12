#!/bin/sh

if [ ! -e "app/env.js" ]; then
  cp app/env.js-template app/env.js
fi
if [ ! -d "app/XMLbasicos" ]; then
  mkdir app/XMLbasicos
fi
if [ ! -d "app/XMLejecutables" ]; then
  mkdir app/XMLejecutables
fi
