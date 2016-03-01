var _ = require("underscore");
var pd = require('pretty-data').pd;

var globalId = 1;
var dicccionarioId = {};

var cierrogw = function (elem){
  var nodo = {
    "tipo": "cierro",
    "sentencia" : elem.tipo,
    "tag": elem.tipo,
    "ref": elem.id,
    "id": globalId++
  }
  dicccionarioId[nodo.id] = nodo;
  return nodo;
}

var gateway = {
  'xor':true,
  'and':true,
  'loop' : true,
}
function isGateway(tipo){
  return tipo in gateway;
}

function findById(id){
  return dicccionarioId[id];
}

//recursivoFlujo
// PRE: los nodos deben tener id
// PRE: las gw deben estar balanceadas
// return: a cada nodo le agrega un flujo
function asignarFlujo(modelo){
  var aux =  recursivoFlujo(modelo, ["S"], ["F"]);
return aux;
}
function recursivoFlujo(nodo, ant, sig){
  if(_.isUndefined(nodo)){
    return ;
  }
  findById(nodo.id);

  nodo.sig = sig;
  nodo.ant = ant;

  if(nodo.tipo == "secuencia"){
    var largo_secuencia = nodo.sentencia.length;
    if(largo_secuencia>1){
      nodo.sentencia[0] = recursivoFlujo(nodo.sentencia[0], ant, [nodo.sentencia[1].id]);
      for (var i = 1; i < largo_secuencia - 1; i++) {
        nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], nodo.sentencia[i-1].sig, [nodo.sentencia[i+1].id]);
      }
      nodo.sentencia[largo_secuencia-1]
        = recursivoFlujo(nodo.sentencia[largo_secuencia-1], nodo.sentencia[largo_secuencia-2].sig, sig);
    } else{
      nodo.sentencia[0].ant = ant;
      nodo.sentencia[0].sig = sig;
    }
  } else if((nodo.tipo == "cierro") && (nodo.tag == "loop")){
    console.log("El nodo ", nodo, ", de etiqueta ", nodo.tag , ", tiene en siguiente ", nodo.sig , "." );
    nodo.sig.push(nodo.ref);
  // } else if((nodo.tipo == "adjunto") && (nodo.tag == "loop")){
  } else if(nodo.tipo == "adjunto"){
    // console.log("El nodo ", nodo, ", de etiqueta ", nodo.tag , ", tiene en siguiente ", nodo.sig , "." );
    var aux = recursivoFlujo({"tipo":"secuencia", "sentencia":nodo.sentencia}, nodo.id, sig);
    nodo.sentencia = aux.sentencia;
    nodo.sig.push(nodo.ref);
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

//chequea si alguno de los
// function ajustarSiguienteSecuencia(nodo){
//   for (var i = 0; i < nodo.sig.length; i++) {
//     sig = findById(nodo.sig[i]);
//     if (sig){
//       if(sig.tipo == "secuencia"){
//         nodo.sig[i] = sig.sig;
//       }
//     }
//   }
// }

//toma un modelo y a cada elemento le agrega un id
function asignarId(modelo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    elem.id = globalId++;
    dicccionarioId[elem.id] = elem;
    if(elem.sentencia instanceof Array){
      elem.sentencia = asignarId(elem.sentencia);
    }if(elem.tipo == "adjunto"){
      elem.sentencia = asignarId(elem.sentencia.sentencia);
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
    } else if (elem.tipo == "loop") {
      console.log(elem);
      elem.sentencia = asignarIdCondicion(elem.sentencia);
    }
    ret.push(elem);
  }
  return ret;
}

//itera sobre el modelo, en caso de encontrar un gw dentro de una secuencia agrega una gw de cierre inmediatamente despues
var balancearModelo = function(modelo){
  return recursivoBalance(modelo);
}

function recursivoBalance(modelo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    if(isGateway(elem.tipo)){
      modelo.unshift(cierrogw(elem));
    } else if(elem.tipo == "adjunto"){
      modelo.unshift(cierrogw(elem));
    }
    if(elem.sentencia instanceof Array){
      elem.sentencia = recursivoBalance(elem.sentencia);
    }
    ret.push(elem);
  }
  return ret;
}

function crearEvento(tipo){
  return {
     "tipo": "evento",
     "sentencia": {
       "evento": {
         "tipo" : tipo
       }
     }
   }
}

function inicializar(){
  if(!dicccionarioId){
    dicccionarioId = {};
  }
  dicccionarioId["S"] = crearEvento("Inicio");
  dicccionarioId["F"] = crearEvento("Fin");
}

//aplica las distintas transformaciones al modelo
var procesarModelo = function(model){
  inicializar();
  console.info("Crearndo modelo BPMN a partir de una instancia del modelo intermedio.");
  model = intermedio.asignarId(model.sentencia);
  console.debug("Con id asignado");
  console.log(pd.json(model));
  model = intermedio.balancearModelo(model);
  console.debug("MODELO BALANCEADO");
  console.log(pd.json(model));
  aux = {};
  aux.tipo = "secuencia";
  aux.sentencia = model;
  aux.id = ++globalId;
  model = intermedio.asignarFlujo(aux);
  console.debug("FLUJO");
  console.log(pd.json(model));
  return model;
}

module.exports = {
  isGateway : isGateway ,
  asignarId : asignarId,
  balancearModelo : balancearModelo,
  asignarFlujo : asignarFlujo,
  procesarModelo : procesarModelo,
  findById : findById,
  asignarIdCondicion: asignarIdCondicion,
  dicccionarioId:dicccionarioId,
};
