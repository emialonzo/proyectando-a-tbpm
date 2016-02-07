var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");
var prettyjson = require('prettyjson');
var pd = require('pretty-data').pd;

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
    "sentencia" : elem.tipo,
    "tag": elem.tipo,
    "ref": elem.id,
    "id": globalId++
  }
}

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

function findById(modelo, id){
  if(modelo.id == id){
    return modelo;
  }
  else {
    if((nodo.tipo == "secuencia") || (isGateway(nodo.tipo))){
      for (var i = 0; i < nodo.sentencia.length; i++) {
        var encontrado = findById(nodo.sentencia[i], id);
        if(!_.isUndefined(encontrado)){ //modelo.sig.push(.id);
          return encontrado;
        }
      }
    }
  }
  return;
}

//recursivoFlujo
function recursivoFlujo(nodo, ant, sig){
  if(_.isUndefined(nodo)){
    return ;
  }
  // console.log(":: Buscando flujo en el nodo ");
  // console.info(nodo);
  console.log("::: " + ant + "<---" + nodo.id + "--->" + sig );

  nodo.sig = sig;
  nodo.ant = ant;

  if(nodo.tipo == "secuencia"){
    var largo_secuencia = nodo.sentencia.length;
    console.log("largo:" + largo_secuencia);
    if(largo_secuencia>1){
      // console.log("::: antes:nodo.sentencia[0]");
      // console.log(nodo.sentencia[0]);
      nodo.sentencia[0] = recursivoFlujo(nodo.sentencia[0], ant, nodo.sentencia[1].id);
      // console.log("::: despues:nodo.sentencia[0]");
      // console.log(nodo.sentencia[0].tipo);
      for (var i = 1; i < largo_secuencia - 1; i++) {
        // console.log("::: antes:nodo.sentencia[i]");
        // console.log( nodo.sentencia[i]);
        nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], nodo.sentencia[i-1].sig, nodo.sentencia[i+1].id);
        // console.log("::: despues:nodo.sentencia[i]");
        // console.log(nodo.sentencia[i].tipo);
      }
      nodo.sentencia[largo_secuencia-1]
        = recursivoFlujo(nodo.sentencia[largo_secuencia-1], nodo.sentencia[largo_secuencia-2].sig, sig);
      // console.log(nodo.sentencia[largo_secuencia].tipo);
    } else{
      nodo.sentencia[0].ant = ant;
      nodo.sentencia[0].sig = sig;
    }
  }
  else if ( isGateway(nodo.tipo) ){
    nodo.sig = [];
    for (var i = 0; i < nodo.sentencia.length ; i++) {
      nodo.sig.push(nodo.sentencia[i].id);
      nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], nodo.id, sig);
    }
  }
  return nodo;
}

function dotTask(nodo){
  return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\"];";
}

function dotGw(nodo){
  return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.tipo + "\", , shape=diamond];";
}

function dotFlow(nodo, lista){
  var ret = [];
  if(!_.isUndefined(nodo.sig)){
    console.log("tipo:" + nodo.tipo + "\tid:" + nodo.id + " siguientes:" + nodo.sig);
    var aux;
    for (var i = 0; i < nodo.sig.length; i++) {
      aux = nodo.id + " -> " + nodo.sig[i] + ";";
      ret.push(aux);
    }
  }
  return ret;
}

var toDot = function(modelo){
  var task={}, gw=[], flujo=[];
  console.log(flujo + flujo.length);
  console.log("Convertir a DOT");
  console.log(modelo);
  function dotRec(nodo){
    console.log("Aplicacion recursiva " +flujo.length);
    // console.log(nodo);
    //FIXME
    //no cuento nodos indefinidos, no deberia haberlos
    if(_.isUndefined(nodo)) {console.log("moco");return;}
    // console.log(">>>>><>>" + pd.json(nodo));
    if(nodo.tipo=="task") {
      //agrego tarea al lane
      if(_.isUndefined(task[nodo.sentencia.actor])){
        task[nodo.sentencia.actor] = [];
      }
      task[nodo.sentencia.actor].push(dotTask(nodo));
      //agrego su flujo
      var a = dotFlow(nodo);
      console.log("-->" + a);
      flujo = _.union(flujo, a);
    }
    else if(nodo.tipo=="secuencia"){
      //para cada elemento que tenga dentro le aplico la funcion
      // for (var i = 0; i < nodo.sentencia.length; i++) {
      //   dotRec(nodo.sentencia[i]);
      // }
      _.map(_.compact(nodo.sentencia), dotRec);
    }else if(nodo.tipo=="cierro"){
      //agrego shape para la compuerta
      gw.push(dotGw(nodo));
      //agrego flujo
      flujo = _.union(flujo, dotFlow(nodo));
    }
    else if(isGateway(nodo.tipo)){
      //agrego shape
      gw.push(dotGw(nodo));
      //agrego flujo
      flujo = _.union(flujo,dotFlow(nodo));
      //invoco la funcion para cada nodo siguiente
      for (var i = 0; i < nodo.sentencia.length; i++) {
        dotRec(nodo.sentencia[i]);
      }
    }
  };
    dotRec(modelo);
    console.log("---> depurando");
    console.log(task);
    console.log(gw);
    console.log(flujo);
  }



