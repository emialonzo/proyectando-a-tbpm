//generar archivos dot de graphviz  partir de el modelo de datos
var fs = require("fs");
var _ = require("underscore");
var pd = require('pretty-data').pd;
var intermedio = require('./modeloIntermedio');
var isGateway = intermedio.isGateway;

var toDot = function(modelo){
  file = [];
  taskdot={};
  gwdot=[];
  flujodot=[];
  secuencias = {};

  //setea las variables taskdot, gwdot y flujodot con los elemenots a mostrar en el dot
  dotRec(modelo, flujodot);
  //develve un obj con clave id de la secuancia y valor los elementos
  secuencias = obtenerSecuencias(modelo);
  //sustituye en flujo dot, id->idSecuencia por id->secuencia.idsiguiente
  flujodot = ajustarSecuencias(flujodot, secuencias);
  //arma el archivo dot
  printFile(flujodot);
  return file.join("\n");
}

function dotRec(nodo, flujodot){
  //FIXME
  if(_.isUndefined(nodo)) {console.log("FIXME");return;}
  if(nodo.tipo=="task") {
    //agrego tarea al lane
    if(_.isUndefined(taskdot[nodo.sentencia.actor])){
      taskdot[nodo.sentencia.actor] = [];
    }
    taskdot[nodo.sentencia.actor].push(templateDotTask(nodo));
    _.map(templateDotFlow(nodo), function(elem){flujodot.push(elem);});
  }
  else if(nodo.tipo=="evento") {
    //agrego tarea al lane
    if(_.isUndefined(taskdot[nodo.sentencia.actor])){
      taskdot[nodo.sentencia.actor] = [];
    }
    taskdot[nodo.sentencia.actor].push(templateEventTask(nodo));
    _.map(templateDotFlow(nodo), function(elem){flujodot.push(elem);});
  }
  else if(nodo.tipo=="adjunto") {
    //{"tipo":"evento","sentencia":{"evento":{"tiempo":30,"unidad":"segundo"},"actor":"cocinero"},"id":3,"sig":[4],"ant":[3]}
    //agrego tarea al lane
    if(_.isUndefined(taskdot[nodo.lane])){
      taskdot[nodo.lane] = [];
    }
    taskdot[nodo.lane].push(templateAdjuntoEventTask(nodo));
    _.map(templateDotFlow(nodo), function(elem){flujodot.push(elem);});
    flujodot.push(nodo.ant+"->"+nodo.id);
    dotRec(nodo.sentencia[0], flujodot);
  }
  else if(nodo.tipo=="secuencia"){
    _.map(_.compact(nodo.sentencia), function(elem){ dotRec(elem, flujodot);});
  }
  else if(nodo.tipo=="cierro"){
    //agrego shape para la compuerta
    gwdot.push(templateDotGw(nodo)); //agrega el nodo compuerto
    //agrego flujo
    _.map(templateDotFlow(nodo), function(elem){flujodot.push(elem);});
  }
  else if(isGateway(nodo.tipo)){
    //agrego shape
    gwdot.push(templateDotGw(nodo));
    //agrego flujo
    _.map(templateDotFlow(nodo), function(elem){flujodot.push(elem);});
    _.map(_.compact(nodo.sentencia), function(elem){ dotRec(elem, flujodot);});
  }
};

//construyo un objeto que para cada nodo de tipo secuencia le asocia el nodo siguiente
function obtenerSecuencias(nodo){

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

//inserta dot con los flujos iniciales, y por cada flujo detectado, controla que la parte de la derecha del flujo no sea una secuenca
function ajustarSecuencias(flujodot, secuencias){
  var flujito = [];
  flujito.push("S [label=\"S\", shape=circle, width=\"0.3\"];");
  flujito.push("F [label=\"F\", shape=circle, width=\"0.3\" , style=bold];");
  flujito.push("");
  var str = flujodot[0];
  var clave = str.substring(0, str.lastIndexOf("-"));
  flujito.push("S -> " + clave + " ;");

  for (var i = 0; i < flujodot.length; i++) {
    var str = flujodot[i];
    var clave = str.substring(str.lastIndexOf(">")+1, str.lastIndexOf(";")); //parte derecha
    clave = clave.replace(/\s/g, '');
    if(_.isUndefined(secuencias["" + clave])){
      flujito.push(str);
    }else{
      var mask = str.substring(0,str.lastIndexOf(">")+1); //parte derecha
      flujito.push(mask + secuencias[clave] + ";");
    }
  }
  return flujito;
}

var file = [];
function printFile() {
  file.push("digraph G01 {");
  file.push("rankdir=LR; node [shape=box, style=\"rounded, filled\"];");
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

function templateDotTask(nodo){
  if(nodo.sentencia.task == "human")
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" fillcolor=\"red\" ];";
  else
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" fillcolor=\"green\" ];";
}

function templateEventTask(nodo){
  // console.info(JSON.stringify(nodo));
  if(nodo.sentencia.evento.tiempo){
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.evento.tiempo + " " + nodo.sentencia.evento.unidad + "\" shape=circle fillcolor=\"aquamarine\" ];";
  } else if(nodo.sentencia.evento.mensaje){
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.evento.mensaje + "\" shape=circle fillcolor=\"cadetblue1\" ];";
  } else{
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" shape=circle fillcolor=\"white\" ];";
  }
}

function templateAdjuntoEventTask(nodo){
  console.info(JSON.stringify(nodo));
  if(nodo.evento.tiempo){
    return nodo.id + " [label=\"id:" + nodo.id +" adjunto a " + nodo.adjunto_a + "\\n Evento:" + nodo.evento.tiempo + " " + nodo.evento.unidad + "\" shape=circle fillcolor=\"aquamarine\" ];";
  } else if(nodo.evento.mensaje){
    return nodo.id + " [label=\"id:" + nodo.id +" adjunto a " + nodo.adjunto_a + "\\n Evento: mensaje"+nodo.evento.mensaje + "\" shape=circle fillcolor=\"cadetblue1\" ];";
  }
  // else{
  //   return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" shape=circle fillcolor=\"white\" ];";
  // }
}

function templateDotGw(nodo){
  if(nodo.tipo == "cierro"){
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia + "(" + nodo.ref + ")" + "\",  shape=diamond];";
  }
  return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.tipo + "\",  shape=diamond];";
}

function templateDotFlow(nodo){
  var ret = [];
  if(!_.isUndefined(nodo.sig)){
    var aux;
    for (var i = 0; i < nodo.sig.length; i++) {
      aux = nodo.id + " -> " + nodo.sig[i] + ";";
      ret.push(aux);
    }
  }
  return ret;
}



module.exports = {
  toDot: toDot
};
