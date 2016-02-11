//generar archivos dot de graphviz  partir de el modelo de datos
var fs = require("fs");
var _ = require("underscore");
var pd = require('pretty-data').pd;


var toDot = function(modelo){
  file = [];
  taskdot={};
  gwdot=[];
  flujodot=[];
  secuencias = {};

  // console.log(flujodot + flujodot.length);
  // console.log("Convertir a DOT");
  // console.log(modelo);

  dotRec(modelo, flujodot);
  // console.log("---> depurando" + flujodot.length);
  // console.log(taskdot);
  // console.log(gwdot);
  secuencias = ajustarSecuencia(modelo);
  console.error("---SECUENCIAS---");
  console.error(secuencias);
  console.error("------");

  flujodot = ajustarDot(flujodot, secuencias);
  // console.log(flujodot);
  console.log(" ************* Mostrando dot ************* ");
  printFile(flujodot);
  // console.log(file);
  return file.join("\n");
  // return file.join("\n");
}


//inserta dot con los flujos iniciales, y por cada flujo detectado, controla que la parte de la derecha del flujo no sea una secuenca
function ajustarDot(flujodot, secuencias){
  var flujito = [];
  flujito.push("S [label=\"\", shape=circle, width=\"0.3\"];");
  flujito.push("F [label=\"\", shape=circle, width=\"0.3\" , style=bold];");
  flujito.push("");
  var str = flujodot[0];
  var clave = str.substring(0, str.lastIndexOf("-"));
  flujito.push("S -> " + clave + " ;");

  for (var i = 0; i < flujodot.length; i++) {
    var str = flujodot[i];

    var clave = str.substring(str.lastIndexOf(">")+1, str.lastIndexOf(";")); //parte derecha
    // var clave = str.substring(0, str.lastIndexOf("-")); //parte de izquierda

    clave = clave.replace(/\s/g, '');
    console.info("La clave es " + clave);

    if(_.isUndefined(secuencias["" + clave])){
      console.info("NO SEC");
      flujito.push(str);
    }else{
      console.info("SEC");
      var mask = str.substring(0,str.lastIndexOf(">")+1); //parte derecha
      // var mask = str.substring(0,str.lastIndexOf(">")+1); //parte izquierda
      flujito.push(mask + secuencias[clave] + ";");
      // for (var j = 0; j < secuencias[clave].length; j++) {
      //   console.info("Pripitico " + mask + secuencias[clave][j]);
      // }
    }
  }
  return flujito;
}


var taskdot={};
var gwdot=[];
var  flujodot=[];


function dotRec(nodo, flujodot){
  //FIXME
  //no cuento nodos indefinidos, no deberia haberlos
  if(_.isUndefined(nodo)) {console.log("FIXME");return;}
  // console.log(">>>>><>>" + pd.json(nodo));
  if(nodo.tipo=="task") {
    //agrego tarea al lane
    if(_.isUndefined(taskdot[nodo.sentencia.actor])){
      taskdot[nodo.sentencia.actor] = [];
    }
    taskdot[nodo.sentencia.actor].push(dotTask(nodo));

    _.map(dotFlow(nodo), function(elem){flujodot.push(elem);});
  }
  else if(nodo.tipo=="secuencia"){
    _.map(_.compact(nodo.sentencia), function(elem){ dotRec(elem, flujodot);});
  }else if(nodo.tipo=="cierro"){
    //agrego shape para la compuerta
    gwdot.push(dotGw(nodo));

    //agrego flujo
    // flujo = _.union(flujo, dotFlow(nodo));
    _.map(dotFlow(nodo), function(elem){flujodot.push(elem);});
  }
  else if(isGateway(nodo.tipo)){
    //agrego shape
    gwdot.push(dotGw(nodo));
    //agrego flujo
    _.map(dotFlow(nodo), function(elem){flujodot.push(elem);});
    _.map(_.compact(nodo.sentencia), function(elem){ dotRec(elem, flujodot);});
  }
};

var file = [];
function printFile() {
  file.push("digraph G01 {");
  file.push("rankdir=LR; node [shape=box, style=rounded];");
  for (var key in taskdot) {
     var listaTareas = taskdot[key];
      file.push("subgraph cluster" + key + " { rankdir=LR;")
      file.push("labeljust=l;");
      file.push("label=\"Lane:" + key  + "\";");
     for (var prop in listaTareas) {
       file.push(listaTareas[prop]);
        // console.log(prop + " = " );
     }
     file.push("");
     file.push("}");
     file.push("");
  }
  _.map(gwdot, function(elem){file.push(elem);});
  _.map(flujodot, function(elem){file.push(elem);});
  file.push("}");
}


// var secuencias = {};
//construyo un objeto que para cada nodo de tipo secuencia le asocia el nodo siguiente
function ajustarSecuencia(nodo){

  secuencias = {};
  ajustarSecuenciaRecursivo(nodo);
  return secuencias;

  function ajustarSecuenciaRecursivo(nodo){
      if(nodo.tipo=="secuencia"){
        secuencias[nodo.id] = nodo.id +1;
        for (var i = 0; i < nodo.sentencia.length; i++) {
          ajustarSecuenciaRecursivo(nodo.sentencia[i]);
        }
      }
      else if(isGateway(nodo.tipo)){
        for (var i = 0; i < nodo.sentencia.length; i++) {
          ajustarSecuenciaRecursivo(nodo.sentencia[i]);
        }
      }
  }
}

function dotTask(nodo){
  return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\"];";
}

function dotGw(nodo){
  if(nodo.tipo == "cierro"){
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia + "(" + nodo.ref + ")" + "\",  shape=diamond];";
  }
  return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.tipo + "\",  shape=diamond];";
}

function dotFlow(nodo, lista){
  var ret = [];
  if(!_.isUndefined(nodo.sig)){
    // console.log("tipo:" + nodo.tipo + "\tid:" + nodo.id + " siguientes:" + nodo.sig);
    var aux;
    // console.log(">>>>>>>> " + nodo.sig.length);
    for (var i = 0; i < nodo.sig.length; i++) {
      aux = nodo.id + " -> " + nodo.sig[i] + ";";
      // console.log(">Agregando< " + aux);
      ret.push(aux);
      // lista.push(aux);
    }
  }
  return ret;
}

var gateway = {
  'xor':true,
  'and':true
}
function isGateway(tipo){
  return tipo in gateway;
}

module.exports = {
  toDot: toDot
};
