var _ = require("underscore");
var pd = require('pretty-data').pd;
var parser = require("./parser.js");
var x2js = require('x2js');
var subproceso = require('./subproceso');
var env = require('./env');
var fs = require('fs');
var conSubproceso = env.conSubproceso;

var proceso = {
  process : {
    laneSet : {
      lane : []
    },
    startEvent : {},
    userTask : [],
    manualTask : [],
    serviceTask : [],
    exclusiveGateway : [],
    parallelGateway : [],
    intermediateCatchEvent : [],
    intermediateThrowEvent : [],
    boundaryEvent : [],
    endEvent : {},
    subProcess : [],
    sequenceFlow : []
  }
};

var conv = new x2js();
var SequenceFlow_GlobalID = 1;
var path = __dirname;

var options = {
  keysColor: 'blue',
  dashColor: 'white',
  stringColor: 'green'
};

//Inicializo estructuras
var start = function(model) {
  proceso = {
    process : {
      laneSet : {
        lane : []
      },
      startEvent : {},
      userTask : [],
      manualTask : [],
      serviceTask : [],
      exclusiveGateway : [],
      parallelGateway : [],
      intermediateCatchEvent : [],
      intermediateThrowEvent : [],
      boundaryEvent : [],
      endEvent : {},
      subProcess : [],
      sequenceFlow : []
    }
  };
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

function templateEventoTiempoExpresion(eventoTiempo){
  switch (eventoTiempo.unidad) {
    case "segundos":
    case "segundo":
    return "PT"+eventoTiempo.tiempo + "S"
    break;
    case "minutos":
    case "minuto":
    return "PT"+eventoTiempo.tiempo + "M"
    break;
    case "horas":
    case "hora":
    return "PT"+eventoTiempo.tiempo + "H"
    break;
    case "dias":
    case "dia":
    return "P"+eventoTiempo.tiempo + "D"
    break;
    case "semanas":
    case "semana":
    return "P"+eventoTiempo.tiempo + "W"
    break;
    case "meses":
    case "mes":
    return "P"+eventoTiempo.tiempo + "M"
    break;
    case "años":
    case "año":
    return "P"+eventoTiempo.tiempo + "Y"
    break;
    default:
  }
}

var extensionEvento = function(elem, evento) {
  var extensionEvento;
  if (evento.tipo == "timer") {
    extensionEvento = {"timerEventDefinition":{"timeDuration":templateEventoTiempoExpresion(evento)}}
  } else if (evento.tipo == "mensaje") {
    extensionEvento = {"messageEventDefinition":{ "_messageRef":evento.pool}}
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
    } else if (elem.sentencia.task == "manual") {
      var tarea = {"_id":elem.id, "_name":elem.sentencia.accion};
      proceso.process.manualTask.push(tarea);
    } else if (elem.sentencia.task == "subproceso") {
      var subproceso = {"_id":elem.id, "_name":elem.sentencia.accion};
      proceso.process.subProcess.push(subproceso);
    }
  } else if (elem.tipo == "evento") {
    if (elem.sentencia.evento.tipo == "timer") {
      var intermediateCatchEvent = {"_id":elem.id};
      extensionEvento(intermediateCatchEvent, elem.sentencia.evento);
      proceso.process.intermediateCatchEvent.push(intermediateCatchEvent);
    } else if (elem.sentencia.evento.tipo == "mensaje") {
      if (elem.sentencia.evento.throw) {
        var intermediateThrowEvent = {"_id":elem.id};
        extensionEvento(intermediateThrowEvent, elem.sentencia.evento);
        proceso.process.intermediateThrowEvent.push(intermediateThrowEvent);
      } else {
        var intermediateCatchEvent = {"_id":elem.id};
        extensionEvento(intermediateCatchEvent, elem.sentencia.evento);
        proceso.process.intermediateCatchEvent.push(intermediateCatchEvent);
      }
    }
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
    } else if (elem.sentencia == "adjunto") {
      var cierra = {"_id":elem.id};
      proceso.process.exclusiveGateway.push(cierra);
    }
  } else if (elem.tipo == "adjunto") {
    var adjunto = {"_id":elem.id, "_attachedToRef":elem.adjunto_a_id, "_cancelActivity":elem.interrumpible};
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
    } else if (elem.sentencia.task == "manual") {
      task = _.find(proceso.process.manualTask, function(val){ return val._id == elem.id});
    } else if (elem.sentencia.task == "subproceso") {
      task = _.find(proceso.process.subProcess, function(val){ return val._id == elem.id});
    }
    var nodeRef = {"__text":task._id}
    lane.flowNodeRef.push(nodeRef);
  } else if (elem.tipo == "evento") {
    var evento;
    if (elem.sentencia.evento.tipo == "mensaje" && elem.sentencia.evento.throw == true) {
      evento = _.find(proceso.process.intermediateThrowEvent, function(val){ return val._id == elem.id});
    } else {
      evento = _.find(proceso.process.intermediateCatchEvent, function(val){ return val._id == elem.id});
    }
    var nodeRef = {"__text":evento._id}
    lane.flowNodeRef.push(nodeRef);
  } else if (elem.tipo == "xor") {
    var gwAbre = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
    var nodeRef = {"__text":gwAbre._id}
    lane.flowNodeRef.push(nodeRef);
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "and") {
    var gwAbre = _.find(proceso.process.parallelGateway, function(val) {return val._id == elem.id});
    var nodeRef = {"__text":gwAbre._id}
    lane.flowNodeRef.push(nodeRef);
    for (var i=0; i < elem.sentencia.length; i++) {
      asociarElementosLanes(elem.sentencia[i]);
    }
  } else if (elem.tipo == "loop") {
    var gwAbre = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
    var nodeRef = {"__text":gwAbre._id}
    lane.flowNodeRef.push(nodeRef);
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
      var nodeRef = {"__text":cierra._id}
      lane.flowNodeRef.push(nodeRef);
    } else if (elem.sentencia == "xor") {
      cierra = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
      var nodeRef = {"__text":cierra._id}
      lane.flowNodeRef.push(nodeRef);
    } else if (elem.sentencia == "loop") {
      cierra = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
      var nodeRef = {"__text":cierra._id}
      lane.flowNodeRef.push(nodeRef);
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
    if (elem.sig[i] != "F") {
      var idFlujo = elem.id + "_" + elem.sig[i];
      var flujo = {"_id":idFlujo, "_sourceRef":elem.id, "_targetRef": elem.sig[i]};
      if (elem.tipo == "xor") {
        if (elem.sentencia[i].condicion == "defecto") {
          var gw = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
          gw._default = idFlujo;
        } else {
          flujo._name = elem.sentencia[i].condicion;
        }
      } else if (elem.tipo == "cierro" && elem.tag == "loop") {
        if (elem.sig[i] != elem.ref) {
          var gw = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == elem.id});
          gw._default = idFlujo;
        }
      }
      proceso.process.sequenceFlow.push(flujo);
    }
  }
}

