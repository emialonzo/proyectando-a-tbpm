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

"el administrador de tareas, ejecuta el subproceso evaluar opciones."

//// define las expresiones al final del texto
//"si se cumple, " +
//"servicioEsX entonces el asistente ofrece serivicio X. " +
//"servicioEsY entonces el asistente ofrece serivicio Y. " +
//"si no el asistente ofrece servicio generico. " +
//"fin " +
//"La expresion de la condicion servicioEsX, es tipoServicio == X. " +
//"La expresion de la condicion servicioEsY, es tipoServicio == Y."

//// define los formularios al final del texto
//"si se cumple, " +
//"servicioEsX entonces el asistenteDeServicios tareaX. " +
//"si no el asistenteDeServicios tareaY. " +
//"fin " +
//"tareaX " +
//"es un formulario con los siguientes campos: " +
//"nombre que es un texto obligatorio, " +
//"apellido que es un texto obligatorio, " +
//"edad que es un numero. " +
//"tareaY " +
//"es un formulario con los siguientes campos: " +
//"titulo que es un texto obligatorio, " +
//"ejemplar que es un texto obligatorio."

//// define formularios junto a las tareas
//"el usuario hace A. hace A, es un formulario con los siguientes campos: " +
//"nombre que es un texto obligatorio, " +
//"apellido que es un texto obligatorio, " +
//"edad que es un numero. " +
//"el usuario hace B. hace B, es un formulario con los siguientes campos: " +
//"nombre que es un texto, " +
//"apellido que es un texto obligatorio, " +
//"cantidad que es un numero."

//"la Usuario realiza tarea X. realiza tarea X, es un formulario con los siguientes campos: " +
//"nombre que es un texto obligatorio, " +
//"edad que es un numero. " +
//"la Usuario realiza tarea Y. realiza tarea Y, es un formulario con los siguientes campos:  " +
//"titulo que es un texto obligatorio, " +
//"version que es un numero. " +
//"la Usuario realizaTareaZ. " +
//"alternativa de realiza tarea X, si transcurre 20 segundos la Usuario realiza tarea L. fin " +
//"al mismo tiempo, " +
//"1 la Usuario realiza tarea I. la Usuario realiza tarea II. " +
//"2 la Usuario realiza tarea J. " +
//"si se cumple, " +
//"condi entonces la Usuario realiza tarea K. la Usuario realiza tarea KK. " +
//"condii entonces el Usuario realiza tarea L. " +
//"si no la Usuario realiza tarea U. la Usuario realiza tarea UU. " +
//"fin " +
//"la Usuario realiza tarea JJ. " +
//"fin " +
////"tareaY " +
////"es un formulario con los siguientes campos: " +
////"titulo que es un texto obligatorio, " +
////"ejemplar que es un texto obligatorio."
//"La expresion de la condicion condi, es variable == valori. " +
//"La expresion de la condicion condii, es variable == valorii. "

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
procesamientoModelo.modelToXML(modelo);
