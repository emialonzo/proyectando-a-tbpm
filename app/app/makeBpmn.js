var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");

var gramatica = null;
var parser = null;
var globalId = 1;
var bpmn = {};
var proceso = {
  laneSet : {
    lane : []
  },
  startEvent : {},
  task : [],
  exclusiveGateway : [],
  parallelGateway : [],
  sequenceFlow : [],
  endEvent : {}
};
var isPrimeraTarea = true;

var filtroXOR = function (memo, elem){
  console.log("*****************************");
  console.log(elem);
  var list = [];

  if((!_.isUndefined(elem.tipo)) && (elem.tipo == "xor")){
    console.error("ES xor");
    var cierroXor = {
      "tipo": "CierroXOR"
    };
    console.log("elem.sentencia:" + JSON.stringify(elem.sentencia));
    // list = _.union([elem], filtroXOR([], elem.sentencia), [cierroXor]);

  }
  else if (!_.isUndefined(elem.condicion)) {
    console.info("condicion");
    list.push(filtroXOR(memo , elem.sentencia));
  }
  else {
    console.info("NO es xor, es: " + elem.tipo);
    list.push(elem);
  }
  return _.union(memo, list);
}

function agregarId(modelo){

};

var cierro = function (tag){
  return {
    "tipo": "cierro",
    "sentencia" : "Nodo para balanceo de compuertas.",
    "tag": tag,
    "id": globalId++
  }
}
var cierrogw = function (elem){
  return {
    "tipo": "cierro",
    "sentencia" : "Nodo para balanceo de compuertas.",
    "tag": elem.tipo,
    "ref": elem.id,
    "id": globalId++
  }
}


// noList();


function iterarModelo(modelo, funcionProcesarNodo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.id = globalId++;
    console.log("--->" , globalId , " " , JSON.stringify(elem) );
    if(elem.sentencia instanceof Array){
      elem.sentencia = recursivoAgregarId(elem.sentencia);
    }else if (elem.tipo != "task") {
      elem.sentencia = recursivoAgregarId([elem.sentencia]).pop();
    }
    ret.push(elem);
  }
  return ret;
}

// var gateway = ['xor','and'];
var gateway = {
  'xor':true,
  'and':true
}
function isGateway(tipo){
  return tipo in gateway;
}


function recursivoBalance(modelo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.id = globalId++;
    // console.log("--->" , globalId , " " , JSON.stringify(elem) );
    if(isGateway(elem.tipo)){
      modelo.unshift(cierrogw(elem));
    }
    if(elem.sentencia instanceof Array){
      elem.sentencia = recursivoBalance(elem.sentencia);
    }else if (elem.tipo == "condicion") {
      elem.sentencia = recursivoBalance([elem.sentencia]).pop();
    }
    ret.push(elem);
  }
  return ret;
}

// recursivoFlujo(modelo, null, null, null)
function recursivoFlujo(modelo, actual, anterior, posterior){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.id = globalId++;
    console.log("--->" , globalId , " " , JSON.stringify(elem) );
    if(elem.sentencia instanceof Array){
      elem.sentencia = recursivoAgregarId(elem.sentencia);
    }else if (elem.tipo == "condicion") {
      elem.sentencia = recursivoAgregarId([elem.sentencia]).pop();
    }
    ret.push(elem);
  }
  return ret;
}

function recursivoAgregarId(modelo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.id = globalId++;
    console.log("--->" , globalId , " " , JSON.stringify(elem) );
    if(elem.sentencia instanceof Array){
      elem.sentencia = recursivoAgregarId(elem.sentencia);
    }else if (elem.tipo == "condicion") {
      elem.sentencia = recursivoAgregarId([elem.sentencia]).pop();
    }
    ret.push(elem);
  }
  return ret;
}

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

var filtros = function (model){
  var res = _.reduce(model, filtroXOR, []);
  return res;
}

function mapJson(model, fun){
  if(_.isArray(model)){
    _.each(model, mapJson);
  }
  else{
    procesarObject(model);
  }
}

const task = "TASK";
var pruebaAnidada = [
  {"tipo": task, "lane":"usuario x", "accion":"baila rapido"},
  {"tipo": "XOR", "lane":"usuario y", "accion":[
    {"tipo": task, "lane":"usuario z", "accion":"baila rapido"},
    {"tipo": task, "lane":"usuario w", "accion":"baila rapido"},
    {"tipo": task, "lane":"usuario s", "accion":"baila rapido"}
  ]},
  {"tipo": "AND", "lane":"usuario r", "accion":[
    {"tipo": task, "lane":"usuario l", "accion":"baila agil"},
    {"tipo": task, "lane":"usuario j", "accion":"baila lento"},
    {"tipo": task, "lane":"usuario k", "accion":"baila torpe"}
  ]
}
];
// `<bpmn:laneSet>
//     <bpmn:lane id="Lane_0t1npma" name="cocinero">
//         <bpmn:flowNodeRef>Task_1h4lllm</bpmn:flowNodeRef>
//     </bpmn:lane>
//     <bpmn:lane id="Lane_1hwq0iu" name="mozo">
//         <bpmn:flowNodeRef>Task_1l1l4c6</bpmn:flowNodeRef>
//         <bpmn:flowNodeRef>Task_1xffedn</bpmn:flowNodeRef>
//         <bpmn:flowNodeRef>EndEvent_1doakpt</bpmn:flowNodeRef>
//         <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
//     </bpmn:lane>
// </bpmn:laneSet>`

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

//recorro todas las tareas para ir asignandolas a los lanes
// las compuertas se asignan a los lanes en un paso posterior (generarFlujo)
var obtenerTareas = function(elem) {
  if (elem.tipo == "task") {
    var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.sentencia.actor});
    lane.flowNodeRef.push(
      {"__prefix":"bpmn","__text":"Task_"+elem.sentencia.accion});
    proceso.task.push(
      {"incoming":{},"outgoing":{},"_id":"Task_"+elem.sentencia.accion,
       "_name":elem.sentencia.accion,"__prefix":"bpmn"});
    if (isPrimeraTarea) {
      isPrimeraTarea = false;
      lane.flowNodeRef.push({"__prefix":"bpmn","__text":"Task_"+elem.sentencia.accion});
    }
  } else if (elem.tipo == "xor") {
    proceso.exclusiveGateway.push(
      {"incoming":{},"outgoing":{},"_id":"ExclusiveGateway_identificador",
       "_default":"default_o_no","__prefix":"bpmn"});
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerTareas(obj);
    }
  } else if (elem.tipo == "and") {
    proceso.parallelGateway.push(
      {"incoming":{}, "outgoing":{}, "_id":"ParallelGateway_identificador", "__prefix":"bpmn" });
    for (var i=0; i < elem.sentencia.length; i++) {
      obj = elem.sentencia[i];
      obtenerTareas(obj);
    }
  }
}

// recorro el modelo nuevamente para construir el flujo del proceso
var generarFlujo = function(elem, elemAnterior) {

}

//inicializo algunos valores necesarios
// evento de inicio, evento de fin ....
var start = function(model) {
  proceso.startEvent = {
    "outgoing": {
      "__prefix":"bpmn",
      "__text":"SequenceFlow_id"
    },
    "__prefix":"bpmn",
    "_id":"StartEvent_1"
  };
  proceso.endEvent = {
    "incoming": {
      "__prefix":"bpmn",
      "__text":"SequenceFlow_id"
    }
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
  filtros:filtros,
  procesar:procesar_nivel,
  start : start,
  obtenerLanes : obtenerLanes,
  obtenerTareas : obtenerTareas,
  proceso : proceso
}
