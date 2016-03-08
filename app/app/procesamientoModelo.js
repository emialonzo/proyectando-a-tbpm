var _ = require("underscore");
var pd = require('pretty-data').pd;
var parser = require("./parser.js");
var x2js = require('x2js');

var proceso = {
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
};

var conv = new x2js();
var SequenceFlow_GlobalID = 1;

var options = {
  keysColor: 'blue',
  dashColor: 'white',
  stringColor: 'green'
};

//inicializo algunos valores necesarios
// evento de inicio, evento de fin ....
var start = function(model) {
  proceso.startEvent = {
    "_id":"StartEvent_1"
  };
  proceso.endEvent = {
    "_id":"EndEvent_1"
  }
}

//Primera iteracion de procesamieno del modelo
//Genero los elementos XML para los lanes a partir de
//los actores de las tareas y los eventos
var obtenerLanes = function(elem) {
  if (elem.tipo == "task") {
    if (_.find(proceso.laneSet.lane, function(val){ return val._name == elem.sentencia.actor}) == null) {
      proceso.laneSet.lane.push(
        {"flowNodeRef": [],"_id" : "Lane_"+elem.sentencia.actor,
         "_name": elem.sentencia.actor});
    }
  } else if (elem.tipo == "evento") {
    if (_.find(proceso.laneSet.lane, function(val){ return val._name == elem.sentencia.actor}) == null) {
      proceso.laneSet.lane.push(
        {"flowNodeRef": [],"_id" : "Lane_"+elem.sentencia.actor,
         "_name": elem.sentencia.actor});
    }
  } else if (elem.tipo == "condicion") {
    obtenerLanes(elem.sentencia);
  } else if (elem.tipo == "xor") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  } else if (elem.tipo == "and") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  } else if (elem.tipo == "loop") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  } else if (elem.tipo == "secuencia") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  }
}

//Segunda iteracion de procesamiento del modelo
//Generlo los elementos XML correspondientes a
//las tareas, eventos y compuertas
var obtenerTareas = function(elem) {
  if (elem.tipo == "task") {
    var tarea = {"_id":"Task_"+elem.id, "_name":elem.sentencia.accion};
    proceso.task.push(tarea);
  } else if (elem.tipo == "evento") {
    var intermediateCatchEvent = {"_id":"IntermediateCatchEvent_"+elem.id};
    proceso.intermediateCatchEvent.push(intermediateCatchEvent);
  } else if (elem.tipo == "condicion") {
    obtenerTareas(elem.sentencia);
  } else if (elem.tipo == "xor") {
    var id = elem.id;
    var abre = {"_id":"ExclusiveGateway_"+id, "_default":""};
    proceso.exclusiveGateway.push(abre);
    id = elem.id + 1;
    var cierra = {"_id":"ExclusiveGateway_"+id};
    proceso.exclusiveGateway.push(cierra);
    for (var i=0; i < elem.sentencia.length; i++) {
      obtenerTareas(elem.sentencia[i]);
    }
  } else if (elem.tipo == "and") {
    var id = elem.id;
    var abre = {"_id":"ParallelGateway_"+id };
    proceso.parallelGateway.push(abre);
    id = elem.id + 1;
    var cierra = {"_id":"ParallelGateway_"+id };
    proceso.parallelGateway.push(cierra);
    for (var i=0; i < elem.sentencia.length; i++) {
      obtenerTareas(elem.sentencia[i]);
    }
  } else if (elem.tipo == "loop") {
    var id = elem.id;
    var abre = {"_id":"ExclusiveGateway_"+id};
    proceso.exclusiveGateway.push(abre);
    id = elem.id + 1;
    var cierra = {"_id":"ExclusiveGateway_"+id, "_default":""};
    proceso.exclusiveGateway.push(cierra);
    obtenerTareas(elem.sentencia);
  } else if (elem.tipo == "secuencia") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obtenerTareas(elem.sentencia[i]);
    }
  }
}

