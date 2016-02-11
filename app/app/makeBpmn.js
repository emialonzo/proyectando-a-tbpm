var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");
var pd = require('pretty-data').pd;
var toDot = require('./makeDot').toDot;
var intermedio = require('./modeloIntermedio');

var gramatica = null;
var parser = null;

var globalId = 1;
var Task_globalID = 1;
var SequenceFlow_GlobalID = 1;
var ParallelGateway_GlobalID = 1;
var ExclusiveGateway_GlobalID = 1;
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

var globalId=9000;

function procesar_nivel(lista){
  var ret = [];
  while (lista.length > 0) {
    var elem = lista.shift();
    console.info("***************");
    console.info("Elem:"+JSON.stringify(elem));
    console.log("TIPO:"+elem.tipo );
    if((!_.isUndefined(elem.tipo)) && (elem.tipo == "task")){
      console.log("---->task");
    } else if((!_.isUndefined(elem.tipo)) && (elem.tipo == "cierro")){
      console.log("!!!compuerta de cerrar");
    }
    else {
      console.log("----->no task:"+ elem.tipo);
      var aux = elem.sentencia;
      if(aux instanceof Array){
        var aux_elem = cierro(elem.tipo);
        aux.push(aux_elem);
        Array.prototype.unshift.apply(lista, aux);
      }else{
        lista.unshift(aux);
      }
    }
    ret.push(elem);
    console.info("***************");
  }
  return ret;
}

var makeBpmn = function(model){
  console.info("Crearndo modelo BPMN a partir de una instancia del modelo intermedio.");

  model = intermedio.asignarId(model.sentencia);
  model = intermedio.balancearModelo(model);
  // console.log(pd.json(model));
  aux = {};
  aux.tipo = "secuencia";
  aux.sentencia = model;
  aux.id = 9999;
  // model = recursivoFlujo(aux, "S", "F");
  model = intermedio.asignarFlujo(aux);
  return model;
}

const task = "TASK";

var init = function(path){
  path = path || __dirname + '/gramatica.pegjs';
  gramatica = fs.readFileSync(path).toString();
  parser = PEG.buildParser(gramatica);
}

var getActors = function(model){
  return _.uniq(_.map(_.flatten(model), function(elem){ return elem.actor; }));
}

// Obtengo los actores de cada tarea para ir armando los lanes
var obtenerLanes = function(elem) {
  if (elem.tipo == "task") {
    if (_.find(proceso.laneSet.lane, function(val){ return val._name == elem.sentencia.actor}) == null) {
      proceso.laneSet.lane.push(
        {"flowNodeRef": [],"_id" : "Lane_"+elem.sentencia.actor,
         "_name": elem.sentencia.actor,"__prefix":"bpmn"});
    }
  } else if (elem.tipo == "condicion") {
    if (_.find(proceso.laneSet.lane, function(val){ return val._name == elem.sentencia.sentencia.actor}) == null) {
      proceso.laneSet.lane.push(
        {"flowNodeRef": [],"_id" : "Lane_"+elem.sentencia.sentencia.actor,
         "_name": elem.sentencia.sentencia.actor,"__prefix":"bpmn"});
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
    //TODO ver de donde sacar el lane para meterlo
    //var lane = _.find(proceso.laneSet.lane, function(val){return val._name == });
    var id = elem.id;
    var abre = {"incoming":{},"outgoing":[],"_id":"ExclusiveGateway_"+id, "_default":"","__prefix":"bpmn"};
    var nodo = {"__prefix":"bpmn","__text":"ExclusiveGateway_"+id};
    //lane.flowNodeRef.push(nodo);
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
    var cierra = {"incoming":[],"outgoing":{},"_id":"ExclusiveGateway_"+id, "__prefix":"bpmn"};
    var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
    cierra.outgoing = flujo;
    proceso.sequenceFlow.push({"_id":flujo.__text,"_sourceRef":cierra._id, "_targetRef":"","__prefix":"bpmn"});
    var nodo = {"__prefix":"bpmn","__text":"ExclusiveGateway_"+id};
    //lane.flowNodeRef.push(nodo);
    proceso.exclusiveGateway.push(cierra);
  } else if (elem.tipo == "and") {
    //TODO ver de donde sacar el lane para meterlo
    //var lane = _.find(proceso.laneSet.lane, function(val){return val._name == });
    var id = elem.id;
    var abre = {"incoming":{}, "outgoing":[],"_id":"ParallelGateway_"+id, "__prefix":"bpmn" };
    var nodo = {"__prefix":"bpmn","__text":"ParallelGateway_"+id};
    //lane.flowNodeRef.push(nodo);
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
    var cierra = {"incoming":[], "outgoing":{},"_id":"ParallelGateway_"+id, "__prefix":"bpmn" };
    var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
    cierra.outgoing = flujo;
    proceso.sequenceFlow.push({"_id":flujo.__text,"_sourceRef":cierra._id, "_targetRef":"","__prefix":"bpmn"});
    var nodo = {"__prefix":"bpmn","__text":"ParallelGateway_"+id};
    //lane.flowNodeRef.push(nodo);
    proceso.parallelGateway.push(cierra);
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
  }
}

// recorro el modelo nuevamente para construir el flujo del proceso
var generarFlujo = function(anterior, elem) {
  var flujoAnterior = obtenerFlujo(anterior);
  if (elem.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
    flujoAnterior._targetRef = task._id;
    task.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
  } else if (elem.tipo == "and") {
    var id = elem.id;
    var abreGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    id = id + 1;
    var cierraGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    flujoAnterior._targetRef = abreGW._id;
    abreGW.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
    generarFlujoAND(abreGW, cierraGW, elem.sentencia);
  } else if (elem.tipo == "xor") {
    var id = elem.id;
    var abreGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    id = id + 1;
    var cierraGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujoAnterior._targetRef = abreGW._id;
    abreGW.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
    generarFlujoXOR(abreGW, cierraGW, elem.sentencia, abreGW._default);
  } else if (elem.tipo == "loop") {
    // aca se manejaria parecido a la compuerta XOR
    // solo que cambian los flujos de entrada y salida de las compuertas
  }
}

var generarFlujoAND = function(gwAbre, gwCierra, modelo) {
  for (var i = 0; i< modelo.length; i++) {
    var elem = modelo [i];
    var flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwAbre.outgoing[i].__text});
    console.log("Elem --->\n" + prettyjson.render(elem));
    if (elem.tipo == "task") {
      var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
      flujo._targetRef = task._id;
      task.incoming = {"__prefix":"bpmn", "__text":flujo._id};
      console.log("Flujo -->\n" + prettyjson.render(flujo));
      console.log("Task --->\n" + prettyjson.render(task));
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
  console.log("GW Abre -->\n"+prettyjson.render(gwAbre));
  console.log("GW Cierra -->\n"+prettyjson.render(gwCierra));
  console.log("Modelo -->\n"+prettyjson.render(modelo));
  console.log("Defecto -->\n"+prettyjson.render(flujoDefecto));
  for (var i = 0; i< modelo.length; i++) {
    var elem = modelo [i];
    var flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwAbre.outgoing[i].__text});
    console.log("Elem --->\n" + prettyjson.render(elem));
    if (elem.tipo == "condicion") {
      var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.sentencia.id});
      flujo._targetRef = task._id;
      task.incoming = {"__prefix":"bpmn", "__text":flujo._id};
      console.log("Flujo -->\n" + prettyjson.render(flujo));
      console.log("Task --->\n" + prettyjson.render(task));
      gwCierra.incoming.push(task.outgoing);
      var flujoTask = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text})
      flujoTask._targetRef = gwCierra._id
    } else if(elem.tipo == "and") {

    } else if(elem.tipo == "xor") {

    } else if(elem.tipo == "loop") {

    } else if(elem.tipo == "sentencia") {

    }

  }
}