function esSerializable(nodo){
  return nodo.tipo in {
    "task" : true, "evento" : true, "and" : true, "xor" : true, "loop" : true, "adjunto" : true, "cierro" : true,
  }
}

var generarFlujos = function(modelo) {
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
  var flujoStartEvent = {"_id":"", "_sourceRef":proceso.process.startEvent._id, "_targetRef": ""};
  if (primero.tipo == "task") {
    var task;
    if (primero.sentencia.task == "service") {
      task = _.find(proceso.process.serviceTask, function(val){ return val._id == primero.id});
    } else if (primero.sentencia.task == "human") {
      task = _.find(proceso.process.userTask, function(val){ return val._id == primero.id});
    } else if (primero.sentencia.task == "manual") {
      task = _.find(proceso.process.manualTask, function(val){ return val._id == primero.id});
    } else if (primero.sentencia.task == "subproceso") {
      task = _.find(proceso.process.subProcess, function(val){ return val._id == primero.id});
    }
    flujoStartEvent._id = proceso.process.startEvent._id + "_" + task._id;
    flujoStartEvent._targetRef = task._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.sentencia.actor});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "and") {
    var andGW = _.find(proceso.process.parallelGateway, function(val) {return val._id == primero.id});
    flujoStartEvent._id = proceso.process.startEvent._id + "_" + andGW._id;
    flujoStartEvent._targetRef = andGW._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "xor") {
    var xorGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == primero.id});
    flujoStartEvent._id = proceso.process.startEvent._id + "_" + xorGW._id;
    flujoStartEvent._targetRef = xorGW._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (primero.tipo == "loop") {
    var loopGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == primero.id});
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.lane});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  } else if (ultimo.tipo == "evento") {
    var evento = _.find(proceso.process.intermediateCatchEvent, function(val){ return val._id == ultimo.id});
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == primero.sentencia.actor});
    lane.flowNodeRef.push({"__text":"StartEvent_1"});
  }
  proceso.process.sequenceFlow.push(flujoStartEvent);
}

