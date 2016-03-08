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
    // <timerEventDefinition><timeDuration>P10D</timeDuration></timerEventDefinition>
    return {"timerEventDefinition":{"timeDuration":{ "_name":evento.tiempo+evento.unidad}}}
  }else{
    // <intermediateCatchEvent id="paymentEvt" > <messageEventDefinition messageRef="payment" /> </intermediateCatchEvent>
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
    if(nodo.tipo =="xor"){
      aux = {"parallelGateway": {"_id":nodo.id} }
    }
    // if(nodo.tipo =="secuencia"){
    //    aux = "secuencia"
    //  }
    if(nodo.tipo =="adjunto"){
      aux = {"boundaryEvent":{"_id":nodo.id, "_attachedToRef": nodo.adjunto_a_id } }
      // aux.boundaryEvent["_text"] = [];
      _.extend(aux.boundaryEvent,templateEvento(nodo.evento));
    }
    if(nodo.tipo =="evento"){
      aux = {"intermediateCatchEvent":{ "_id":nodo.id} }
      _.extend(aux.intermediateCatchEvent, templateEvento(nodo.sentencia.evento));
    }
    if(nodo.tipo =="cierro"){
      aux = {"cierro":[]}
    }
    return aux;
  }

  var losNodos = [];
  function ponerNodo(nodo){
    losNodos.push(templateNodo(nodo));
  }

  var laneSetX = {};
  function laneNodo(nodo){
    // return {"flowNodeRef": nodo.id}
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
      // console.log(pd.json(nodo,0));
      if(esSerializable(nodo)){
        // console.log("---------------------->>>>>>>>");
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
    bpmn.definitions = [];
    bpmn.definitions.push({"collaboration":[]});
    // bpmn.definitions.push({"process":{ }});
    // bpmn.definitions[1].process.push({"laneSet":laneSetX});
    process = {}
    for (var i = 0; i < losNodos.length; i++) {
      var keys = _.keys(losNodos[i]);
      for (var j = 0; j < keys.length; j++) {
        console.log("key:" + keys[j] + " process" + process[keys[j]]);
        if(!process[keys[j]]){
          process[keys[j]] = [];
        }
        process[keys[j]].push(losNodos[i][keys[j]]);
      }
      // bpmn.definitions[1].process.push(losNodos[i]);
    }
    process["sequenceFlow"] = [];
    for (var i = 0; i < losFlujos.length; i++) {
      // bpmn.definitions[1].process.push(losFlujos[i]);
      process["sequenceFlow"].push(losFlujos[i]["sequenceFlow"]);
    }

    bpmn.process = process;
    process.laneSet = {};
    process.laneSet.lane = [];
    var keys = _.keys(laneSetX);
    for (var i = 0; i < keys.length; i++) {
      lane = keys[i];
      var aux = {}
      aux.flowNodeRef = []
      aux["_id"] = lane;
      for (var i = 0; i < laneSetX[lane].length; i++) {
        aux.flowNodeRef.push(laneSetX[lane][i]);
      }
      process.laneSet.lane.push(aux);

    }

    bpmn.process = process;
    console.log("*******************");
    console.log(pd.json(losNodos));
    console.log("*******************");
    console.log(pd.json(laneSetX));
    console.log("*******************");
    console.log(pd.json(losFlujos));
    console.log("*******************");
    console.log(pd.json(bpmn));
    console.log("*******************");
    return bpmn;
  }

  function makeBpmnFromJson(json){
    return pd.xml(conv.json2xml_str(json));
  }

  function makeBpmn(modelo){
    return pd.xml(conv.json2xml_str(makeJsonBpmn((modelo))))
  }




//TODO revisar bien si meterlo en la funcion start o la funcion start meterla aca
var init = function(path){
  path = path || __dirname + '/gramatica.pegjs';
  gramatica = fs.readFileSync(path).toString();
  parser = PEG.buildParser(gramatica);
}

// Obtengo los actores de cada tarea para ir armando los lanes
var actor = "";
var obtenerLanes = function(elem) {
  if (elem.tipo == "task") {
    actor = elem.sentencia.actor;
    if (_.find(proceso.laneSet.lane, function(val){ return val._name == elem.sentencia.actor}) == null) {
      proceso.laneSet.lane.push(
        {"flowNodeRef": [],"_id" : "Lane_"+elem.sentencia.actor,
         "_name": elem.sentencia.actor,"__prefix":"bpmn"});
    }
  } else if (elem.tipo == "condicion") {
    obtenerLanes(elem.sentencia);
  } else if (elem.tipo == "xor") {
    elem.lane = actor;
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  } else if (elem.tipo == "and") {
    elem.lane = actor;
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  } else if (elem.tipo == "loop") {
    elem.lane = actor;
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  } else if (elem.tipo == "evento") {
    actor = elem.sentencia.actor;
    if (_.find(proceso.laneSet.lane, function(val){ return val._name == elem.sentencia.actor}) == null) {
      proceso.laneSet.lane.push(
        {"flowNodeRef": [],"_id" : "Lane_"+elem.sentencia.actor,
         "_name": elem.sentencia.actor,"__prefix":"bpmn"});
    }
  } else if (elem.tipo == "secuencia") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  }
}

