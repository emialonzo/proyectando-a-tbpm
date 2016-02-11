var _ = require("underscore");
var pd = require('pretty-data').pd;

var globalId = 1;
var dicccionarioId = {};

var cierrogw = function (elem){
  return {
    "tipo": "cierro",
    "sentencia" : elem.tipo,
    "tag": elem.tipo,
    "ref": elem.id,
    "id": globalId++
  }
}

// var gateway = ['xor','and'];
var gateway = {
  'xor':true,
  'and':true
}
function isGateway(tipo){
  return tipo in gateway;
}

// function findById(modelo, id){
//   if(modelo.id == id){
//     return modelo;
//   }
//   else {
//     if((nodo.tipo == "secuencia") || (isGateway(nodo.tipo))){
//       for (var i = 0; i < nodo.sentencia.length; i++) {
//         var encontrado = findById(nodo.sentencia[i], id);
//         if(!_.isUndefined(encontrado)){ //modelo.sig.push(.id);
//           return encontrado;
//         }
//       }
//     }
//   }
//   return;
// }

function findById(id){
  return dicccionarioId[id];
}

//recursivoFlujo
// PRE: los nodos deben tener id
// PRE: las gw deben estar balanceadas
// return: a cada nodo le agrega un flujo
function asignarFlujo(modelo){
  return recursivoFlujo(modelo, "S", "F");
}

function recursivoFlujo(nodo, ant, sig){
  if(_.isUndefined(nodo)){
    return ;
  }

  nodo.sig = sig;
  nodo.ant = ant;

  if(nodo.tipo == "secuencia"){
    var largo_secuencia = nodo.sentencia.length;
    // console.log("largo:" + largo_secuencia);
    if(largo_secuencia>1){
      // console.log("::: antes:nodo.sentencia[0]");
      // console.log(nodo.sentencia[0]);
      nodo.sentencia[0] = recursivoFlujo(nodo.sentencia[0], ant, [nodo.sentencia[1].id]);
      // console.log("::: despues:nodo.sentencia[0]");
      // console.log(nodo.sentencia[0].tipo);
      for (var i = 1; i < largo_secuencia - 1; i++) {
        // console.log("::: antes:nodo.sentencia[i]");
        // console.log( nodo.sentencia[i]);
        nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], nodo.sentencia[i-1].sig, [nodo.sentencia[i+1].id]);
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
      nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], [nodo.id], sig);
    }
  }
  return nodo;
}

//toma un modelo y a cada elemento le agrega un id
function asignarId(modelo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.id = globalId++;
    dicccionarioId[elem.id] = elem;
    if(elem.sentencia instanceof Array){
      elem.sentencia = asignarId(elem.sentencia);
    }
    ret.push(elem);
  }
  return ret;
}

function asignarIdCondicion(modelo){
  var ret = [];
  if(!(modelo instanceof Array)){
    modelo.id = globalId++;
    return modelo;
  }
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.id = globalId++;
    dicccionarioId[elem.id] = elem;
    if(elem.sentencia instanceof Array){
      elem.sentencia = asignarIdCondicion(elem.sentencia);
    } else if (elem.tipo == "condicion"){
      elem.sentencia = asignarIdCondicion(elem.sentencia);
    }
    ret.push(elem);
  }
  return ret;
}

//itera sobre el modelo, en caso de encontrar un gw dentro de una secuencia agrega una gw de cierre inmediatamente despues
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


//aplica iterativamente transformaciones al modelo
function procesarModelo(model){
  console.info("Crearndo modelo BPMN a partir de una instancia del modelo intermedio.");

  model = intermedio.asignarId(model.sentencia);
  model = intermedio.balancearModelo(model);
  // console.log(pd.json(model));
  aux = {};
  aux.tipo = "secuencia";
  aux.sentencia = model;
  aux.id = ++globalId;
  // model = recursivoFlujo(aux, "S", "F");
  model = intermedio.asignarFlujo(aux);
  return model;
}

console.log("Modulo modelo intermedio");


module.exports = {
  isGateway : isGateway ,
  asignarId : asignarId,
  balancearModelo : recursivoBalance,
  asignarFlujo : asignarFlujo,
  procesarModelo : procesarModelo,
  findById : findById,
  asignarIdCondicion: asignarIdCondicion,


};
