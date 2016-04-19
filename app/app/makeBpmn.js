var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");
var pd = require('pretty-data').pd;
var toDot = require('./makeDot').toDot;
var intermedio = require('./modeloIntermedio');
var prettyjson = require('prettyjson');
var env = require('./env');

var x2js = require('x2js'); //new X2JS();
var conv = new x2js();

var conYaoqiang = env.conYaoqiang;

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

var propiedadesProceso = {}

var losFlujos = [];
function asignarElFlujo(nodo){
  if(nodo.tipo == "xor"){
    // console.debug(nodo.condiciones);
    var condicion ;
    for (var i = 0; i < nodo.sig.length; i++) {
      if(nodo.condiciones){
        if(conYaoqiang){
          condicion = nodo.condiciones[nodo.sig[i]]
        }else{ //para activiti
          condicion = "${"+nodo.condiciones[nodo.sig[i]]+"}"
        }
      }  else{condicion=""}
      var conditionExpression = {"_xsi:type":"tFormalExpression","__cdata":condicion};
      if(condicion){
        losFlujos.push(
          {"sequenceFlow": {"_id":"_"+nodo.id+"_"+"_"+nodo.sig[i], "_sourceRef":"_"+nodo.id, "_targetRef": "_"+nodo.sig[i], "conditionExpression":conditionExpression, "_name":condicion}}
        );
      }
      else{
        losFlujos.push(
          {"sequenceFlow": {"_id":"_"+nodo.id+"_"+"_"+nodo.sig[i], "_sourceRef":"_"+nodo.id, "_targetRef": "_"+nodo.sig[i], "conditionExpression":conditionExpression}}
        );
      }
    }
  }else{
    for (var i = 0; i < nodo.sig.length; i++) {
      losFlujos.push(
        {"sequenceFlow": {"_id":"_"+nodo.id+"_"+"_"+nodo.sig[i], "_sourceRef":"_"+nodo.id, "_targetRef": "_"+nodo.sig[i]}}
      );
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

function templateEvento(evento){
  if(evento.tiempo){
    // return {"timerEventDefinition":{"timeDuration":{ "_name":evento.tiempo+evento.unidad}}}
    return {"timerEventDefinition":{"timeDuration":templateEventoTiempoExpresion(evento)}}
  }else{
    return {"messageEventDefinition":{ "_messageRef":evento.mensaje}}
  }
}

  function templateNodo(nodo){
    var aux;
    if(nodo.tipo =="task"){
      if(nodo.sentencia.task == "human"){
        aux = {"userTask":{"_id":"_"+nodo.id , "_name":nodo.sentencia.accion, "_activiti:candidateGroups":nodo.sentencia.actor}}
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
      if(!nodo.default){
        nodo.default = nodo.sig[0];
      }
      aux = {"exclusiveGateway": {"_id":"_"+nodo.id, "_default":templateIdFlujo(nodo.id, nodo.default)} }
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
      } else if(nodo.tag == "loop"){
        aux = {"exclusiveGateway": {"_id":"_"+nodo.id, "_default":templateIdFlujo(nodo.id, nodo.default)} }
      }
    }
    return aux;
  }

  function templateIdFlujo(idFrom, idTo){
    return "_" + idFrom + "__" + idTo
  }

  function getIdCampo(nodo, nombreCampo){
    return  nombreCampo;
    // return "id_"+nodo.id + "_" + nombreCampo;
  }
  function getIdDataOutputCampo(nodo, campo){
    return  "data_" + nodo.id + "_"+campo.nombre;
    // return "id_"+nodo.id + "_" + nombreCampo;
  }
function agregarPrpiedad(nodo, campo){
  if(!propiedadesProceso[campo.nombre]){
    propiedadesProceso[campo.nombre] = {"_id":getIdCampo(nodo, campo.nombre), "_itemSubjectRef":"xsd:string", "_name":campo.nombre}
  }
}

  function templatesCampos(nodo, aux){
    if(nodo.sentencia.campos){
      aux.userTask['extensionElements'] = {
        'formProperty' : []
      }
      aux.userTask['ioSpecification'] = {}
      //   'inputSet' : {},
      //   'outputSet' : {}
      //
      //   // 'dataOutput' : [],
      //   // 'inputSet' : {
      //   //   'dataInputRefs' : []
      //   // },
      //   // 'outputSet' : {
      //   //   'dataOutputRefs' : []
      //   // }
      // }
      // aux.userTask['property'] = [];
      // aux.userTask['dataOutputAssociation'] = [];
      // aux.userTask['dataInputAssociation'] = [];

      var data, set, association;

      for (var i = 0; i < nodo.sentencia.campos.length; i++) {
        var campo = nodo.sentencia.campos[i];
        //creo propeidades
        agregarPrpiedad(nodo, campo); //agrega la propiedad del nombre de campo al proceso

        if(campo.writable){
          if(!aux.userTask.ioSpecification.dataOutput){
            aux.userTask.ioSpecification.dataOutput = [];

            aux.userTask.ioSpecification.inputSet = {}
            aux.userTask.ioSpecification.outputSet = {}

            aux.userTask.ioSpecification.outputSet.dataOutputRefs = []
            aux.userTask.dataOutputAssociation = []
          }
          //creo dataOutput
          aux.userTask.ioSpecification.dataOutput.push({"_id":getIdDataOutputCampo(nodo, campo), "_itemSubjectRef":"xsd:string", "_name":getIdDataOutputCampo(nodo, campo)});
          aux.userTask.ioSpecification.outputSet.dataOutputRefs.push(getIdDataOutputCampo(nodo, campo));
          //se asocian las propiedades con la dataOutput
          aux.userTask.dataOutputAssociation.push({ "sourceRef":getIdDataOutputCampo(nodo, campo), "targetRef": getIdCampo(nodo, campo.nombre)});
        }else{
          if(!aux.userTask.ioSpecification.dataInput){
            aux.userTask.ioSpecification.dataInput = [];

            aux.userTask.ioSpecification.inputSet = {};
            aux.userTask.ioSpecification.outputSet = {};

            aux.userTask.ioSpecification.inputSet.dataInputRefs = []
            aux.userTask.dataInputAssociation = []
          }
          //creo dataInput
          aux.userTask.ioSpecification.dataInput.push({"_id":getIdDataOutputCampo(nodo, campo), "_itemSubjectRef":"xsd:string", "_name":getIdDataOutputCampo(nodo, campo)});
          aux.userTask.ioSpecification.inputSet.dataInputRefs.push(getIdDataOutputCampo(nodo, campo));
          //se asocian las propiedades con la dataOutput
          aux.userTask.dataInputAssociation.push({ "sourceRef": getIdCampo(nodo, campo.nombre), "targetRef":getIdDataOutputCampo(nodo, campo) });
        }

        //activiti
        var formProperty;
        if(campo.writable){
          formProperty = {"__prefix":"activiti", "_id":nodo.id+"_"+campo.nombre, "_name":campo.nombre, "_required":campo.obligatorio, "_writable":campo.writable};
        }else{
          formProperty = {"__prefix":"activiti", "_id":nodo.id+"_"+campo.nombre, "_name":campo.nombre, "_required":false, "_writable":campo.writable, "_default":"${"+campo.nombre+"}"};
        }
        aux.userTask.extensionElements.formProperty.push(formProperty);

      }
      // if (aux.userTask.ioSpecification.dataOutput){
      //   aux.userTask.ioSpecification.dataOutput.shift()
      // }
      // if (aux.userTask.ioSpecification.dataInput){
      //   aux.userTask.ioSpecification.dataInput.shift()
      // }
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
    propiedadesProceso = {};
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
      "_xmlns:activiti":"http://activiti.org/bpmn",
    }
    bpmn.definitions["collaboration"] = []
    bpmn.definitions.collaboration.push({"participant":{"_id":"pool_id", "_name":"PoolProcess", "_id":"pool_id", "_processRef":idProceso}});
    process = {}
    process["_id"] = idProceso;
    process["_isExecutable"] = true

    process.property = []
    for (var prop in propiedadesProceso) {
      if (propiedadesProceso.hasOwnProperty(prop)) {
        process.property.push(propiedadesProceso[prop]);
      }
    }

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

  function makeBpmnForTest(modelo){
    // console.log("makeBpmn::makeBpmnForTest");
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
  makeBpmn: makeBpmn,
  makeBpmnForTest: makeBpmnForTest,
}