// recorre las tareas para ir asignandolas a los lanes
// las compuertas se asignan a los lanes en un paso posterior (generarFlujo)
// se asignan los flujos de salida de cada tarea y compuerta
var obtenerTareas = function(elem) {
  if (elem.tipo == "task") {
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.sentencia.actor});
    var nodo = {"__prefix":"bpmn","__text":"Task_"+elem.id};
    lane.flowNodeRef.push(nodo);
    var tarea =
      {
        "incoming":{},
        "outgoing":{"__prefix":"bpmn", "__text":"SequenceFlow_"+SequenceFlow_GlobalID++},
        "_id":"Task_"+elem.id,
        "_name":elem.sentencia.accion,"__prefix":"bpmn"
      };
    proceso.sequenceFlow.push({"_id":tarea.outgoing.__text,"_sourceRef":nodo.__text, "_targetRef":"","__prefix":"bpmn"});
    proceso.task.push(tarea);
  } else if (elem.tipo == "condicion") {
    obtenerTareas(elem.sentencia);
  } else if (elem.tipo == "xor") {
    var id = elem.id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.lane});
    var nodo = {"__prefix":"bpmn","__text":"ExclusiveGateway_"+id};
    lane.flowNodeRef.push(nodo);
    var abre = {"incoming":{},"outgoing":[],"_id":"ExclusiveGateway_"+id, "_default":"","__prefix":"bpmn"};
    proceso.exclusiveGateway.push(abre);
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
      abre.outgoing.push(flujo);
      var sequenceFlow;
      if (obj.condicion == "defecto") {
        sequenceFlow = {
            "_id":flujo.__text,"_sourceRef":abre._id,
            "_targetRef":"","__prefix":"bpmn"}
      } else {
        sequenceFlow = {
            "_id":flujo.__text,"_name":obj.condicion,"_sourceRef":abre._id,
            "_targetRef":"","__prefix":"bpmn"}
      }
      proceso.sequenceFlow.push(sequenceFlow);

      obtenerTareas(obj);
      if (obj.condicion == "defecto") {
        abre._default = flujo.__text;
      }
    }
    id = elem.id + 1;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.lane});
    var nodo = {"__prefix":"bpmn","__text":"ExclusiveGateway_"+id};
    lane.flowNodeRef.push(nodo);
    var cierra = {"incoming":[],"outgoing":{},"_id":"ExclusiveGateway_"+id, "__prefix":"bpmn"};
    var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
    cierra.outgoing = flujo;
    proceso.sequenceFlow.push({"_id":flujo.__text,"_sourceRef":cierra._id, "_targetRef":"","__prefix":"bpmn"});
    var nodo = {"__prefix":"bpmn","__text":"ExclusiveGateway_"+id};
    proceso.exclusiveGateway.push(cierra);
  } else if (elem.tipo == "and") {
    var id = elem.id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.lane});
    var nodo = {"__prefix":"bpmn","__text":"ParallelGateway_"+id};
    lane.flowNodeRef.push(nodo);
    var abre = {"incoming":{}, "outgoing":[],"_id":"ParallelGateway_"+id, "__prefix":"bpmn" };
    var nodo = {"__prefix":"bpmn","__text":"ParallelGateway_"+id};
    proceso.parallelGateway.push(abre);
    for (var i=0; i < elem.sentencia.length; i++) {
      var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
      abre.outgoing.push(flujo);
      proceso.sequenceFlow.push({
          "_id":flujo.__text,"_sourceRef":abre._id,
          "_targetRef":"","__prefix":"bpmn"});
      obj = elem.sentencia[i];
      obtenerTareas(obj);
    }
    id = elem.id + 1;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.lane});
    var nodo = {"__prefix":"bpmn","__text":"ParallelGateway_"+id};
    lane.flowNodeRef.push(nodo);
    var cierra = {"incoming":[], "outgoing":{},"_id":"ParallelGateway_"+id, "__prefix":"bpmn" };
    var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
    cierra.outgoing = flujo;
    proceso.sequenceFlow.push({"_id":flujo.__text,"_sourceRef":cierra._id, "_targetRef":"","__prefix":"bpmn"});
    var nodo = {"__prefix":"bpmn","__text":"ParallelGateway_"+id};
    proceso.parallelGateway.push(cierra);
  } else if (elem.tipo == "loop") {
    var id = elem.id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.lane});
    var nodo = {"__prefix":"bpmn","__text":"ExclusiveGateway_"+id};
    lane.flowNodeRef.push(nodo);
    var abre = {"incoming":[],"outgoing":{},"_id":"ExclusiveGateway_"+id,"__prefix":"bpmn"};
    proceso.exclusiveGateway.push(abre);
    var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
    abre.outgoing = flujo;
    sequenceFlow = {"_id":flujo.__text,"_sourceRef":abre._id,"_targetRef":"","__prefix":"bpmn"}
    proceso.sequenceFlow.push(sequenceFlow);
    obtenerTareas(elem.sentencia);
    id = elem.id + 1;
    var nodo = {"__prefix":"bpmn","__text":"ExclusiveGateway_"+id};
    lane.flowNodeRef.push(nodo);
    var cierra = {"incoming":{},"outgoing":[],"_id":"ExclusiveGateway_"+id, "_default":"","__prefix":"bpmn"};
    var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
    var flujoDefecto = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
    cierra._default = flujoDefecto.__text;
    abre.incoming.push(flujo);
    cierra.outgoing.push(flujo);
    cierra.outgoing.push(flujoDefecto);
    proceso.sequenceFlow.push({"_id":flujo.__text,"_name":elem.condicion,"_sourceRef":cierra._id,"_targetRef":abre._id,"__prefix":"bpmn"});
    proceso.sequenceFlow.push({"_id":flujoDefecto.__text,"_sourceRef":cierra._id, "_targetRef":"","__prefix":"bpmn"});
    proceso.exclusiveGateway.push(cierra);
  } else if (elem.tipo == "evento") {
    //console.log("#################################")
    //console.log("EVENTO\n"+ prettyjson.render(elem,options));
    //console.log("#################################")
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.sentencia.actor});
    var nodo = {"__prefix":"bpmn","__text":"IntermediateCatchEvent_"+elem.id};
    lane.flowNodeRef.push(nodo);
    var intermediateCatchEvent =
      {
        "incoming":{},
        "outgoing":{"__prefix":"bpmn", "__text":"SequenceFlow_"+SequenceFlow_GlobalID++},
        "_id":"IntermediateCatchEvent_"+elem.id, "__prefix":"bpmn"
      };
    var sequenceFlow = {"_id":intermediateCatchEvent.outgoing.__text,"_sourceRef":nodo.__text, "_targetRef":"","__prefix":"bpmn"};
    proceso.sequenceFlow.push(sequenceFlow);
    proceso.intermediateCatchEvent.push(intermediateCatchEvent);
  } else if (elem.tipo == "secuencia") {
    //console.log("#################################")
    //console.log("SECUENCIA\n"+ prettyjson.render(elem,options));
    //console.log("#################################")
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerTareas(obj);
    }
  }
}

