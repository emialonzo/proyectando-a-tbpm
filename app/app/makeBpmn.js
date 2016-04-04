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
      {"sequenceFlow": {"_id":"_"+nodo.id+"_"+"_"+nodo.sig[i], "_sourceRef":"_"+nodo.id, "_targetRef": "_"+nodo.sig[i]}}
    );
  }
}

function templateEvento(evento){
  if(evento.tiempo){
    // return {"timerEventDefinition":{"timeDuration":{ "_name":evento.tiempo+evento.unidad}}}
    return {"timerEventDefinition":{"timeDuration":{}}}
  }else{
    return {"messageEventDefinition":{ "_messageRef":evento.mensaje}}
  }
}

  function templateNodo(nodo){
    var aux;
    if(nodo.tipo =="task"){
      if(nodo.sentencia.task == "human"){
        aux = {"userTask":{"_id":"_"+nodo.id , "_name":nodo.sentencia.accion}}
        aux = templatesCampos(nodo, aux);
      }
      if(nodo.sentencia.task == "service"){
        aux = {"serviceTask":{ "_id":"_"+nodo.id , "_name":nodo.sentencia.accion}}
      }
    }
    if(nodo.tipo =="and"){
      aux = {"parallelGateway":{ "_id":"_"+nodo.id} }
    }
    if((nodo.tipo =="xor") || (nodo.tipo =="loop")){
      aux = {"exclusiveGateway": {"_id":"_"+nodo.id} }
    }
    if(nodo.tipo =="adjunto"){
      aux = {"boundaryEvent":{"_id":"_"+nodo.id, "_attachedToRef": "_"+nodo.adjunto_a_id } }
      _.extend(aux.boundaryEvent,templateEvento(nodo.evento));
    }
    if(nodo.tipo =="evento"){
      aux = {"intermediateCatchEvent":{ "_id":"_"+nodo.id} }
      _.extend(aux.intermediateCatchEvent, templateEvento(nodo.sentencia.evento));
    }
    if(nodo.tipo =="cierro"){
      aux = {"exclusiveGateway": {"_id":"_"+nodo.id} }
      if(nodo.tag == "and"){
        aux = {"parallelGateway": {"_id":"_"+nodo.id} }
      }
    }
    return aux;
  }

  function templatesCampos(nodo, aux){
    if(nodo.sentencia.campos){
      aux.userTask['ioSpecification'] = {
        'dataOutput' : [],
        'inputSet' : [],
        'outputSet' : {
          'dataOutputRefs' : []
        }
      }
      aux.userTask['property'] = [];
      aux.userTask['dataOutputAssociation'] = [];

      for (var i = 0; i < nodo.sentencia.campos.length; i++) {
        var campo = nodo.sentencia.campos[i];
        //creo propeidades
        aux.userTask['property'].push({"_id":"id_"+campo.nombre, "_itemSubjectRef":"xsd:string", "_name":campo.nombre});
        //creo dataOutput
        aux.userTask.ioSpecification.dataOutput.push({"_id":"dataOut_"+campo.nombre, "_itemSubjectRef":"xsd:string", "_name":"dataout_"+campo.nombre});
        aux.userTask.ioSpecification.outputSet.dataOutputRefs.push("dataOut_"+campo.nombre);
        // aux.userTask.ioSpecification.outputSet.dataOutputRefs.push({"_id":"dataOut_"+campo.nombre});
        //se asocian las propiedades con la dataOutput
        aux.userTask.dataOutputAssociation.push({ "sourceRef":"dataOut_"+campo.nombre,
        "targetRef": "id_"+campo.nombre});
      }
    }
    // console.log(pd.json(aux));
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
    var startInsertado = false; //variable para agregar una sola vez el nodo start
    var endNodo; //ultimo nodo procesado
    stack.push(modelo);
    while(stack.length>0){
      nodo = stack.pop();
      if(esSerializable(nodo)){
        if(!startInsertado){
          var idStart = "idStart";
          losFlujos.push(
            {"sequenceFlow": {"_id":idStart+"_"+"_"+nodo.id, "_sourceRef":idStart, "_targetRef":"_"+nodo.id }}
          );
          losNodos.push({"startEvent":{"_id":idStart , "_name":"StartEvent"}});
          startInsertado = true;
        }
        asignarALane(nodo);
        asignarElFlujo(nodo);
        ponerNodo(nodo);
        // endNodo = nodo;
      }
      if(nodo.sentencia instanceof Array){
        for (var i = nodo.sentencia.length-1; i >= 0; i--) {
          stack.push(nodo.sentencia[i]);
        }
      }
    } //fin while
    //insertando el fin //FIXME ya estaba hecho
    // var idEnd = "idEnd"
    // losFlujos.push(
    //   {"sequenceFlow": {"_id":endNodo.id+":"+idEnd, "_sourceRef":endNodo.id, "_targetRef":idEnd }}
    // );
    losNodos.push({"endEvent":{"_id":"_F" , "_name":"EndEvent"}});
    return armarJson();
  }

  function armarDefinitionsConNamespaces(){
    return { "definitions" : {
      "_xmlns" : "http://www.omg.org/spec/BPMN/20100524/MODEL",
      "_xmlns:bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
      "_xmlns:dc": "http://www.omg.org/spec/DD/20100524/DC",
      "_xmlns:di": "http://www.omg.org/spec/DD/20100524/DI",
      "_xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
      "_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "_expressionLanguage":"http://www.w3.org/1999/XPath"
    }
    }
  }

  function armarJson(modelo){
    var bpmn = {};
    idProceso = "id_proceso"
    bpmn.definitions = {
      "_xmlns" : "http://www.omg.org/spec/BPMN/20100524/MODEL",
      "_xmlns:bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
      "_xmlns:dc": "http://www.omg.org/spec/DD/20100524/DC",
      "_xmlns:di": "http://www.omg.org/spec/DD/20100524/DI",
      "_xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
      "_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "_expressionLanguage":"http://www.w3.org/1999/XPath",
      "_targetNamespace":"http://sourceforge.net/bpmn/definitions/_1459655886338",
    }
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

    // //agrego info del LANES //FIXME lo saco porque hay problemas aca
    // process.laneSet = {};
    // process.laneSet.lane = [];
    // var keys = _.keys(laneSetX);
    // for (var i = 0; i < keys.length; i++) {
    //   lane = keys[i];
    //   var aux = {}
    //   aux.flowNodeRef = []
    //   aux["_id"] = lane;
    //   for (var j = 0; j < laneSetX[lane].length; j++) {
    //     aux.flowNodeRef.push(laneSetX[lane][j]);
    //   }
    //   process.laneSet.lane.push(aux);
    // }

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