var conectarEndEvent = function(modelo) {
  var ultimo = modelo[modelo.length-1];
  var flujo = {"_id":"", "_sourceRef":"", "_targetRef": proceso.process.endEvent._id};
  if (ultimo.tipo == "task") {
    var task;
    if (ultimo.sentencia.task == "service") {
      task = _.find(proceso.process.serviceTask, function(val){ return val._id == ultimo.id});
    } else if (ultimo.sentencia.task == "human") {
      task = _.find(proceso.process.userTask, function(val){ return val._id == ultimo.id});
    } else if (ultimo.sentencia.task == "manual") {
      task = _.find(proceso.process.manualTask, function(val){ return val._id == ultimo.id});
    } else if (ultimo.sentencia.task == "subproceso") {
      task = _.find(proceso.process.subProcess, function(val){ return val._id == ultimo.id});
    }
    flujo._id = task._id + "_EndEvent_1"
    flujo._sourceRef = task._id;
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == ultimo.sentencia.actor});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  } else if (ultimo.tipo == "evento") {
    var evento;
    if (ultimo.sentencia.evento.throw) {
      evento = _.find(proceso.process.intermediateThrowEvent, function(val){ return val._id == ultimo.id});
    } else {
      evento = _.find(proceso.process.intermediateCatchEvent, function(val){ return val._id == ultimo.id});
    }
    flujo._id = evento._id + "_EndEvent_1"
    flujo._sourceRef = evento._id
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == ultimo.sentencia.actor});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  } else if (ultimo.tipo == "cierro") {
    if (ultimo.tag == "and") {
      var andGW = _.find(proceso.process.parallelGateway, function(val) {return val._id == ultimo.id});
      flujo._id = andGW._id + "_EndEvent_1"
      flujo._sourceRef = andGW._id
    } else if (ultimo.tag == "xor") {
      var xorGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == ultimo.id});
      flujo._id = xorGW._id + "_EndEvent_1"
      flujo._sourceRef = xorGW._id
    } else if (ultimo.tag == "loop") {
      var loopGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == ultimo.id});
      flujo._id = loopGW._id + "_EndEvent_1"
      flujo._sourceRef = loopGW._id
    } else if (ultimo.tag == "adjunto") {
      var xorGW = _.find(proceso.process.exclusiveGateway, function(val) {return val._id == ultimo.id});
      flujo._id = xorGW._id + "_EndEvent_1"
      flujo._sourceRef = xorGW._id
    }
    var lane = _.find(proceso.process.laneSet.lane, function(val){return val._name == ultimo.lane});
    lane.flowNodeRef.push({"__text":"EndEvent_1"});
  }
  proceso.process.sequenceFlow.push(flujo);
}