//Tercera iteracion de procesamiento del modelo
//Asocio los elementos generados en la segunda iteracion
//a los lanes correspondientes
var asociarElementosLanes = function(elem) {
  var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.lane});
  if (elem.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
    lane.flowNodeRef.push(task._id);
  } else if (elem.tipo == "evento") {
    var evento = _.find(proceso.intermediateCatchEvent, function(val){ return val._id == "IntermediateCatchEvent_"+elem.id});
    lane.flowNodeRef.push(evento._id);
  } else if (elem.tipo == "condicion") {
    asociarElementosLanes(elem.sentencia);
  } else if (elem.tipo == "xor") {
    var id = elem.id;
    var gwAbre = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    var gwCierra = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+(id+1)});
    lane.flowNodeRef.push(gwAbre._id);
    lane.flowNodeRef.push(gwCierra._id);
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "and") {
    var id = elem.id;
    var gwAbre = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    var gwCierra = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+(id+1)});
    lane.flowNodeRef.push(gwAbre._id);
    lane.flowNodeRef.push(gwCierra._id);
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "loop") {
    var id = elem.id;
    var gwAbre = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    var gwCierra = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+(id+1)});
    lane.flowNodeRef.push(gwAbre._id);
    lane.flowNodeRef.push(gwCierra._id);
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "secuencia") {
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  }
}

//Cuarta iteracion de procesamiento del modelo
//Genero los elementos XML necesarios para los flujos
var obtenerFlujos = function(modelo) {

}

var conectarStartEvent = function(modelo) {
  var primero = modelo[0];
  var flujoStartEvent = _.find(proceso.sequenceFlow, function(val){return val._id == proceso.startEvent.outgoing.__text});
  if (primero.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+primero.id});
    task.incoming = { "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = task._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.sentencia.actor});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "and") {
    var andGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+primero.id});
    andGW.incoming = { "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = andGW._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "xor") {
    var xorGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+primero.id});
    xorGW.incoming = { "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = xorGW._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "loop") {
    var loopGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+primero.id});
    loopGW.incoming = { "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = loopGW._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (ultimo.tipo == "evento") {
    var evento = _.find(proceso.intermediateCatchEvent, function(val){ return val._id == "IntermediateCatchEvent_"+ultimo.id});
    evento.incoming = { "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = evento._id;
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == primero.sentencia.actor});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  }
}

var conectarEndEvent = function(modelo) {
  var ultimo = modelo[modelo.length-1];
  var flujo = null;
  if (ultimo.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+ultimo.id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text});
    proceso.endEvent.incoming = { "__text":flujo._id};
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.sentencia.actor});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  } else if (ultimo.tipo == "and") {
    var id = ultimo.id + 1;
    var andGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == andGW.outgoing.__text});
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.lane});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  } else if (ultimo.tipo == "xor") {
    var id = ultimo.id + 1;
    var xorGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == xorGW.outgoing.__text});
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.lane});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  } else if (ultimo.tipo == "loop") {
    var id = ultimo.id + 1;
    var loopGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == loopGW._default});
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.lane});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  } else if (ultimo.tipo == "evento") {
    var evento = _.find(proceso.intermediateCatchEvent, function(val){ return val._id == "IntermediateCatchEvent_"+ultimo.id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == evento.outgoing.__text});
    proceso.endEvent.incoming = { "__text":flujo._id};
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == ultimo.sentencia.actor});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  }
  proceso.endEvent.incoming = { "__text":flujo._id};
  flujo._targetRef = proceso.endEvent._id;
}

var textToModel = function(texto) {
  parser.init(__dirname + '/gramatica2.pegjs');
  var modelo = parser.parse(texto);
  return modelo;
}

var modelToXML = function (modelo) {
  //Inicializo estructuras
  start();
  //console.log("######### obtenerLanes ####################");
  for (var i=0; i<modelo.length; i++) {
    obtenerLanes(modelo[i]);
  }
  //console.log("######### obtenerTareas ####################");
  for (var i=0; i<modelo.length; i++) {
    obtenerTareas(modelo[i]);
  }
  //console.log("######### asociarElementosLanes ####################");
  for (var i=0; i<modelo.length; i++) {
    asociarElementosLanes(modelo[i]);
  }
  //console.log("######### obtenerFlujos ####################");
  for (var i=0; i<modelo.length; i++) {
    obtenerFlujos(modelo[i]);
  }
  //console.log("######### conectarStartEvent ####################");
  //conectarStartEvent(modelo);
  //console.log("######### conectarEndEvent ####################");
  //conectarEndEvent(modelo);
  //console.log(pd.xml(conv.json2xml_str(proceso)));
  console.log(pd.json(proceso))
}



module.exports = {
  textToModel : textToModel,
  modelToXML : modelToXML
}
