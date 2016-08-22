var fs = require("fs");
var _ = require("underscore");
var pd = require('pretty-data').pd;
var env = require('./env');

var x2js = require('x2js'); //new X2JS();
var conv = new x2js({
  arrayAccessFormPaths : [
    "definitions.process.startEvent" ,
    "definitions.process.userTask" ,
    "definitions.process.manualTask" ,
    "definitions.process.serviceTask" ,
    "definitions.process.exclusiveGateway" ,
    "definitions.process.parallelGateway" ,
    "definitions.process.intermediateCatchEvent" ,
    "definitions.process.intermediateThrowEvent" ,
    "definitions.process.boundaryEvent" ,
    "definitions.process.endEvent" ,
    "definitions.process.subProcess" ,
    "definitions.process.sequenceFlow"
  ]
});

var conYaoqiang = env.conYaoqiang;
var condicionesActiviti = true;

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
var propiedadesProceso = {}
var losFlujos = [];
var lasVariables = {}
var losNodos = [];
var losPools={}
var losMensajes=[]
var idMensaje = -100;
var laneSetX = {};



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

function buscarVariables(condicion){
  var variable = condicion.replace(/(\w+).*/,'$1')
  lasVariables[variable] = true
}

function asignarElFlujo(nodo){
  if((nodo.tipo == "xor") || ((nodo.tipo == "cierro") && (nodo.tag == "loop") && nodo.expresion)){
    // console.debug(nodo.condiciones);
    var condicion ;
    for (var i = 0; i < nodo.sig.length; i++) {
      // console.log("nodo:" + nodo.id + "  condiciones?" + nodo.condiciones[nodo.sig[i]]);
      if(nodo.condiciones && nodo.condiciones[nodo.sig[i]]){
        buscarVariables(nodo.condiciones[nodo.sig[i]])
          condicion = nodo.condiciones[nodo.sig[i]]

      }  else{
        condicion =""
      }
      var conditionExpression = {"_xsi:type":"tFormalExpression","__cdata":condicion};
      if(condicion){
        losFlujos.push(
          {"sequenceFlow": {"_id":templateId(nodo.id)+"_"+"_"+nodo.sig[i], "_sourceRef":templateId(nodo.id), "_targetRef": "_"+nodo.sig[i], "conditionExpression":conditionExpression, "_name":condicion}}
        );
      }
      else{
        losFlujos.push(
          {"sequenceFlow": {"_id":templateId(nodo.id)+"_"+"_"+nodo.sig[i], "_sourceRef":templateId(nodo.id), "_targetRef": "_"+nodo.sig[i], "_name":"defecto"}}
        );
      }
    }
  }
  else{
    for (var i = 0; i < nodo.sig.length; i++) {
      losFlujos.push(
        {"sequenceFlow": {"_id":templateId(nodo.id)+"_"+"_"+nodo.sig[i], "_sourceRef":templateId(nodo.id), "_targetRef": "_"+nodo.sig[i]}}
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
    return {"timerEventDefinition":{"timeDuration":templateEventoTiempoExpresion(evento)}}
  }else{
    return {"messageEventDefinition":{ "_messageRef":evento.mensaje}}
  }
}

function templateEventoPool(evento, idEvento){
  var prefijo = "id_"
  var idPool = prefijo+evento.pool
  if(evento.tipo == "mensaje"){
    if(!losPools[evento.pool]){
      losPools[evento.pool] ={"_id": idPool, "_name":evento.pool}
    }
    idMensaje++
    if(!evento.throw){
      losMensajes.push({"_id":templateId(idMensaje), "_sourceRef":idPool , "_targetRef":templateId(idEvento)})
    }else{
      losMensajes.push({"_id":templateId(idMensaje), "_sourceRef":templateId(idEvento) , "_targetRef":idPool})
    }
  }
}

function templateNodo(nodo){
  var aux;

  if(nodo.tipo =="task"){
    if(nodo.sentencia.task == "human"){
      // DEJO ESTA LINEA POR LOS PERMISOS aux = {"userTask":{"_id":templateId(nodo.id) , "_name":nodo.sentencia.accion, "_activiti:candidateGroups":quitarEspacios(nodo.sentencia.actor)}}
      aux = {"userTask":{"_id":templateId(nodo.id) , "_name":nodo.sentencia.accion}}
      aux = templatesCampos(nodo, aux);
    }
    if(nodo.sentencia.task == "service"){
      aux = templateServiceTask(nodo)
    }
    if(nodo.sentencia.task == "manual"){
      aux = {"manualTask":{ "_id":templateId(nodo.id) , "_name":nodo.sentencia.accion}}
    }
    if(nodo.sentencia.task == "subproceso"){
      aux = {"subProcess":{ "_id":templateId(nodo.id) , "_name":nodo.sentencia.accion}}
      aux = templateSubproceso(nodo, false)
    }
  }
  if(nodo.tipo =="and"){
    aux = {"parallelGateway":{ "_id":templateId(nodo.id), "_name":"and"+templateId(nodo.id)} }
  }
  if((nodo.tipo =="xor") || (nodo.tipo =="loop")){
    if(!nodo.default){
      nodo.default = nodo.sig[0];
    }
    aux = {"exclusiveGateway": {"_id":templateId(nodo.id), "_name":"xor"+templateId(nodo.id), "_default":templateIdFlujo(nodo.id, nodo.default)} }
  }
  if(nodo.tipo =="adjunto"){
    aux = {"boundaryEvent":{"_id":templateId(nodo.id), "_attachedToRef": "_"+nodo.adjunto_a_id, "_cancelActivity":nodo.interrumpible} }
    _.extend(aux.boundaryEvent,templateEvento(nodo.evento));
  }
  if(nodo.tipo =="evento"){
    if(nodo.sentencia.evento.throw){
      aux = {"intermediateThrowEvent":{ "_id":templateId(nodo.id)} }
      _.extend(aux.intermediateThrowEvent, templateEvento(nodo.sentencia.evento));
    }else{
      aux = {"intermediateCatchEvent":{ "_id":templateId(nodo.id)} }
      _.extend(aux.intermediateCatchEvent, templateEvento(nodo.sentencia.evento));
    }
    templateEventoPool(nodo.sentencia.evento, nodo.id)

  }
  if(nodo.tipo =="cierro"){
    aux = {"exclusiveGateway": {"_id":templateId(nodo.id), "_name":"cierro_xor"+templateId(nodo.id)} }
    if(nodo.tag == "and"){
      aux = {"parallelGateway": {"_id":templateId(nodo.id), "_name":"cierro_and"+templateId(nodo.id)} }
    } else if(nodo.tag == "loop"){
      aux = {"exclusiveGateway": {"_id":templateId(nodo.id), "_default":templateIdFlujo(nodo.id, nodo.default), "_name":"cierro_loop"+templateId(nodo.id)} }
    }
  }
  // console.log(aux);
  return aux;
}

function templateIdFlujo(idFrom, idTo){
  return "_" + idFrom + "__" + idTo
}

function templateId(id){
  var aux = "_" + id
  return aux.replace(/\s/g, "_")
}

//sustituye espacios por _
function quitarEspacios(id){
  return id.replace(/\s/g, "_")
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
    // aux.userTask['extensionElements'] = {
    //   'formProperty' : []
    // }
    aux.userTask['ioSpecification'] = {}

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
      // if(campo.writable){
      //   formProperty = {"__prefix":"activiti", "_id":campo.nombre, "_name":campo.nombre, "_required":campo.obligatorio, "_writable":campo.writable};
      // }else{
      //   formProperty = {"__prefix":"activiti", "_id":campo.nombre, "_name":campo.nombre, "_required":false, "_writable":campo.writable, "_default":"${"+campo.nombre+"}"};
      // }
      // aux.userTask.extensionElements.formProperty.push(formProperty);

    }
  }
  return aux;
}