var agregarSubprocesos = function(modelo, proceso) {
  for (var i=0; i<modelo.sentencia.length; i++) {
    var elem = modelo.sentencia[i];
    if (elem.tipo == "task" && elem.sentencia.task == "subproceso" && conSubproceso) {
      var subProcessPos = 0;
      for (var i=0; i< proceso.process.subProcess.length; i++) {
        if (proceso.process.subProcess[i]._id == elem.id) {
          subProcessPos = i;
        }
      }
      templateSubproceso(elem, subProcessPos, false);
    }
  }
}

function agregarTemplates(proceso, nombreProceso){
  //FIXME revisar los campos que son asignados estaticamente
  var bpmn = {};
  var idProceso = "id_" + nombreProceso;
  bpmn.definitions = {
    "_xmlns" : "http://www.omg.org/spec/BPMN/20100524/MODEL",
    "_xmlns:bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
    "_xmlns:dc": "http://www.omg.org/spec/DD/20100524/DC",
    "_xmlns:di": "http://www.omg.org/spec/DD/20100524/DI",
    "_xmlns:activiti": "http://activiti.org/bpmn",
    "_xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
    "_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "_expressionLanguage":"http://www.w3.org/1999/XPath",
    "_targetNamespace":"http://sourceforge.net/bpmn/definitions/_1459655886338",
  }
  bpmn.definitions["collaboration"] = []
  var idPool = "pool_" + idProceso;
  bpmn.definitions.collaboration.push({"participant":{"_id":idPool, "_name":"PoolProcess", "_processRef":idProceso}});

  bpmn.definitions.process = proceso.process;
  bpmn.definitions.process._id = idProceso;
  bpmn.definitions.process._isExecutable = true;
  bpmn.definitions.process._name = nombreProceso;
  return bpmn;
}

var agregarTemplateElementos = function(elem) {

  if (elem.tipo == "task" && elem.sentencia.task == "human") {
    var taskPos = 0;
    for (var i=0; i< proceso.process.userTask.length; i++) {
      if (proceso.process.userTask[i]._id == "_"+elem.id) {
        taskPos = i;
      }
    }
    templateCampos(elem, taskPos);
  } else if (elem.tipo == "task" && elem.sentencia.task == "service") {
      var taskPos = 0;
      for (var i=0; i< proceso.process.serviceTask.length; i++) {
        if (proceso.process.serviceTask[i]._id == "_"+elem.id) {
          taskPos = i;
        }
      }
      templateServiceTask(elem, taskPos);
  } else if (elem.tipo == "task" && elem.sentencia.task == "manual") {
      var taskPos = 0;
      for (var i=0; i< proceso.process.manualTask.length; i++) {
        if (proceso.process.manualTask[i]._id == "_"+elem.id) {
          taskPos = i;
        }
      }
      //FIXME hay que ver si agregan algo para ejecutarla
  } else if (elem.tipo == "task" && elem.sentencia.task == "subproceso" && conSubproceso) {
    var subProcessPos = 0;
    for (var i=0; i< proceso.process.subProcess.length; i++) {
      if (proceso.process.subProcess[i]._id == "_"+elem.id) {
        subProcessPos = i;
      }
    }
    templateSubproceso(elem, subProcessPos, true);
  } else if (elem.tipo == "evento") {
    if (elem.sentencia.evento.tipo == "mensaje") {
      if (elem.sentencia.evento.throw) {
        for (var i=0; i< proceso.process.intermediateThrowEvent.length; i++) {
          if (proceso.process.intermediateThrowEvent[i]._id == "_"+elem.id ) {
            eventPos = i;
            break;
          }
        }
        agregarTemplatesEventoMensajeThrow(elem, eventPos);
      } else {
        for (var i=0; i< proceso.process.intermediateCatchEvent.length; i++) {
          if (proceso.process.intermediateCatchEvent[i]._id == "_"+elem.id ) {
            eventPos = i;
            break;
          }
        }
        agregarTemplatesEventoMensajeCatch(elem, eventPos);
      }
    }
  } else if (elem.tipo == "xor") {
    templateExpresiones(elem);
    for (var i=0; i < elem.sentencia.length; i++) {
      agregarTemplateElementos(elem.sentencia[i]);
    }
  } else if (elem.tipo == "and") {
    for (var i=0; i < elem.sentencia.length; i++) {
      agregarTemplateElementos(elem.sentencia[i]);
    }
  } else if (elem.tipo == "loop") {
    for (var i = 0; i < elem.sentencia.length; i++) {
      agregarTemplateElementos(elem.sentencia[i])
    }
  } else if (elem.tipo == "secuencia") {
    for (var i=0; i < elem.sentencia.length; i++) {
      agregarTemplateElementos(elem.sentencia[i]);
    }
  } else if (elem.tipo == "cierro") {
  } else if (elem.tipo == "adjunto") {
    for (var i=0; i < elem.sentencia.length; i++) {
      agregarTemplateElementos(elem.sentencia[i]);
    }
  }
}

