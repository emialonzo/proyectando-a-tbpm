var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var _ = require("underscore");
var prettyjson = require('prettyjson');
var pd = require('pretty-data').pd;
var intermedio = require('./modeloIntermedio');
var procesamientoModelo = require('./procesamientoModelo');
var fs = require('fs');

var x2js = require('x2js'); //new X2JS();
var conv = new x2js();

var options = {
  keysColor: 'blue',
  dashColor: 'white',
  stringColor: 'green'
};

function parseAllText(listaTexttos){
  // return _.map(listaTexttos, function(elem){ return prettyjson.render(parser.parse(elem), options);})
  return _.map(listaTexttos, function(texto){ return parser.parse(texto);})
};

function makeAllBpmn(listaModelos){
  return _.map(listaModelos, function(modelo){ return makeBpmn.makeBpmn(modelo);})
};

function makeAllNivel(lista){
  return _.map(lista, function(elem){ return makeBpmn.procesar(elem);})
};

var path = __dirname + "/ejemplos/";;
var nombreArchivo = "servicioSimple";
var textosPruebas = fs.readFileSync(path + nombreArchivo).toString();

var modelo = procesamientoModelo.textToModel(textosPruebas);
modelo = intermedio.procesarModelo(modelo);
procesamientoModelo.modelToXML(modelo,nombreArchivo);