function recursivoAgregarId(modelo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.id = globalId++;
    console.log("--->" , globalId , " " , JSON.stringify(elem) );
    if(elem.sentencia instanceof Array){
      elem.sentencia = recursivoAgregarId(elem.sentencia);
    }
    ret.push(elem);
  }
  return ret;
}

function recursivoBalance(modelo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    if(isGateway(elem.tipo)){
      modelo.unshift(cierrogw(elem));
    }
    if(elem.sentencia instanceof Array){
      elem.sentencia = recursivoBalance(elem.sentencia);
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

var makeBpmn = function(model){
  model = recursivoAgregarId(model.sentencia);
  model = recursivoBalance(model);
  console.log(pd.json(model));
  aux = {};
  aux.tipo = "secuencia";
  aux.sentencia = model;
  aux.id = globalId++;
  model = recursivoFlujo(aux, "S", "F");
  return model;
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
          console.log("########## ELEM ANTERIOR ##########");
          console.log(elem);
          console.log("##########################");
          var flujo = null;
          if (elem.tipo == "task") {
            var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
            console.log("########## TASK anterior ##########");
            console.log(task);
            console.log("##########################");
            flujo = _.find(proceso.sequenceFlow, function(val){return val._id == task.outgoing.__text});
            return flujo;
          } else if (elem.tipo == "and") {
            var id = elem.id + 1;
            var gwAND = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
            console.log("########## GW AND cierra anterior ##########");
            console.log(gwAND);
            console.log("##########################");
            flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwAND.outgoing.__text});
            return flujo;
          } else if (elem.tipo == "xor") {
            var id = elem.id + 1;
            var gwXOR = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
            console.log("########## GW XOR cierra anterior ##########");
            console.log(gwXOR);
            console.log("##########################");
            flujo = _.find(proceso.sequenceFlow, function(val){return val._id == gwXOR.outgoing.__text});
            return flujo;
          }
        }

        // recorro el modelo nuevamente para construir el flujo del proceso
        var generarFlujo = function(anterior, elem) {
          var flujoAnterior = obtenerFlujo(anterior);
          console.log("########## FLUJO ##########");
          console.log(flujoAnterior);
          console.log("############################");
          if (elem.tipo == "task") {
            var task = _.find(proceso.task, function(val){ return val._id == "Task_"+elem.id});
            flujoAnterior._targetRef = task._id;
            task.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
          } else if (elem.tipo == "and") {
            var id = elem.id;
            var abreGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+(id++)});
            console.log("########## ABRE GW ##########");
            console.log(abreGW);
            console.log("############################");
            var cierraGW = _.find(proceso.parallelGateway, function(val) {return val._id == "ParallelGateway_"+id});
            flujoAnterior._targetRef = abreGW._id;
            abreGW.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
            for (var i = 0; i<elem.sentencia.length ; i++) {
              var obj = elem.sentencia[i];
              //TODO arreglar la recursion para ver como conectar los elementos que estan adentro de las compuertas
              //generarFlujo(abreGW, obj);
              //generarFlujo(obj, cierraGW);
            }
          } else if (elem.tipo == "xor") {
            var id = elem.id;
            var abreGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+(id++)});
            var cierraGW = _.find(proceso.exclusiveGateway, function(val) {return val._id == "ExclusiveGateway_"+id});
            flujoAnterior._targetRef = abreGW._id;
            abreGW.incoming = {"__prefix":"bpmn", "__text":flujoAnterior._id};
            for (var i = 0; i<elem.sentencia.length ; i++) {
              var obj = elem.sentencia[i];
              //TODO arreglar la recursion para ver como conectar los elementos que estan adentro de las compuertas
              //generarFlujo(abreGW, obj);
              //generarFlujo(obj, cierraGW);
            }
          } else if (elem.tipo == "loop") {
            // aca se manejaria parecido a la compuerta XOR
            // solo que cambian los flujos de entrada y salida de las compuertas
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
          console.log(ultimo);
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
            recursivoAgregarId:recursivoAgregarId,
            generarFlujo : generarFlujo,
            conectarEndEvent : conectarEndEvent,
            toDot : toDot,
            conectarStartEvent : conectarStartEvent,
          }
