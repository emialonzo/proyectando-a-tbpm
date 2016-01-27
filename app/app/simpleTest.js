var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var _ = require("underscore");
var prettyjson = require('prettyjson');




var textosPruebas = [
"el cocinero cocina pedido. " +
"al mismo tiempo, 1 el mozo sirve pedido. 3 la hermana es servida en la mesa. " +
"si se cumple, hayTrabajo entonces el juan trabaja. si no el tio carlos canta. " +
"si se cumple, hayTrabajo entonces el juan trabaja. otraCondicion entonces el pepe baila la cumparcita. si no el tio carlos canta. " +
"el administrador baila la gracamiglia.",

"el administrador lista tareas pendientes. " +
"el administrador entrega tareas a ventas. " +
"al mismo tiempo, 1 el administrador presenta informe de tareas a direccion. 2 el vendedor toma tareas. 3 el vendedor toma tareas. " +
"si se cumple, hayTrabajo entonces el juan trabaja. otraCondicion entonces el pepe baila la cumparcita. otraCondicionXXX entonces el pepe baila la cumparcita. si no el tio carlos canta."

]

// var options = {
//   noColor: true
// };
var options = {
  keysColor: 'blue',
  dashColor: 'white',
  stringColor: 'green'
};

function parseAllText(listaTexttos){
  // return _.map(listaTexttos, function(elem){ return prettyjson.render(parser.parse(elem), options);})
  return _.map(listaTexttos, function(elem){ return parser.parse(elem);})
};

function makeAllBpmn(lista){
  return _.map(lista, function(elem){ return makeBpmn.makeBpmn(elem);})
};

function makeAllNivel(lista){
  return _.map(lista, function(elem){ return makeBpmn.procesar(elem);})
};



textosPruebas.shift();
console.log(textosPruebas);
parser.init();
_.map(parseAllText(textosPruebas), function(elem){ console.log(prettyjson.render(elem, options)); })
_.map(makeAllBpmn(parseAllText(textosPruebas)), function(elem){ console.log(prettyjson.render(elem, options)); })
_.map(makeAllBpmn(parseAllText(textosPruebas)), function(elem){ console.log(prettyjson.render(elem, options)); })
_.map(makeAllNivel(parseAllText(textosPruebas)), function(elem){ console.log(prettyjson.render(elem, options)); })
