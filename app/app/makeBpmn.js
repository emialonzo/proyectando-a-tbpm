var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");
var pd = require('pretty-data').pd;
var toDot = require('./makeDot').toDot;
var intermedio = require('./modeloIntermedio');
var prettyjson = require('prettyjson');

var x2js = require('x2js'); //new X2JS();
var conv = new x2js();

var gramatica = null;
var parser = null;

var globalId = 1;
var SequenceFlow_GlobalID = 1;
var bpmn = {};
var proceso = {
  process : {
    laneSet : {
      lane : []
    },
    startEvent : {},
    task : [],
    exclusiveGateway : [],
    parallelGateway : [],
    intermediateCatchEvent : [],
    endEvent : {},
    sequenceFlow : []
  }
};

function esSerializable(nodo){
  return nodo.tipo in {
    "task" : true,
    "evento" : true,
    "and" : true,
    "xor" : true,
    "loop" : true,
    "adjunto" : true,
    "cierro" : true,
  }
}

var losFlujos = [];
function asignarElFlujo(nodo){
  for (var i = 0; i < nodo.sig.length; i++) {
    losFlujos.push(
      {"sequenceFlow": {"_id":nodo.id+":"+nodo.sig[i], "_sourceRef":nodo.id, "_targetRef": nodo.sig[i]}}
    );
  }
}

function templateEvento(evento){
  if(evento.tiempo){
    return {"timerEventDefinition":{"timeDuration":{ "_name":evento.tiempo+evento.unidad}}}
  }else{
    return {"messageEventDefinition":{ "_messageRef":evento.mensaje}}
  }
}

  function templateNodo(nodo){
    var aux;
    if(nodo.tipo =="task"){
      if(nodo.sentencia.task == "human"){
        aux = {"userTask":{"_id":nodo.id , "_name":nodo.sentencia.accion}}
      }
      if(nodo.sentencia.task == "service"){
        aux = {"serviceTask":{ "_id":nodo.id , "_name":nodo.sentencia.accion}}
      }
    }
    if(nodo.tipo =="and"){
      aux = {"parallelGateway":{ "_id":nodo.id} }
    }
    if((nodo.tipo =="xor") || (nodo.tipo =="loop")){
      aux = {"exclusiveGateway": {"_id":nodo.id} }
    }
    if(nodo.tipo =="adjunto"){
      aux = {"boundaryEvent":{"_id":nodo.id, "_attachedToRef": nodo.adjunto_a_id } }
      _.extend(aux.boundaryEvent,templateEvento(nodo.evento));
    }
    if(nodo.tipo =="evento"){
      aux = {"intermediateCatchEvent":{ "_id":nodo.id} }
      _.extend(aux.intermediateCatchEvent, templateEvento(nodo.sentencia.evento));
    }
    if(nodo.tipo =="cierro"){
      aux = {"exclusiveGateway": {"_id":nodo.id} }
      if(nodo.tag == "and"){
        aux = {"parallelGateway": {"_id":nodo.id} }
      }
    }
    return aux;
  }

  var losNodos = [];
  function ponerNodo(nodo){
    losNodos.push(templateNodo(nodo));
  }

  var laneSetX = {};
  function laneNodo(nodo){
    return nodo.id;
  }

  function asignarALane(nodo){
    if(!laneSetX[nodo.lane]){
      laneSetX[nodo.lane] = [];
    }
    laneSetX[nodo.lane].push(laneNodo(nodo));

  }


  function makeJsonBpmn(modelo){
    //inicializo variables globales
    laneSetX = {};
    losNodos = [];
    losFlujos = [];
    //inicializo variables locales
    var stack =[];
    var laneActual;
    var nodo;
    stack.push(modelo);
    while(stack.length>0){
      nodo = stack.pop();
      if(esSerializable(nodo)){
        asignarALane(nodo);
        asignarElFlujo(nodo);
        ponerNodo(nodo);
      }
      if(nodo.sentencia instanceof Array){
        for (var i = nodo.sentencia.length-1; i >= 0; i--) {
          stack.push(nodo.sentencia[i]);
        }
      }
    } //fin while
    return armarJson();
  }

  function armarJson(modelo){
    var bpmn = {};
    idProceso = "id_proceso"
    bpmn.definitions = {};
    bpmn.definitions["collaboration"] = []
    bpmn.definitions.collaboration.push({"participant":{"_id":"pool_id", "_name":"PoolProcess", "_id":"pool_id", "_processRef":idProceso}});
    process = {}
    process["_id"] = idProceso;
    process["_isExecutable"] = true

    //agrego tareas, eventos y compuertas
    for (var i = 0; i < losNodos.length; i++) {
      var keys = _.keys(losNodos[i]);
      for (var j = 0; j < keys.length; j++) {
        if(!process[keys[j]]){
          process[keys[j]] = [];
        }
        process[keys[j]].push(losNodos[i][keys[j]]);
      }
    }
    //agrego el flujo
    process["sequenceFlow"] = [];
    for (var i = 0; i < losFlujos.length; i++) {
      process["sequenceFlow"].push(losFlujos[i]["sequenceFlow"]);
    }

    //agrego info del LANES
    process.laneSet = {};
    process.laneSet.lane = [];
    var keys = _.keys(laneSetX);
    for (var i = 0; i < keys.length; i++) {
      lane = keys[i];
      var aux = {}
      aux.flowNodeRef = []
      aux["_id"] = lane;
      for (var j = 0; j < laneSetX[lane].length; j++) {
        aux.flowNodeRef.push(laneSetX[lane][j]);
      }
      process.laneSet.lane.push(aux);
    }

    bpmn.definitions.process = process;
    // console.log("*******************");
    // console.log(pd.json(losNodos));
    // console.log("*******************");
    // console.log(pd.json(laneSetX));
    // console.log("*******************");
    // console.log(pd.json(losFlujos));
    // console.log("*******************");
    // console.log(pd.json(bpmn));
    // console.log("*******************");
    return bpmn;
  }

  function makeBpmnFromJson(json){
    return pd.xml(conv.json2xml_str(json));
  }

  function makeBpmn(modelo){
    return pd.xml(conv.json2xml_str(makeJsonBpmn((modelo))))
  }