function ponerNodo(nodo){
  losNodos.push(templateNodo(nodo));
}

function laneNodo(nodo){
  return templateId(nodo.id);
}

function asignarALane(nodo){
  if(nodo.tipo != "adjunto"){
    if(!laneSetX[nodo.lane]){
      laneSetX[nodo.lane] = [];
    }
    laneSetX[nodo.lane].push(laneNodo(nodo));
  }
}


function makeJsonBpmn(modelo, nombreProceso){
  //inicializo variables globales
  laneSetX = {};
  losNodos = [];
  losFlujos = [];
  lasVariables = {}
  propiedadesProceso = {};
  losPools={}
  losMensajes=[]
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
          {"sequenceFlow": {"_id":idStart+"_"+templateId(nodo.id), "_sourceRef":idStart, "_targetRef":templateId(nodo.id) }}
        );
        losNodos.push({"startEvent":{"_id":idStart , "_name":"StartEvent"}});
        startInsertado = true;

        if(!laneSetX[nodo.lane]){
          laneSetX[nodo.lane] = [];
        }
        laneSetX[nodo.lane].push(templateId("F"));
        laneSetX[nodo.lane].push(idStart);
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

  losNodos.push({"endEvent":{"_id":"_F" , "_name":"EndEvent"}});
  return armarJson(nombreProceso);
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

