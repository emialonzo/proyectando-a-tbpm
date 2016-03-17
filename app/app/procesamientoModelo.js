var _ = require("underscore");
var pd = require('pretty-data').pd;
var parser = require("./parser.js");
var x2js = require('x2js');

var proceso = {
  process : {
    laneSet : {
      lane : []
    },
    startEvent : {},
    userTask : [],
    serviceTask : [],
    exclusiveGateway : [],
    parallelGateway : [],
    intermediateCatchEvent : [],
    intermediateThrowEvent : [],
    boundaryEvent : [],
    endEvent : {},
    sequenceFlow : []
  }
};

var conv = new x2js();
var SequenceFlow_GlobalID = 1;

var options = {
  keysColor: 'blue',
  dashColor: 'white',
  stringColor: 'green'
};

//Inicializo estructuras
var start = function(model) {
  proceso.process.startEvent = {
    "_id":"StartEvent_1"
  };
  proceso.process.endEvent = {
    "_id":"EndEvent_1"
  }
}

//Primera iteracion de procesamieno del modelo
//Genero los elementos XML para los lanes a partir de
//los actores de las tareas y los eventos
var obtenerLanes = function(elem) {
  if (elem.tipo == "task") {
    if (_.find(proceso.process.laneSet.lane, function(val){ return val._name == elem.sentencia.actor}) == null) {
      proceso.process.laneSet.lane.push(
        {"flowNodeRef": [],"_id" : "Lane_"+elem.sentencia.actor,
         "_name": elem.sentencia.actor});
    }
  } else if (elem.tipo == "evento") {
    if (_.find(proceso.process.laneSet.lane, function(val){ return val._name == elem.sentencia.actor}) == null) {
      proceso.process.laneSet.lane.push(
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
  } else if (elem.tipo == "adjunto") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerLanes(obj);
    }
  }
}

var extensionEvento = function(elem, evento) {
  var extensionEvento;
  if (evento.tipo == "timer") {
    extensionEvento = {"timerEventDefinition":""}
  } else if (evento.tipo == "mensaje") {
    extensionEvento = {"messageEventDefinition":""}
  }
  _.extend(elem, extensionEvento);
}

//Segunda iteracion de procesamiento del modelo
//Generlo los elementos XML correspondientes a
//las tareas, eventos y compuertas
var obtenerTareas = function(elem) {
  if (elem.tipo == "task") {
    if (elem.sentencia.task == "service") {
      var tarea = {"_id":elem.id, "_name":elem.sentencia.accion};
      proceso.process.serviceTask.push(tarea);
    } else if (elem.sentencia.task == "human") {
      var tarea = {"_id":elem.id, "_name":elem.sentencia.accion};
      proceso.process.userTask.push(tarea);
    }
  } else if (elem.tipo == "evento") {
    var intermediateCatchEvent = {"_id":elem.id};
    extensionEvento(intermediateCatchEvent, elem.sentencia.evento);
    proceso.process.intermediateCatchEvent.push(intermediateCatchEvent);
  } else if (elem.tipo == "xor") {
    var id = elem.id;
    var abre = {"_id":id, "_default":""};
    proceso.process.exclusiveGateway.push(abre);
    for (var i=0; i < elem.sentencia.length; i++) {
      obtenerTareas(elem.sentencia[i]);
    }
  } else if (elem.tipo == "and") {
    var id = elem.id;
    var abre = {"_id":id};
    proceso.process.parallelGateway.push(abre);
    for (var i=0; i < elem.sentencia.length; i++) {
      obtenerTareas(elem.sentencia[i]);
    }
  } else if (elem.tipo == "loop") {
    var id = elem.id;
    var abre = {"_id":id};
    proceso.process.exclusiveGateway.push(abre);
    for (var i = 0; i < elem.sentencia.length; i++) {
      obtenerTareas(elem.sentencia[i])
    }
  } else if (elem.tipo == "secuencia") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obtenerTareas(elem.sentencia[i]);
    }
  } else if (elem.tipo == "cierro") {
    var cierra;
    if (elem.sentencia == "and") {
      var cierra = {"_id":elem.id};
      proceso.process.parallelGateway.push(cierra);
    } else if (elem.sentencia == "xor") {
      var cierra = {"_id":elem.id};
      proceso.process.exclusiveGateway.push(cierra);
    } else if (elem.sentencia == "loop") {
      var cierra = {"_id":elem.id, "_default":""};
      proceso.process.exclusiveGateway.push(cierra);
    }
  } else if (elem.tipo == "adjunto") {
    var adjunto = {"_id":elem.id, "_attachedToRef":elem.adjunto_a_id};
    extensionEvento(adjunto, elem.evento);
    proceso.process.boundaryEvent.push(adjunto);
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerTareas(obj);
    }
  }
}