var agregarTemplatesEventoMensajeThrow = function(elem, eventPos) {
  var mailTask = {"serviceTask":{"_id":"_"+elem.id, "_name":"mensaje para "+ elem.sentencia.evento.pool, "_activiti:type":"mail"}};
  mailTask.serviceTask['extensionElements'] = {
    'activiti:field':[
      {"_name": "to","activiti:string": "proyectotbpm@gmail.com"},
      {"_name": "subject","activiti:string": mailTask.serviceTask._name},
      {"_name": "html","activiti:string": "Se ejecuto el evento."}
    ]
  }
  if (!proceso.process.serviceTask) {
    proceso.process.serviceTask = [];
  }
  proceso.process.serviceTask.push(mailTask.serviceTask);
  proceso.process.intermediateThrowEvent.splice(eventPos,1);
  if (proceso.process.intermediateThrowEvent.length == 0) {
    console.log("BORRE EL ULTIMO")
    delete proceso.process.intermediateThrowEvent;
  }
}

var agregarTemplatesEventoMensajeCatch = function(elem, eventPos) {
  var task = {"userTask":{"_id":"_"+elem.id, "_name":"espero mensaje de "+ elem.sentencia.evento.pool}};
  if (!proceso.process.userTask) {
    proceso.process.userTask = [];
  }
  proceso.process.userTask.push(task.userTask);
  proceso.process.intermediateCatchEvent.splice(eventPos,1);
  if (proceso.process.intermediateCatchEvent.length == 0) {
    console.log("BORRE EL ULTIMO");
    delete proceso.process.intermediateThrowEvent;
  }
}

var templateCampos = function(nodo, taskPos) {
  if(nodo.sentencia.campos){
    aux = {"userTask":{"_id":"_"+nodo.id , "_name":nodo.sentencia.accion, "_activiti:candidateGroups":nodo.sentencia.actor}}
    aux.userTask['extensionElements'] = {
      'formProperty' : []
    }
    for (var i = 0; i < nodo.sentencia.campos.length; i++) {
      var campo = nodo.sentencia.campos[i];
      var formProperty = {"__prefix":"activiti", "_id":campo.nombre, "_name":campo.nombre, "_type":campo.tipo, "_required":campo.obligatorio};
      aux.userTask.extensionElements.formProperty.push(formProperty);
    }
    proceso.process.userTask[taskPos] = aux.userTask;
  }
}

var templateServiceTask = function(elem, taskPos) {
  //FIXME si se quisiera cambiar la implementacion del web service hay que cambiar el nombre de la clase
  var nombreClaseJava = "ImplementacionWebService";
  aux = {"serviceTask":{"_id":"_"+elem.id , "_name":elem.sentencia.accion, "_activiti:class":"org.activiti." + nombreClaseJava}}
  proceso.process.serviceTask[taskPos] = aux.serviceTask;
}