var obtenerFlujo = function(elem) {
  var flujo = null;
  if (elem.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text});
    return flujo;
  } else if (elem.tipo == "and") {
    var id = elem.id + 1;
    var gwAND = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwAND.outgoing.__text});
    return flujo;
  } else if (elem.tipo == "xor") {
    var id = elem.id + 1;
    var gwXOR = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwXOR.outgoing.__text});
    return flujo;
  } else if (elem.tipo = "loop") {
    var id = elem.id + 1;
    var gwLOOP = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwLOOP._default});
    return flujo;
  } else if (elem.tipo = "evento") {
    var evento = _.find(proceso.intermediateCatchEvent, function(val){ return val._id == "IntermediateCatchEvent_"+elem.id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == evento.outgoing.__text});
    return flujo;
  }
}

// recorro el modelo nuevamente para construir el flujo del proceso
var generarFlujo = function(anterior, elem) {
  //Obtengo el flujo del elemento anterior para conectarlo con el elemento que estoy procesando
  console.log("##################### FLUJO ANTERIOR ##########################");
  var flujoAnterior = obtenerFlujo(anterior);
  console.log(prettyjson.render(flujoAnterior, options));
  console.log("##################### ELEM ##########################");
  console.log(prettyjson.render(elem, options));
  if (elem.tipo == "task") {
    console.log("##################### TASK ##########################");
    //obtengo la tarea que se esta procesando
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
    console.log(prettyjson.render(task, options));
    //conecto los elementos
    flujoAnterior._targetRef = task._id;
    task.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
    console.log("##################### POST PROCESAMIENTO ##########################");
    console.log("##################### FLUJO ANTERIOR ##########################");
    console.log(prettyjson.render(flujoAnterior, options));
    console.log("##################### TASK ##########################");
    console.log(prettyjson.render(task, options));
    console.log("#####################################################");
  } else if (elem.tipo == "and") {
    console.log("##################### AND ##########################");
    //obtengo las compuertas que abren y cierran el AND
    var id = elem.id;
    console.log("##################### GW ABRE ##########################");
    var abreGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    console.log(prettyjson.render(abreGW, options));
    id = id + 1;
    console.log("##################### GW CIERRA ##########################");
    var cierraGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    console.log(prettyjson.render(cierraGW, options));
    //conecto la compuerta que abre con el elemento anterior
    flujoAnterior._targetRef = abreGW._id;
    abreGW.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
    console.log("##################### POST PROCESAMIENTO ##########################");
    console.log("##################### FLUJO ANTERIOR ##########################");
    console.log(prettyjson.render(flujoAnterior, options));
    console.log("##################### GW ABRE ##########################");
    console.log(prettyjson.render(abreGW, options));
    //construyo el flujo entre la compuerta que abre y la compuerta que cierra
    //utilizo como modelo la sentencia del elemento AND
    generarFlujoAND(abreGW, cierraGW, elem.sentencia);
  } else if (elem.tipo == "xor") {
    //obtengo las compuertas que abren y cierran el XOR
    var id = elem.id;
    var abreGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    id = id + 1;
    var cierraGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    //conecto la compuerta que abre con el elemento anterior
    flujoAnterior._targetRef = abreGW._id;
    abreGW.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
    //construyo el flujo entre la compuerta que abre y la compuerta que cierra
    //utilizo como modelo la sentencia del elemento XOR
    generarFlujoXOR(abreGW, cierraGW, elem.sentencia, abreGW._default);
  } else if (elem.tipo == "loop") {
    //obtengo las compuertas que abren y cierran el XOR
    var id = elem.id;
    var abreGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    id = id + 1;
    var cierraGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    //conecto la compuerta que abre con el elemento anterior
    flujoAnterior._targetRef = abreGW._id;
    abreGW.incoming.push({"__prefix":"bpmn", "__text":flujoAnterior._id});
    //construyo el flujo entre la compuerta que abre y la compuerta que cierra
    //utilizo como modelo la sentencia del elemento XOR
    generarFlujoLOOP(abreGW, cierraGW, elem.sentencia);
  } else if (elem.tipo == "evento") {
    //obtengo el evento que se esta procesando
    var evento = _.find(proceso.intermediateCatchEvent, function(val){ return val._id == "IntermediateCatchEvent_"+elem.id});
    //conecto los elementos
    flujoAnterior._targetRef = evento._id;
    evento.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
  }
}