function armarJson(nombreProceso){
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
    // "_xmlns:activiti":"http://activiti.org/bpmn",
  }
  bpmn.definitions.collaboration={}
  bpmn.definitions.collaboration.participant = []
  //creando un participante por cada mensaje
  bpmn.definitions.collaboration.participant.push({"_id":"pool_id", "_name":nombreProceso, "_processRef":idProceso})
  for (var pool in losPools) {
    if (losPools.hasOwnProperty(pool)) {
      bpmn.definitions.collaboration.participant.push(losPools[pool])
    }
  }
  //armando el flujo de mensajes
  if(losMensajes.length>0){
    bpmn.definitions.collaboration.messageFlow=[]
    for (var i = 0; i < losMensajes.length; i++) {
      var mensaje=losMensajes[i]
      bpmn.definitions.collaboration.messageFlow.push(mensaje)
    }
  }
  // bpmn.definitions.collaboration.push({"participant":{"_id":"pool_id", "_name":"PoolProcess", "_id":"pool_id", "_processRef":idProceso}});
  process = {}

  //agrego propiedades al proceso
  for (var prop in propiedadesProceso) {
    if (propiedadesProceso.hasOwnProperty(prop)) {
      if(!process.property){
        process.property = []
      }
      process.property.push(propiedadesProceso[prop]);
    }
  }

  //agrego info del LANES
  process.laneSet = {};
  process.laneSet._id = "id_lane"
  process.laneSet.lane = [];
  var keys = _.keys(laneSetX);
  for (var i = 0; i < keys.length; i++) {
    lane = keys[i];
    var aux = {}
    aux.flowNodeRef = []
    aux["_id"] = templateId(lane);
    aux["_name"] = "nombre_"+lane.replace(/\s/g, "_")
    for (var j = 0; j < laneSetX[lane].length; j++) {
      aux.flowNodeRef.push(laneSetX[lane][j]);
    }
    process.laneSet.lane.push(aux);
  }


  process["_id"] = idProceso;
  process["_isExecutable"] = true

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


  // if(Object.keys(lasVariables).length){
  //   process.startEvent[0].extensionElements = {}
  //   process.startEvent[0].extensionElements.formProperty = []
  //   for (var variable in lasVariables) {
  //     if (lasVariables.hasOwnProperty(variable)) {
  //       console.log("variable:"+variable);
  //       process.startEvent[0].extensionElements.formProperty.push({"__prefix":"activiti","_id":variable})
  //     }
  //   }
  // }

  bpmn.definitions.process = process;
  generarEventosFinExtras(bpmn.definitions);

  return bpmn;
}

function makeBpmnFromJson(json){
  return pd.xml(conv.json2xml_str(json));
}

function modelToXMLEstandar(modelo, nombreProceso){

  var bpmn = pd.xml(conv.json2xml_str(makeJsonBpmn(modelo, nombreProceso)))

  var path = __dirname + "/XMLestandar/";
  var nombreArchivo = nombreProceso + ".bpmn";
  fs.writeFileSync(path + nombreArchivo, pd.xml(bpmn));

  return bpmn
}