var templateExpresiones = function(nodo) {
  //FIXME aca es donde se deberia generar la tarea de usuario
  //donde se decide que flujo de salida se debe tomar en el XOR
  for (var i=0; i < nodo.sentencia.length; i++) {
    if (nodo.sentencia[i].condicion != "defecto") {
      var condicion = nodo.sentencia[i];
      var flujo;
      for (var j=0; j< proceso.process.sequenceFlow.length; j++) {
        flujo = proceso.process.sequenceFlow[j];
        if (flujo._name && flujo._name == condicion.condicion) {
          var condicion = "${"+condicion.expresion+"}"
          var conditionExpression = {"_xsi:type":"tFormalExpression","__cdata":condicion};
          flujo.conditionExpression = conditionExpression;
          proceso.process.sequenceFlow[j] = flujo;
        }
      }
    }
  }
}

var templateSubproceso = function(elem, subProcessPos, ejecutable) {
  var xmlSubProceso = obtenerxmlSubProceso(elem.sentencia.accion, ejecutable);
  var jsonSubProceso = conv.xml_str2json(xmlSubProceso);
  jsonSubProceso.definitions.process = ajustarIDs(jsonSubProceso.definitions.process,elem.sentencia.accion)
  var auxSubProceso = {"subprocess":{"_id":"_"+elem.id,"_name":elem.sentencia.accion}};
  auxSubProceso.subprocess.startEvent = jsonSubProceso.definitions.process.startEvent;
  auxSubProceso.subprocess.endEvent = jsonSubProceso.definitions.process.endEvent;
  if (jsonSubProceso.definitions.process.userTask && jsonSubProceso.definitions.process.userTask.length > 0) {
     auxSubProceso.subprocess.userTask = jsonSubProceso.definitions.process.userTask;
  }
  if (jsonSubProceso.definitions.process.serviceTask && jsonSubProceso.definitions.process.serviceTask.length > 0) {
     auxSubProceso.subprocess.serviceTask = jsonSubProceso.definitions.process.serviceTask;
  }
  if (jsonSubProceso.definitions.process.manualTask && jsonSubProceso.definitions.process.manualTask.length > 0) {
     auxSubProceso.subprocess.manualTask = jsonSubProceso.definitions.process.manualTask;
  }
  if (jsonSubProceso.definitions.process.exclusiveGateway && jsonSubProceso.definitions.process.exclusiveGateway.length > 0) {
     auxSubProceso.subprocess.exclusiveGateway = jsonSubProceso.definitions.process.exclusiveGateway;
  }
  if (jsonSubProceso.definitions.process.parallelGateway && jsonSubProceso.definitions.process.parallelGateway.length > 0) {
     auxSubProceso.subprocess.parallelGateway = jsonSubProceso.definitions.process.parallelGateway;
  }
  if (jsonSubProceso.definitions.process.intermediateCatchEvent && jsonSubProceso.definitions.process.intermediateCatchEvent.length > 0) {
     auxSubProceso.subprocess.intermediateCatchEvent = jsonSubProceso.definitions.process.intermediateCatchEvent;
  }
  if (jsonSubProceso.definitions.process.intermediateThrowEvent && jsonSubProceso.definitions.process.intermediateThrowEvent.length > 0) {
     auxSubProceso.subprocess.intermediateThrowEvent = jsonSubProceso.definitions.process.intermediateThrowEvent;
  }
  if (jsonSubProceso.definitions.process.boundaryEvent && jsonSubProceso.definitions.process.boundaryEvent.length > 0) {
     auxSubProceso.subprocess.boundaryEvent = jsonSubProceso.definitions.process.boundaryEvent;
  }
  if (jsonSubProceso.definitions.process.subProcess && jsonSubProceso.definitions.process.subProcess.length > 0) {
     auxSubProceso.subprocess.subProcess = jsonSubProceso.definitions.process.subProcess;
  }
  if (jsonSubProceso.definitions.process.sequenceFlow && jsonSubProceso.definitions.process.sequenceFlow.length > 0) {
     auxSubProceso.subprocess.sequenceFlow = jsonSubProceso.definitions.process.sequenceFlow;
  }
  proceso.process.subProcess[subProcessPos] = auxSubProceso.subprocess;
}