var generarFlujoAND = function(gwAbre, gwCierra, modelo) {
  for (var i = 0; i< modelo.length; i++) {
    var elem = modelo[i];
    var flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwAbre.outgoing[i].__text});
    if (elem.tipo == "task") {
      var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
      flujo._targetRef = task._id;
      task.incoming = {"__prefix":"bpmn", "__text":flujo._id};
      gwCierra.incoming.push(task.outgoing);
      var flujoTask = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text})
      flujoTask._targetRef = gwCierra._id
    } else if(elem.tipo == "and") {
      var id = elem.id;
      var abreGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
      id = id + 1;
      var cierraGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
      flujo._targetRef = abreGW._id;
      abreGW.incoming = {"__prefix":"bpmn", "__text":flujo._id};
      gwCierra.incoming.push(cierraGW.outgoing);
      generarFlujoAND(abreGW, cierraGW, elem.sentencia);
    } else if(elem.tipo == "xor") {
      var id = elem.id;
      var abreGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
      id = id + 1;
      var cierraGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
      flujo._targetRef = abreGW._id;
      abreGW.incoming = {"__prefix":"bpmn", "__text":flujo._id};
      gwCierra.incoming.push(cierraGW.outgoing);
      generarFlujoXOR(abreGW, cierraGW, elem.sentencia, abreGW._default);
    } else if(elem.tipo == "loop") {
      //TODO cuando agreguemos el loop hay que implementar esta parte
    } else if(elem.tipo == "secuencia") {

      //TODO arreglar cuando se modifique la gramatica
    }
  }

}

