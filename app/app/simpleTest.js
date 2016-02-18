var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var _ = require("underscore");
var prettyjson = require('prettyjson');
var intermedio = require('./modeloIntermedio');
var pd = require('pretty-data').pd;

var x2js = require('x2js'); //new X2JS();
var conv = new x2js();
// conv.json2xml_str(json);

var textosPruebas = [
/*
  "el cocinero cocina pedido. " +
  "el mozo entraga el pedido. " +
  "el cliente come la comida. " +
  "el mozo cobra al cliente.  " +
  "el cliente paga."

"el administrador entrega tareas a ventas. " +
"al mismo tiempo, " +
"1 el administrador presenta informe de tareas a direccion. " +
"2 el vendedor toma tareas. "
*/

"el cocinero cocina pedido. " +
"si se cumple, " +
"condicionA entonces el mozo trabaja. " +
"si no el cocinero se rasca."

/*
,

"el administrador lista tareas pendientes. " +
"el administrador entrega tareas a ventas. " +
"al mismo tiempo, " +
"1 el administrador presenta informe de tareas a direccion. " +
"2 el vendedor toma tareas. " +
"3 la direccion toma notas. " +
"si se cumple, " +
"condicionA entonces el juan trabaja. " +
"condicionB entonces el pepe baila la cumparcita. " +
"condicionC entonces el vendedor baila la cumparcita. " +
"si no el tio canta." +
"el tronco baila algo nuevo."
*/
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
  return _.map(listaTexttos, function(texto){ return parser.parse(texto);})
};

function makeAllBpmn(listaModelos){
  return _.map(listaModelos, function(modelo){ return makeBpmn.makeBpmn(modelo);})
};

function makeAllNivel(lista){
  return _.map(lista, function(elem){ return makeBpmn.procesar(elem);})
};

//textosPruebas.shift();
//console.log(textosPruebas);
//parser.init();
// _.map(            parseAllText(textosPruebas) , function(elem){ console.log(prettyjson.render(elem, options)); })
//_.map(makeAllBpmn(parseAllText(textosPruebas)), function(elem){ console.log(prettyjson.render(elem, options)); })
//_.map(makeAllBpmn(parseAllText(textosPruebas)), function(elem){ console.log(prettyjson.render(elem, options)); })
//_.map(makeAllNivel(parseAllText(textosPruebas)), function(elem){ console.log(prettyjson.render(elem, options)); })

parser.init(__dirname + '/gramatica.pegjs');
var modelo = parseAllText(textosPruebas)[0];
//console.log(modelo);
makeBpmn.start();
modelo = intermedio.asignarIdCondicion(modelo);


//console.log("######################### MODELO ##################################");
//console.log(makeBpmn.proceso);
//_.map(modelo, function(elem){ console.log(prettyjson.render(elem, options)); })
//console.log("######################### PROCESO ##################################");
_.map(modelo, function(elem){ makeBpmn.obtenerLanes(elem); })
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })
_.map(modelo, function(elem){ makeBpmn.obtenerTareas(elem); })
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })
//_.map(makeBpmn.proceso, function(elem){ console.log(elem); })

//console.log("########################### FLUJOS ################################");

var j=0;
for (var i=0 ; i<modelo.length-1 ; i++) {
  makeBpmn.generarFlujo(modelo[j], modelo[++j]);
}

makeBpmn.conectarStartEvent(modelo);
makeBpmn.conectarEndEvent(modelo);

_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })
console.info(pd.xml(conv.json2xml_str(makeBpmn.proceso)));
