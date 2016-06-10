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

//java -jar yaoqian/modules/org.yaoqiang.asaf.bpmn-graph.jar ~/Escritorio/prueba.bpmn --export

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

var lasVariables = {}
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
        if(condicionesActiviti){
          condicion = "${"+nodo.condiciones[nodo.sig[i]]+"}"
        }else{ //para activiti
          condicion = nodo.condiciones[nodo.sig[i]]
        }
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
  //  else if(nodo.tipo == "cierro" && nodo.expresion){
  //   for (var i = 0; i < nodo.sig.length; i++) {
  //     if(){
  //       losFlujos.push(
  //         {"sequenceFlow": {"_id":templateId(nodo.id)+"_"+"_"+nodo.sig[i], "_sourceRef":templateId(nodo.id), "_targetRef": "_"+nodo.sig[i]}}
  //       );
  //     } else{
  //       losFlujos.push(
  //         {"sequenceFlow": {"_id":templateId(nodo.id)+"_"+"_"+nodo.sig[i], "_sourceRef":templateId(nodo.id), "_targetRef": "_"+nodo.sig[i]}}
  //       );
  //     }
  //   }
  // }
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
    // return {"timerEventDefinition":{"timeDuration":{ "_name":evento.tiempo+evento.unidad}}}
    return {"timerEventDefinition":{"timeDuration":templateEventoTiempoExpresion(evento)}}
  }else{
    return {"messageEventDefinition":{ "_messageRef":evento.mensaje}}
  }
}

var losPools={}
var losMensajes=[]
var idMensaje = -100;
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
        aux = {"userTask":{"_id":templateId(nodo.id) , "_name":nodo.sentencia.accion, "_activiti:candidateGroups":quitarEspacios(nodo.sentencia.actor)}}
        aux = templatesCampos(nodo, aux);
      }
      if(nodo.sentencia.task == "service"){
        // aux = {"serviceTask":{ "_id":templateId(nodo.id) , "_name":nodo.sentencia.accion}}
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
          formProperty = {"__prefix":"activiti", "_id":campo.nombre, "_name":campo.nombre, "_required":campo.obligatorio, "_writable":campo.writable};
        }else{
          formProperty = {"__prefix":"activiti", "_id":campo.nombre, "_name":campo.nombre, "_required":false, "_writable":campo.writable, "_default":"${"+campo.nombre+"}"};
        }
        // if(campo.writable){
        //   formProperty = {"__prefix":"activiti", "_id":nodo.id+"_"+campo.nombre, "_name":campo.nombre, "_required":campo.obligatorio, "_writable":campo.writable};
        // }else{
        //   formProperty = {"__prefix":"activiti", "_id":nodo.id+"_"+campo.nombre, "_name":campo.nombre, "_required":false, "_writable":campo.writable, "_default":"${"+campo.nombre+"}"};
        // }
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


  function makeJsonBpmn(modelo){
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
    //insertando el fin //FIXME ya estaba hecho
    // var idEnd = "idEnd"
    // losFlujos.push(
    //   {"sequenceFlow": {"_id":endNodo.id+":"+idEnd, "_sourceRef":endNodo.id, "_targetRef":idEnd }}
    // );
    losNodos.push({"endEvent":{"_id":"_F" , "_name":"EndEvent"}});
    // console.debug("Variiables"+pd.json(lasVariables))
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
    // bpmn.definitions["collaboration"] = []
    bpmn.definitions.collaboration={}
    bpmn.definitions.collaboration.participant = []
    //creando un participante por cada mensaje
    bpmn.definitions.collaboration.participant.push({"_id":"pool_id", "_name":"PoolProcess", "_processRef":idProceso})
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

    // // //agrego info del LANES //FIXME lo saco porque hay problemas aca
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


    if(Object.keys(lasVariables).length){
      process.startEvent[0].extensionElements = {}
      process.startEvent[0].extensionElements.formProperty = []
      for (var variable in lasVariables) {
        if (lasVariables.hasOwnProperty(variable)) {
          console.log("variable:"+variable);
          process.startEvent[0].extensionElements.formProperty.push({"__prefix":"activiti","_id":variable})
        }
      }
    }

    bpmn.definitions.process = process;
    // console.log(pd.json(process));

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





var templateSubproceso = function(elem, ejecutable) {
  var xmlSubProceso = obtenerxmlSubProceso(elem.sentencia.accion, ejecutable);
  var jsonSubProceso = conv.xml_str2json(xmlSubProceso);
  jsonSubProceso.definitions.process = ajustarIDs(jsonSubProceso.definitions.process, elem.sentencia.accion)


  // var aux = {"subProcess":{"_id":"_SUBP"+elem.id,"_name":elem.sentencia.accion}};
  // for (var variable in jsonSubProceso.definitions.process) {
  //   if (jsonSubProceso.definitions.process.hasOwnProperty(variable)) {
  //       aux.subProcess[variable] = jsonSubProceso.definitions.process[variable]
  //     }
  //   }

  var aux = {"subProcess":{"_id":"_SUBP"+elem.id,"_name":elem.sentencia.accion}};
  aux.subProcess = jsonSubProceso.definitions.process

  aux.subProcess._id = templateId(elem.id)
  aux.subProcess._name = elem.sentencia.accion
  delete aux.subProcess["_isExecutable"]

  return aux;
}

var obtenerxmlSubProceso = function(nombreArchivo, ejecutable) {
  var archivo = __dirname;
  if (ejecutable) {
    archivo = archivo + "/XMLejecutables/" + nombreArchivo + ".bpmn";
  } else {
    archivo = archivo + "/XMLbasicos/" + nombreArchivo + ".bpmn";
  }
  var subproceso = fs.readFileSync(archivo).toString();
  return subproceso;
}

var ajustarIDs = function(proceso, subproceso_nombre) {
  var prefix;
  if (subproceso_nombre == "") {
    prefix = "_";
  } else {
    prefix = subproceso_nombre;
  }

  // var regExId = /(\"_id\":\s*\")([^\"]+)(\")/g
  // var strProcess = JSON.stringify(proceso);
  // var newStr = strProcess.replace(regExId, function(match, p1, p2, p3){
  //   return p1 + subproceso_nombre + p2 + p3
  // })
  // proceso = JSON.parse(newStr);


  if (proceso.startEvent) {
    // console.log("Hay startEvent, en total son:" + proceso.startEvent.length);
    for (var i=0; i< proceso.startEvent.length; i++) {
      proceso.startEvent[i]._id = prefix + proceso.startEvent[i]._id;
    }
  }
  if (proceso.endEvent) {
    for (var i=0; i< proceso.endEvent.length; i++) {
      proceso.endEvent[i]._id = prefix + proceso.endEvent[i]._id;
    }
  }
  // LANES
  if (subproceso_nombre == "") {
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
      if (proceso.exclusiveGateway[i]._default) {
        proceso.exclusiveGateway[i]._default = prefix + proceso.exclusiveGateway[i]._default;
      }
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

var templateServiceTask = function(elem) {
  //FIXME si se quisiera cambiar la implementacion del web service hay que cambiar el nombre de la clase
  var classpath = "org.proyecto.";
  var nombreClase = "Servicetask";
  return {"serviceTask":{"_id":"_"+elem.id , "_name":elem.sentencia.accion, "_activiti:class":classpath + nombreClase}}

}


module.exports = {
  makeBpmn: makeBpmn,
  makeBpmnForTest: makeBpmnForTest,
}