var generarFlujoXOR = function(gwAbre, gwCierra, modelo, flujoDefecto) {
  for (var i = 0; i< modelo.length; i++) {
    var elem = modelo[i];
    var flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwAbre.outgoing[i].__text});
    if (elem.tipo == "condicion") {
      var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.sentencia.id});
      flujo._targetRef = task._id;
      task.incoming = {"__prefix":"bpmn", "__text":flujo._id};
      gwCierra.incoming.push(task.outgoing);
      var flujoTask = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text})
      flujoTask._targetRef = gwCierra._id
    } else if(elem.tipo == "and") {
      var id = elem.id;
      var abreGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
      id = id + 1;
      var cierraGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
      flujo._targetRef = abreGW._id;
      abreGW.incoming = {"__prefix":"bpmn", "__text":flujo._id};
      gwCierra.incoming.push(cierraGW.outgoing);
      generarFlujoAND(abreGW, cierraGW, elem.sentencia);
    } else if(elem.tipo == "xor") {
      var id = elem.id;
      var abreGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
      id = id + 1;
      var cierraGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
      flujo._targetRef = abreGW._id;
      abreGW.incoming = {"__prefix":"bpmn", "__text":flujo._id};
      gwCierra.incoming.push(cierraGW.outgoing);
      generarFlujoXOR(abreGW, cierraGW, elem.sentencia, abreGW._default);
    } else if(elem.tipo == "loop") {
      //TODO cuando agreguemos el loop hay que implementar esta parte
    } else if(elem.tipo == "sentencia") {
      //TODO arreglar cuando se modifique la gramatica
    }

  }
}