//inicializo algunos valores necesarios
// evento de inicio, evento de fin ....
var start = function(model) {
  proceso.startEvent = {
    "outgoing": {
      "__prefix":"bpmn",
      "__text":"SequenceFlow_"+SequenceFlow_GlobalID++
    },
    "__prefix":"bpmn",
    "_id":"StartEvent_1"
  };
  proceso.sequenceFlow.push({
      "_id":proceso.startEvent.outgoing.__text,
      "_sourceRef":proceso.startEvent._id,
      "_targetRef":"",
      "__prefix":"bpmn"});
  proceso.endEvent = {
    "incoming": {},
    "__prefix":"bpmn",
    "_id":"EndEvent_1"
  }
}

var options = {
  keysColor: 'blue',
  dashColor: 'white',
  stringColor: 'green'
};

var generarXML = function (modelo) {
  start();
  //_.map(modelo, function(elem){ console.log(prettyjson.render(elem, options)); });
  _.map(modelo, function(elem){ obtenerLanes(elem); });
  _.map(modelo, function(elem){ obtenerTareas(elem); });

  var j=0;
  for (var i=0 ; i<modelo.length-1 ; i++) {
    generarFlujo(modelo[j], modelo[++j]);
  }
  conectarStartEvent(modelo);
  conectarEndEvent(modelo);
  //_.map(proceso, function(elem){ console.log(prettyjson.render(elem, options)); })
  console.log(pd.xml(conv.json2xml_str(proceso)));
}

module.exports = {
  makeBpmn: makeBpmn
}
