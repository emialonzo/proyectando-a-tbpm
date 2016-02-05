var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");
var prettyjson = require('prettyjson');

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
var funcProc = function(){
  return proceso;
}
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
    //elem.id = globalId++;
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

// recursivoFlujo(modelo, 0)
function recursivoFlujo(modelo, anterior){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.anterior = anterior;
    console.log("--->" , globalId , " " , JSON.stringify(elem) );
    if(elem.sentencia instanceof Array){
      elem.sentencia = recursivoFlujo(elem.sentencia, elem.id);
    }else if (elem.tipo == "condicion") {
      elem.sentencia = recursivoFlujo([elem.sentencia], elem.anterior).pop();
    }
    anterior = elem.id;
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
      else{

      }
    };

    // recorre las tareas para ir asignandolas a los lanes
    // las compuertas se asignan a los lanes en un paso posterior (generarFlujo)
    // se asignan los flujos de salida de cada tarea y compuerta
    var obtenerTareas = function(elem) {
      if (elem.tipo == "task") {
        var lane = _.find(proceso.laneSet.lane, function(val){return val._name == elem.sentencia.actor});
        var nodo = {"__prefix":"bpmn","__text":"Task_"+elem.id};
        lane.flowNodeRef.push(nodo);
        var tarea =
        {"incoming":{},
        "outgoing":{"__prefix":"bpmn", "__text":"SequenceFlow_"+SequenceFlow_GlobalID++},
        "_id":"Task_"+elem.id,
        "_name":elem.sentencia.accion,"__prefix":"bpmn"
      };
      proceso.sequenceFlow.push({
        "_id":tarea.outgoing.__text,"_sourceRef":nodo.__text,
        "_targetRef":"","__prefix":"bpmn"});
        proceso.task.push(tarea);
        if (isPrimeraTarea) {
          isPrimeraTarea = false;
          lane.flowNodeRef.push({"__prefix":"bpmn","__text":"StartEvent_1"});
          tarea.incoming = {"__prefix":"bpmn", "__text":"SequenceFlow_1"}
        }
      } else if (elem.tipo == "condicion") {
        obtenerTareas(elem.sentencia);
      } else if (elem.tipo == "xor") {
        var abre = {"incoming":[],"outgoing":[],"_id":"ExclusiveGateway_"+ExclusiveGateway_GlobalID++,
        "_default":"","__prefix":"bpmn"};
        proceso.exclusiveGateway.push(abre);
        for (var i=0; i < elem.sentencia.length; i++) {
          var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
          abre.outgoing.push(flujo);
          proceso.sequenceFlow.push({
            "_id":flujo.__text,"_sourceRef":abre._id,
            "_targetRef":"","__prefix":"bpmn"});
            obj = elem.sentencia[i];
            obtenerTareas(obj);
            if (obj.condicion == "defecto") {
              abre._default = flujo.__text;
            }
          }
          var cierra = {"incoming":[],"outgoing":[],"_id":"ExclusiveGateway_"+ExclusiveGateway_GlobalID++,
          "__prefix":"bpmn"};
          var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
          cierra.outgoing.push(flujo);
          proceso.sequenceFlow.push({
            "_id":flujo.__text,"_sourceRef":cierra._id,
            "_targetRef":"","__prefix":"bpmn"});

            proceso.exclusiveGateway.push(cierra);

          } else if (elem.tipo == "and") {
            var abre = {"incoming":[], "outgoing":[],"_id":"ParallelGateway_"+ParallelGateway_GlobalID++,
            "__prefix":"bpmn" };
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
              var cierra = {"incoming":[], "outgoing":[],
              "_id":"ParallelGateway_"+ParallelGateway_GlobalID++, "__prefix":"bpmn" };
              var flujo = {"__prefix":"bpmn","__text":"SequenceFlow_"+SequenceFlow_GlobalID++};
              cierra.outgoing.push(flujo);
              proceso.sequenceFlow.push({
                "_id":flujo.__text,"_sourceRef":cierra._id,
                "_targetRef":"","__prefix":"bpmn"});
                proceso.parallelGateway.push(cierra);
              }
            }

            // recorro el modelo nuevamente para construir el flujo del proceso
            var generarFlujo = function(elem, anteriores) {
              console.log("################# ELEM #################");
              console.log(prettyjson.render(elem));
              console.log("############ ANTERIORES ################");
              console.log(prettyjson.render(anteriores));
              console.log("########################################");
              for (var i=0; i<anteriores.length; i++) {
                var elemAnt = anteriores[i];
                var flujo = _.find(proceso.sequenceFlow, function(val) {return val._id == elemAnt.outgoing.__text});
                console.log("######## Flujo #######");
                console.log(prettyjson.render(flujo));
                console.log("######################");
                flujo._targetRef = elem._id;
                elem.incoming.push(
                  {
                    "__prefix":"bpmn",
                    "__text":flujo._id
                  }
                );
              }
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
                filtros:filtros,
                procesar:procesar_nivel,
                start : start,
                obtenerLanes : obtenerLanes,
                obtenerTareas : obtenerTareas,
                proceso : proceso,
                recursivoAgregarId:recursivoAgregarId
              }