var conectarStartEvent = function(modelo) {
  var primero = modelo[0];
  var lane = null;
  var flujoStartEvent = _.find(proceso.sequenceFlow, function(val){return val._id == proceso.startEvent.outgoing.__text});
  if (primero.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+primero.id});
    task.incoming = {"__prefix":"bpmn", "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = task._id;
    //TODO arreglar esto, falta ver bien el lane del primer elemento
    //lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.sentencia.actor});
  } else if (primero.tipo == "and") {
    var andGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+primero.id});
    andGW.incoming = {"__prefix":"bpmn", "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = andGW._id;
    //TODO
    //lane = _.find(proceso.laneSet.lane, function(val){return val._name == });
  } else if (primero.tipo == "xor") {
    var xorGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+primero.id});
    xorGW.incoming = {"__prefix":"bpmn", "__text":flujoStartEvent._id};
    flujoStartEvent._targetRef = xorGW._id;
    //TODO
    //lane = _.find(proceso.laneSet.lane, function(val){return val._name == });
  } else if (primero.tipo == "loop") {
    //TODO falta agregar la conexion para el caso del loop
  }
  //TODO falta encontrar el lane para el caso que sea una compuerta
  //lane.flowNodeRef.push({"__prefix":"bpmn","__text":"StartEvent_1"});
}

var conectarEndEvent = function(modelo) {
  var ultimo = modelo[modelo.length-1];
  var flujo = null;
  if (ultimo.tipo == "task") {
    var task = _.find(proceso.task, function(val){ return val._id == "Task_"+ultimo.id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text});
    proceso.endEvent.incoming = {"__prefix":"bpmn", "__text":flujo._id};
  } else if (ultimo.tipo == "and") {
    var id = ultimo.id + 1;
    var andGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == andGW.outgoing.__text});
  } else if (ultimo.tipo == "xor") {
    var id = ultimo.id + 1;
    var xorGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
    flujo = _.find(proceso.sequenceFlow, function(val){return val._id == xorGW.outgoing.__text});
  } else if (ultimo.tipo == "loop") {
    //TODO falta agregar la conexion para el caso del loop
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

var makeBpmn = function(model){
  // bpmn.laneset = [];
  // for(var i=0; i < model.length; i++){
  //   var elem = model[i];
  // }
  // return bpmn;
  return recursivoBalance(recursivoAgregarId(model));

}

          module.exports = {
            init : init,
            makeBpmn : makeBpmn,
            getActors : getActors,
            procesar:procesar_nivel,
            start : start,
            obtenerLanes : obtenerLanes,
            obtenerTareas : obtenerTareas,
            proceso : proceso,
            generarFlujo : generarFlujo,
            conectarEndEvent : conectarEndEvent,
            toDot : toDot,
            conectarStartEvent : conectarStartEvent,
          }
