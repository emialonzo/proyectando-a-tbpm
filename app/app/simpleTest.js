var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var _ = require("underscore");
var prettyjson = require('prettyjson');
var pd = require('pretty-data').pd;
var intermedio = require('./modeloIntermedio');

var x2js = require('x2js'); //new X2JS();
var conv = new x2js();

var textosPruebas = [
/*
"el cliente entra al restoran. " +
"mientras noHayaLugar, el cliente baila."
*/
"el cliente entra al restoran. " +
"si se cumple, " +
"realizoReserva entonces el mozo lleva el cliente a su mesa. " +
"si no el cliente espera que haya lugar. " +
"el mozo toma el pedido. " +
"a la vez, " +
"1 el cocinero cocina pedido. " +
"2 el mozo lleva la bebida. " +
"el cliente come la comida. " +
"el cliente pide la cuenta. " +
"el mozo trae la cuenta. " +
"si se cumple, " +
"buenaAtencion entonces el cliente paga y deja propina." +
"si no el cliente paga."

]

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
makeBpmn.generarXML(modelo);

/*
//console.log("######################### MODELO ##################################");
//console.log(makeBpmn.proceso);
//console.log(modelo);
//_.map(modelo, function(elem){ console.log(prettyjson.render(elem, options)); })
//console.log("######################### PROCESO ##################################");
//_.map(modelo, function(elem){ makeBpmn.obtenerLanes(elem); })
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })
//_.map(modelo, function(elem){ makeBpmn.obtenerTareas(elem); })
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })
//_.map(makeBpmn.proceso, function(elem){ console.log(elem); })

//console.log("########################### FLUJOS ################################");

var j=0;
for (var i=0 ; i<modelo.length-1 ; i++) {
  makeBpmn.generarFlujo(modelo[j], modelo[++j]);
}

makeBpmn.conectarStartEvent(modelo);
makeBpmn.conectarEndEvent(modelo);

//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })
console.log(pd.xml(conv.json2xml_str(makeBpmn.proceso)));
*/