//Tercera iteracion de procesamiento del modelo
//Asocio los elementos generados en la segunda iteracion
//a los lanes correspondientes
var asociarElementosLanes = function(elem) {
  var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == elem.lane});
  if (elem.tipo == "task") {
    var task;
    if (elem.sentencia.task == "service") {
      task = _.find(proceso.process.serviceTask, function(val){ return val._id == elem.id});
    } else if (elem.sentencia.task == "human") {
      task = _.find(proceso.process.userTask, function(val){ return val._id == elem.id});
    }
    lane.flowNodeRef.push(task._id);
  } else if (elem.tipo == "evento") {
    var evento = _.find(proceso.process.intermediateCatchEvent, function(val){ return val._id == elem.id});
    lane.flowNodeRef.push(evento._id);
  } else if (elem.tipo == "condicion") {
    asociarElementosLanes(elem.sentencia);
  } else if (elem.tipo == "xor") {
    var gwAbre = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
    lane.flowNodeRef.push(gwAbre._id);
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "and") {
    var gwAbre = _.find(proceso.process.parallelGateway, function(val) {return val._id == elem.id});
    lane.flowNodeRef.push(gwAbre._id);
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "loop") {
    var gwAbre = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
    lane.flowNodeRef.push(gwAbre._id);
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "secuencia") {
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "cierro") {
    var cierra;
    if (elem.sentencia == "and") {
      cierra = _.find(proceso.process.parallelGateway, function(val) {return val._id == elem.id});
      lane.flowNodeRef.push(cierra._id);
    } else if (elem.sentencia == "xor") {
      cierra = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
      lane.flowNodeRef.push(cierra._id);
    } else if (elem.sentencia == "loop") {
      cierra = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
      lane.flowNodeRef.push(cierra._id);
    }
  } else if (elem.tipo == "adjunto") {
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      asociarElementosLanes(obj);
    }
  }
}

//Cuarta iteracion de procesamiento del modelo
//Genero los elementos XML necesarios para los flujos
var procesarFlujos = function(elem) {
  for (var i = 0; i < elem.sig.length; i++) {
    var idFlujo = SequenceFlow_GlobalID++;
    proceso.process.sequenceFlow.push({"_id":idFlujo, "_sourceRef":elem.id, "_targetRef": elem.sig[i]});
    if (elem.tipo == "xor") {
      if (elem.sentencia[i].condicion == "defecto") {
        var gw = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
        gw._default = idFlujo;
      }
    } else if (elem.tipo == "cierro" && elem.tag == "loop") {
      if (elem.sig[i] != elem.ref) {
        var gw = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
        gw._default = idFlujo;
      }
    }
  }
}

function esSerializable(nodo){
  return nodo.tipo in {
    "task" : true, "evento" : true, "and" : true, "xor" : true, "loop" : true, "adjunto" : true, "cierro" : true,
  }
}

var obtenerFlujos = function(modelo) {
  //inicializo variables locales
  var stack =[];
  var nodo;
  stack.push(modelo);
  while (stack.length > 0) {
    nodo = stack.pop();
    if(esSerializable(nodo)){
      procesarFlujos(nodo);
    }
    if(nodo.sentencia instanceof Array){
      for (var i = nodo.sentencia.length-1; i >= 0; i--) {
        stack.push(nodo.sentencia[i]);
      }
    }
  }
  for (var i = 0; i < proceso.process.sequenceFlow.length; i++) {
    if (proceso.process.sequenceFlow[i]._targetRef == 'F') {
      proceso.process.sequenceFlow[i]._targetRef = "EndEvent_1";
    }
  }
}