var obtenerxmlSubProceso = function(nombreArchivo, ejecutable) {
  var archivo = path;
  if (ejecutable) {
    archivo = archivo + "/XMLejecutables/" + nombreArchivo + ".bpmn";
  } else {
    archivo = archivo + "/XMLbasicos/" + nombreArchivo + ".bpmn";
  }
  var subproceso = fs.readFileSync(archivo).toString();
  return subproceso;
}

var ajustarIDs = function(proceso, subproceso) {
  var prefix;
  if (subproceso == "") {
    prefix = "_";
  } else {
    prefix = subproceso;
  }
  proceso.startEvent._id = prefix + proceso.startEvent._id;
  proceso.endEvent._id = prefix + proceso.endEvent._id;
  // LANES
  if (subproceso == "") {
    for (var i=0; i< proceso.laneSet.lane.length; i++) {
      for (var j=0; j< proceso.laneSet.lane[i].flowNodeRef.length; j++) {
        proceso.laneSet.lane[i].flowNodeRef[j].__text = prefix + proceso.laneSet.lane[i].flowNodeRef[j].__text
      }
    }
  }
  // USER TASKS
  if (proceso.userTask) {
    for (var i=0; i< proceso.userTask.length; i++) {
      proceso.userTask[i]._id = prefix + proceso.userTask[i]._id;
    }
  }
  // SERVICE TASKS
  if (proceso.serviceTask) {
    for (var i=0; i< proceso.serviceTask.length; i++) {
      proceso.serviceTask[i]._id = prefix + proceso.serviceTask[i]._id;
    }
  }
  // MANUAL TASKS
  if (proceso.manualTask) {
    for (var i=0; i< proceso.manualTask.length; i++) {
      proceso.manualTask[i]._id = prefix + proceso.manualTask[i]._id;
    }
  }
  // EXCLUSIVE GATEWAYS
  if (proceso.exclusiveGateway) {
    for (var i=0; i< proceso.exclusiveGateway.length; i++) {
      proceso.exclusiveGateway[i]._id = prefix + proceso.exclusiveGateway[i]._id;
    }
  }
  // PARALLEL GATEWAYS
  if (proceso.parallelGateway) {
    for (var i=0; i< proceso.parallelGateway.length; i++) {
      proceso.parallelGateway[i]._id = prefix + proceso.parallelGateway[i]._id;
    }
  }
  // INTERMEDIATE CATCH EVENTS
  if (proceso.intermediateCatchEvent) {
    for (var i=0; i< proceso.intermediateCatchEvent.length; i++) {
      proceso.intermediateCatchEvent[i]._id = prefix + proceso.intermediateCatchEvent[i]._id;
    }
  }
  // INTERMEDIATE THROW EVENTS
  if (proceso.intermediateThrowEvent) {
    for (var i=0; i< proceso.intermediateThrowEvent.length; i++) {
      proceso.intermediateThrowEvent[i]._id = prefix + proceso.intermediateThrowEvent[i]._id;
    }
  }
  // BOUNDARY EVENTS
  if (proceso.boundaryEvent) {
    for (var i=0; i< proceso.boundaryEvent.length; i++) {
      proceso.boundaryEvent[i]._id = prefix + proceso.boundaryEvent[i]._id;
      proceso.boundaryEvent[i]._attachedToRef = prefix + proceso.boundaryEvent[i]._attachedToRef;
    }
  }
  // SUBPROCESS
  if (proceso.subProcess) {
    for (var i=0; i< proceso.subProcess.length; i++) {
      proceso.subProcess[i]._id = prefix + proceso.subProcess[i]._id;
    }
  }
  // SEQUENCE FLOWS
  if (proceso.sequenceFlow) {
    for (var i=0; i< proceso.sequenceFlow.length; i++) {
      proceso.sequenceFlow[i]._id = prefix + proceso.sequenceFlow[i]._id;
      proceso.sequenceFlow[i]._sourceRef = prefix + proceso.sequenceFlow[i]._sourceRef;
      proceso.sequenceFlow[i]._targetRef = prefix + proceso.sequenceFlow[i]._targetRef;
    }
  }
  return proceso;
}

