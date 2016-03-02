var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var _ = require("underscore");
var prettyjson = require('prettyjson');
var pd = require('pretty-data').pd;
var intermedio = require('./modeloIntermedio');
var procesamientoModelo = require('./procesamientoModelo');

var x2js = require('x2js'); //new X2JS();
var conv = new x2js();

var textosPruebas = [

  "el A X. " +
  "la A Y. " +
  "la B Z. " +
  "alternativa de X, si transcurre 20 segundos la A L. la A M. la A N. fin " +
  "al mismo tiempo, " +
  "1 la A I. la A II. la A III. " +
  "2 la A J.  " +
  "si se cumple, " +
  "condi  entonces la A K. la A KK. " +
  "condii entonces el A L. " +
  "condiii entonces la A T. " +
  "si no la A U. la A UU. " +
  "fin " +
  "la A JJ. " +
  "fin "

/*
"a la vez, " +
"1 el cocinero cocina pedido. el mozo lleva el pedido." +
"2 el mozo lleva la bebida. " +
"fin " +
"el mozo toma el pedido. " +
"el cliente come."
*/

/*
"el cliente entra al restoran. " +
"mientras noHayaLugar, el cliente baila."

"el cliente entra al restoran. " +
"si se cumple, " +
"realizoReserva entonces el mozo lleva el cliente a su mesa. " +
"si no el cliente espera que haya lugar. " +
"fin " +
"el mozo toma el pedido. " +
"a la vez, " +
"1 el cocinero cocina pedido. " +
"2 el mozo lleva la bebida. " +
"fin " +
"el cliente come la comida. " +
"el cliente pide la cuenta. " +
"el mozo trae la cuenta. " +
"si se cumple, " +
"buenaAtencion entonces el cliente paga y deja propina." +
"si no el cliente paga. " +
"fin "
*/
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

//parser.init(__dirname + '/gramatica2.pegjs');
//var modelo = parseAllText(textosPruebas)[0];
//console.log("######################### MODELO ##################################");
//console.log(modelo);
//_.map(modelo, function(elem){ console.log(prettyjson.render(elem, options)); })

//console.log("######################### MODELO CON IDs ##################################");
//modelo = intermedio.asignarIdCondicion(modelo.sentencia);
//_.map(modelo, function(elem){ console.log(prettyjson.render(elem, options)); })

//console.log("######################### PROCESO ##################################");
//makeBpmn.start();
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })

//console.log("######################### OBTENER LANES ##################################");
//_.map(modelo, function(elem){ makeBpmn.obtenerLanes(elem); })
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })

//console.log("######################### OBTENER TAREAS Y EVENTOS ##################################");
//_.map(modelo, function(elem){ makeBpmn.obtenerTareas(elem); })
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })

//console.log("######################### OBTENER FLUJOS ##################################");
//var j=0;
//for (var i=0 ; i<modelo.length-1 ; i++) {
//  makeBpmn.generarFlujo(modelo[j], modelo[++j]);
//}
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })

//console.log("######################### CONECTAR START EVENT ##################################");
//makeBpmn.conectarStartEvent(modelo);
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })

//console.log("######################### CONECTAR END EVENT ##################################");
//makeBpmn.conectarEndEvent(modelo);
//_.map(makeBpmn.proceso, function(elem){ console.log(prettyjson.render(elem, options)); })


//console.log("######################### XML GENERADO ##################################");
//console.log(pd.xml(conv.json2xml_str(makeBpmn.proceso)));
var modelo = procesamientoModelo.textToModel(textosPruebas[0]);
modelo = intermedio.procesarModelo(modelo);
procesamientoModelo.modelToXML(modelo.sentencia);