var conectarStartEvent = function(modelo) {
  var primero = modelo[0];
  var flujoStartEvent = {"_id":SequenceFlow_GlobalID++, "_sourceRef":proceso.process.startEvent._id, "_targetRef": ""};
  if (primero.tipo == "task") {
    var task;
    if (primero.sentencia.task == "service") {
      task = _.find(proceso.process.serviceTask, function(val){ return val._id == primero.id});
    } else if (primero.sentencia.task == "human") {
      task = _.find(proceso.process.userTask, function(val){ return val._id == primero.id});
    }
    flujoStartEvent._targetRef = task._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.sentencia.actor});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "and") {
    var andGW = _.find(proceso.process.parallelGateway, function(val) {return val._id == primero.id});
    flujoStartEvent._targetRef = andGW._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "xor") {
    var xorGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == primero.id});
    flujoStartEvent._targetRef = xorGW._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "loop") {
    var loopGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == primero.id});
    flujoStartEvent._targetRef = loopGW._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (ultimo.tipo == "evento") {
    var evento = _.find(proceso.process.intermediateCatchEvent, function(val){ return val._id == ultimo.id});
    flujoStartEvent._targetRef = evento._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.sentencia.actor});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  }
  proceso.process.sequenceFlow.push(flujoStartEvent);
}

var conectarEndEvent = function(modelo) {
  var ultimo = modelo[modelo.length-1];
  var flujo = {"_id":SequenceFlow_GlobalID++, "_sourceRef":"", "_targetRef": proceso.process.endEvent._id};
  if (ultimo.tipo == "task") {
    var task;
    if (ultimo.sentencia.task == "service") {
      task = _.find(proceso.process.serviceTask, function(val){ return val._id == ultimo.id});
    } else if (ultimo.sentencia.task == "human") {
      task = _.find(proceso.process.userTask, function(val){ return val._id == ultimo.id});
    }
    flujo._sourceRef = task._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == ultimo.sentencia.actor});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  } else if (ultimo.tipo == "evento") {
    var evento = _.find(proceso.process.intermediateCatchEvent, function(val){ return val._id == ultimo.id});
    flujo._sourceRef = evento._id
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == ultimo.sentencia.actor});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  } else if (ultimo.tipo == "cierro") {
    if (ultimo.tag == "and") {
      var andGW = _.find(proceso.process.parallelGateway, function(val) {return val._id == ultimo.id});
      flujo._sourceRef = andGW._id
    } else if (ultimo.tag == "xor") {
      var xorGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == ultimo.id});
      flujo._sourceRef = xorGW._id
    }  else if (ultimo.tag == "loop") {
      var loopGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == ultimo.id});
      flujo._sourceRef = loopGW._id
    }
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == ultimo.lane});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  }
  //TODO revisar si es necesario pushear el flujo
  //flujo._targetRef = proceso.process.endEvent._id;
  //proceso.process.sequenceFlow.push(flujo);
}

var textToModel = function(texto) {
  parser.init(__dirname + '/gramatica2.pegjs');
  var modelo = parser.parse(texto);
  return modelo;
}

var modelToXML = function (modelo) {
  //console.log(pd.json(modelo));
  //Inicializo estructuras
  start();
  //console.log("######### obtenerLanes ####################");
  for (var i=0; i<modelo.sentencia.length; i++) {
    obtenerLanes(modelo.sentencia[i]);
  }
  //console.log("######### obtenerTareas ####################");
  for (var i=0; i<modelo.sentencia.length; i++) {
    obtenerTareas(modelo.sentencia[i]);
  }
  //console.log("######### asociarElementosLanes ####################");
  for (var i=0; i < modelo.sentencia.length; i++) {
    asociarElementosLanes(modelo.sentencia[i]);
  }
  //console.log("######### obtenerFlujos ####################");
  //console.log(modelo.length);
  console.log(pd.json(modelo));
  //for (var i=0; i<modelo.length; i++) {
  //  obtenerFlujos(modelo[i]);
  //}
  obtenerFlujos(modelo);
  //console.log("######### conectarStartEvent ####################");
  conectarStartEvent(modelo.sentencia);
  //console.log("######### conectarEndEvent ####################");
  conectarEndEvent(modelo.sentencia);
  console.log(pd.xml(conv.json2xml_str(proceso)));
  return pd.xml(conv.json2xml_str(proceso));
  //console.log(pd.json(proceso))
}

module.exports = {
  textToModel : textToModel,
  modelToXML : modelToXML
}