var generarFlujoLOOP = function(gwAbre, gwCierra, modelo) {
  var elem = modelo;
  var flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwAbre.outgoing.__text});
  if (elem.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
    flujo._targetRef = task._id;
    task.incoming = {"__prefix":"bpmn", "__text":flujo._id};
    gwCierra.incoming = task.outgoing;
    var flujoTask = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text})
    flujoTask._targetRef = gwCierra._id
  } else if(elem.tipo == "and") {
    var id = elem.id;
    var abreGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    id = id + 1;
    var cierraGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    flujo._targetRef = abreGW._id;
    abreGW.incoming = {"__prefix":"bpmn", "__text":flujo._id};
    gwCierra.incoming = cierraGW.outgoing;
    generarFlujoAND(abreGW, cierraGW, elem.sentencia);
  } else if(elem.tipo == "xor") {
    var id = elem.id;
    var abreGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    id = id + 1;
    var cierraGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo._targetRef = abreGW._id;
    abreGW.incoming = {"__prefix":"bpmn", "__text":flujo._id};
    gwCierra.incoming = cierraGW.outgoing;
    generarFlujoXOR(abreGW, cierraGW, elem.sentencia, abreGW._default);
  } else if(elem.tipo == "loop") {
    var id = elem.id;
    var abreGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    id = id + 1;
    var cierraGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo._targetRef = abreGW._id;
    abreGW.incoming = {"__prefix":"bpmn", "__text":flujo._id};
    gwCierra.incoming = cierraGW._default;
    generarFlujoLOOP(abreGW, cierraGW, elem.sentencia);
  } else if(elem.tipo == "secuencia") {
    //TODO arreglar cuando se modifique la gramatica
  }
}

var conectarStartEvent = function(modelo) {
  var primero = modelo[0];
  var flujoStartEvent = _.find(proceso.sequenceFlow, function(val){return val._id == proceso.startEvent.outgoing.__text});
  if (primero.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+primero.id});
    task.incoming = {"__prefix":"bpmn", "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = task._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.sentencia.actor});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"StartEvent_1"});
  } else if (primero.tipo == "and") {
    var andGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+primero.id});
    andGW.incoming = {"__prefix":"bpmn", "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = andGW._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"StartEvent_1"});
  } else if (primero.tipo == "xor") {
    var xorGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+primero.id});
    xorGW.incoming = {"__prefix":"bpmn", "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = xorGW._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"StartEvent_1"});
  } else if (primero.tipo == "loop") {
    var loopGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+primero.id});
    loopGW.incoming = {"__prefix":"bpmn", "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = loopGW._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"StartEvent_1"});
  } else if (ultimo.tipo == "evento") {
    var evento = _.find(proceso.intermediateCatchEvent, function(val){ return val._id == "IntermediateCatchEvent_"+ultimo.id});
    evento.incoming = {"__prefix":"bpmn", "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = evento._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.sentencia.actor});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"StartEvent_1"});
  }
}

var conectarEndEvent = function(modelo) {
  var ultimo = modelo[modelo.length-1];
  var flujo = null;
  if (ultimo.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+ultimo.id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text});
    proceso.endEvent.incoming = {"__prefix":"bpmn", "__text":flujo._id};
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.sentencia.actor});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"EndEvent_1"});
  } else if (ultimo.tipo == "and") {
    var id = ultimo.id + 1;
    var andGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == andGW.outgoing.__text});
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.lane});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"EndEvent_1"});
  } else if (ultimo.tipo == "xor") {
    var id = ultimo.id + 1;
    var xorGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == xorGW.outgoing.__text});
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.lane});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"EndEvent_1"});
  } else if (ultimo.tipo == "loop") {
    var id = ultimo.id + 1;
    var loopGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == loopGW._default});
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.lane});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"EndEvent_1"});
  } else if (ultimo.tipo == "evento") {
    var evento = _.find(proceso.intermediateCatchEvent, function(val){ return val._id == "IntermediateCatchEvent_"+ultimo.id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == evento.outgoing.__text});
    proceso.endEvent.incoming = {"__prefix":"bpmn", "__text":flujo._id};
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.sentencia.actor});
    lane.flowNodeRef.push({"__prefix":"bpmn","__text":"EndEvent_1"});
  }
  proceso.endEvent.incoming = {"__prefix":"bpmn", "__text":flujo._id};
  flujo._targetRef = proceso.endEvent._id;
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
  init : init,
  start : start,
  obtenerLanes : obtenerLanes,
  obtenerTareas : obtenerTareas,
  proceso : proceso,
  generarFlujo : generarFlujo,
  toDot : toDot,
  conectarEndEvent : conectarEndEvent,
  conectarStartEvent : conectarStartEvent,
  generarXML : generarXML,
  makeBpmn: makeBpmn
}