var limpiarProceso = function(proceso) {
  if (proceso.process.userTask.length == 0) {
    delete(proceso.process.userTask);
  }
  if (proceso.process.manualTask.length == 0) {
    delete(proceso.process.manualTask);
  }
  if (proceso.process.serviceTask.length == 0) {
    delete(proceso.process.serviceTask);
  }
  if (proceso.process.exclusiveGateway.length == 0) {
    delete(proceso.process.exclusiveGateway);
  }
  if (proceso.process.parallelGateway.length == 0) {
    delete(proceso.process.parallelGateway);
  }
  if (proceso.process.intermediateCatchEvent.length == 0) {
    delete(proceso.process.intermediateCatchEvent);
  }
  if (proceso.process.intermediateThrowEvent.length == 0) {
    delete(proceso.process.intermediateThrowEvent);
  }
  if (proceso.process.boundaryEvent.length == 0) {
    delete(proceso.process.boundaryEvent);
  }
  if (proceso.process.subProcess.length == 0) {
    delete(proceso.process.subProcess);
  }

  return proceso;
}

var textToModel = function(texto) {
  parser.init(__dirname + '/gramatica2.pegjs');
  var modelo = parser.parse(texto);
  return modelo;
}

var modelToXML = function (modelo, nombreProceso) {
  start();
  for (var i=0; i<modelo.sentencia.length; i++) {
    obtenerLanes(modelo.sentencia[i]);
  }
  for (var i=0; i<modelo.sentencia.length; i++) {
    obtenerTareas(modelo.sentencia[i]);
  }
  for (var i=0; i < modelo.sentencia.length; i++) {
    asociarElementosLanes(modelo.sentencia[i]);
  }
  generarFlujos(modelo);
  conectarStartEvent(modelo.sentencia);
  conectarEndEvent(modelo.sentencia);
  agregarSubprocesos(modelo, proceso);
  proceso = limpiarProceso(proceso);
  proceso.process = ajustarIDs(proceso.process, "");
  var bpmn = agregarTemplates(proceso, nombreProceso);
  bpmn = conv.json2xml_str(bpmn);
  var path = __dirname + "/XMLbasicos/";
  var nombreArchivo = nombreProceso + ".bpmn";
  fs.writeFileSync(path + nombreArchivo, pd.xml(bpmn));
  generarXMLejecutable(modelo, proceso, nombreProceso);
  //console.log("############################# XML basico ###########################")
  //console.log(pd.xml(bpmn));
  //console.log("####################################################################")
  return pd.xml(bpmn);
}

var generarXMLejecutable = function(modelo, proceso, nombreProceso){
  for (var i=0; i<modelo.sentencia.length; i++) {
    agregarTemplateElementos(modelo.sentencia[i]);
  }
  var bpmn = agregarTemplates(proceso, nombreProceso);
  bpmn = conv.json2xml_str(bpmn);
  var path = __dirname + "/XMLejecutables/";
  var nombreArchivo = nombreProceso + ".bpmn";
  fs.writeFileSync(path + nombreArchivo, pd.xml(bpmn));
  //console.log("############################# XML ejecutable ###########################")
  //console.log(pd.xml(bpmn));
  //console.log("########################################################################")
}

var xml2json = function(bpmn){
  var procesoJSON = conv.xml_str2json(bpmn);
  return pd.json(procesoJSON);
}

module.exports = {
  textToModel : textToModel,
  modelToXML : modelToXML,
  generarXMLejecutable : generarXMLejecutable,
  xml2json : xml2json,
}
