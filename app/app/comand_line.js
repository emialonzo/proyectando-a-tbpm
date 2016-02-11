#!/usr/bin/env node
var fs = require('fs');
var program = require('commander');

program
.arguments('<file>')
.option('-d, --dot', 'Generar Dot')
.option('-i, --img', 'Generar Imagen')
.action(function(file) {
  console.log('user: %s pass: %s file: %s',
      program.username, program.password, file);
})
.parse(process.argv);

if (program.dot) console.log("->" + program.dot);

//
// fs.writeFile(file, 'Hello World!', function (err) {
//   if (err) return console.log(err);
// });

// console.log('Hello, world!');