function makeBpmnForTest(modelo){
  return pd.xml(conv.json2xml_str(makeJsonBpmn((modelo))))
}


var templateSubproceso = function(elem, ejecutable) {
  var xmlSubProceso = obtenerxmlSubProceso(elem.sentencia.accion, ejecutable);
  var jsonSubProceso = conv.xml_str2json(xmlSubProceso);
  jsonSubProceso.definitions.process = ajustarIDs(jsonSubProceso.definitions.process, elem.sentencia.accion)

  var aux = {"subProcess":{"_id":"_SUBP"+elem.id,"_name":elem.sentencia.accion}};
  aux.subProcess = jsonSubProceso.definitions.process

  aux.subProcess._id = templateId(elem.id)
  aux.subProcess._name = elem.sentencia.accion
  try {
    console.debug(aux.subProcess.laneSet);
    delete aux.subProcess.laneSet;
  } catch (e) {
    console.error(e);
  } finally {

  }
  delete aux.subProcess["_isExecutable"]

  console.debug(aux);
  return aux;
}

var obtenerxmlSubProceso = function(nombreArchivo, ejecutable) {
  var archivo = __dirname;
  archivo = archivo + "/XMLestandar/" + nombreArchivo + ".bpmn";

  var subproceso = fs.readFileSync(archivo).toString();
  return subproceso;
}

var ajustarIDs = function(procesoJson, subproceso) {
  var prefix;
  if (subproceso == "") {
    prefix = "_";
  } else {
    prefix = subproceso;
  }
  // LANES
  if (subproceso == "") {
    for (var i=0; i< procesoJson.laneSet.lane.length; i++) {
      for (var j=0; j< procesoJson.laneSet.lane[i].flowNodeRef.length; j++) {
        procesoJson.laneSet.lane[i].flowNodeRef[j].__text = prefix + procesoJson.laneSet.lane[i].flowNodeRef[j].__text
      }
    }
  }
  for (var prop in procesoJson) {
    if (procesoJson.hasOwnProperty(prop) && prop != "laneSet") {
      for (var i=0; i<procesoJson[prop].length; i++) {
        procesoJson[prop][i]._id = prefix + procesoJson[prop][i]._id;
        if (prop == "exclusiveGateway") {
          if (procesoJson[prop][i]._default) {
            procesoJson[prop][i]._default = prefix + procesoJson[prop][i]._default;
          }
        } else if (prop == "boundaryEvent") {
          procesoJson[prop][i]._attachedToRef = prefix + procesoJson[prop][i]._attachedToRef;
        } else if (prop == "sequenceFlow") {
          procesoJson[prop][i]._sourceRef = prefix + procesoJson[prop][i]._sourceRef;
          procesoJson[prop][i]._targetRef = prefix + procesoJson[prop][i]._targetRef;
        }
      }
    }
  }
  return procesoJson;
}

 function generarEventosFinExtras(proceso) {
  var i = 1;
  var primero = true;
  var eventoFinViejo = proceso.process.endEvent[0];
  for (var flujo in proceso.process.sequenceFlow) {
    if (proceso.process.sequenceFlow[flujo]._targetRef == eventoFinViejo._id) {
      var idEventoFinNuevo = "EndEvent_" +i;
      var eventoFinNuevo = {"_id":idEventoFinNuevo}
      proceso.process.sequenceFlow[flujo]._targetRef = idEventoFinNuevo;
      i++;
      if (primero) {
        proceso.process.endEvent[0] = eventoFinNuevo;
        primero = false;
      } else {
        proceso.process.endEvent.push(eventoFinNuevo);
      }
    }
  }
}


var templateServiceTask = function(elem) {
  //FIXME si se quisiera cambiar la implementacion del web service hay que cambiar el nombre de la clase
  var classpath = "org.proyecto.";
  var nombreClase = "Servicetask";
  return {"serviceTask":{"_id":"_"+elem.id , "_name":elem.sentencia.accion}}

}


module.exports = {
  modelToXMLEstandar: modelToXMLEstandar,
  makeBpmnForTest: makeBpmnForTest,
}
