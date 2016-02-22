var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");
var pd = require('pretty-data').pd;
var toDot = require('./makeDot').toDot;
var intermedio = require('./modeloIntermedio');
var prettyjson = require('prettyjson');

var gramatica = null;
var parser = null;

var globalId = 1;
var SequenceFlow_GlobalID = 1;
var bpmn = {};
var proceso = {
  laneSet : {
    lane : []
  },
  startEvent : {},
  task : [],
  exclusiveGateway : [],
  parallelGateway : [],
  endEvent : {},
  sequenceFlow : []
};

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
  }
}

// recorro el modelo nuevamente para construir el flujo del proceso
var generarFlujo = function(anterior, elem) {
  //Obtengo el flujo del elemento anterior para conectarlo con el elemento que estoy procesando
  var flujoAnterior = obtenerFlujo(anterior);
  if (elem.tipo == "task") {
    //obtengo la tarea que se esta procesando
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
    //conecto los elementos
    flujoAnterior._targetRef = task._id;
    task.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
  } else if (elem.tipo == "and") {
    //obtengo las compuertas que abren y cierran el AND
    var id = elem.id;
    var abreGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    id = id + 1;
    var cierraGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    //conecto la compuerta que abre con el elemento anterior
    flujoAnterior._targetRef = abreGW._id;
    abreGW.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
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
    } else if(elem.tipo == "sentencia") {
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
  } else if(elem.tipo == "sentencia") {
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
}
