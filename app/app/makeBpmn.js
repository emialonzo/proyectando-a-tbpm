var PEG = require('pegjs')
var fs = require('fs')
var _ = require('underscore')

var gramatica = null;
var parser = null;
var bpmn = {};
var globalId = 0;
var laneSet = {
  lane : []
};
laneSet.lane.push(
  {
    "_id" : "idLane1",
    "_name": "Lane1",
    "flowNodeRef": {
      "__text":"idTarea1"
    }
  }
);

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

// var cierro = {
//   "tipo": "cierro",
//   "sentencia" : "Nodo para balanceo de compuertas."
// };

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

var init = function(path){
  path = path || __dirname + '/gramatica.pegjs';
  gramatica = fs.readFileSync(path).toString();
  parser = PEG.buildParser(gramatica);
}

var getActors = function(model){
  return _.uniq(_.map(_.flatten(model), function(elem){ return elem.actor; }));
}

var fillLaneSet = function(elem){
  bpmn.lanes.push(elem.acotr);
}

var start = function(model){
  bpmn.lanes = []
  var actor = model[0].actor;
  model.unshift()
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
  init: init,
  makeBpmn: makeBpmn,
  getActors: getActors,
  filtros: filtros,
  procesar: procesar_nivel
}
