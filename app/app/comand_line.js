#!/usr/bin/env node
var fs = require('fs');
var program = require('commander');

program
.arguments('<file>')
.option('-d, --dot <dot>', 'Generar Dot')
.option('-i, --img', 'Generar Imagen')
.action(function(file) {
  console.log('user: %s pass: %s file: %s',
      program.dot, program.password, file);
})
.parse(process.argv);

if (program.dot) console.log("dot->" + program.dot);
if (program.img) console.log("img->" + program.img);

//
// fs.writeFile(file, 'Hello World!', function (err) {
//   if (err) return console.log(err);
// });

// console.log('Hello, world!');
