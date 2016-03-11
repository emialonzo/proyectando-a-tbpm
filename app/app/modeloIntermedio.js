var _ = require("underscore");
var pd = require('pretty-data').pd;

/////globales datos
//contador id
var globalId = 1;
//diccionario clave 'id', valor 'nodo'
var dicccionarioId = {};
//dicionario clave 'nombre de la tarea' valor 'nodo.id'
var tareas= {};

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
  var elem = dicccionarioId[id];
  // console.info("dicccionarioId["+ id + "]=" + pd.json(elem, 1));
  return elem;
}
function updateNodoById(id, nodo){
  return dicccionarioId[id] = nodo;
}
function updateNodo(nodo){
  return dicccionarioId[nodo.id] = nodo;
}

//recursivoFlujo
// PRE: los nodos deben tener id
// PRE: las gw deben estar balanceadas
// return: a cada nodo le agrega un flujo
function asignarFlujo(modelo){
  // var aux =  recursivoFlujo(modelo, ["S"], ["F"]);
  var aux =  recursivoFlujo(modelo, ["S"], ["F"]);
  // aux = corregirFlujoSecuencia(aux);
return aux;
}
function recursivoFlujo(nodox, ant, sig){
  if(_.isUndefined(nodox)){
    return ;
  }
  var nodo = findById(nodox.id);

  try {
    nodo.sig = sig;
    nodo.ant = ant;
  } catch (e) {
    console.error(pd.json(nodox));
    console.error(pd.json(nodo));
    console.error(pd.json(dicccionarioId, 2));
  }

  if(nodo.tipo == "secuencia"){
    var largo_secuencia = nodo.sentencia.length;
    if(largo_secuencia>1){
      nodo.sentencia[0] = recursivoFlujo(nodo.sentencia[0], ant, [nodo.sentencia[1].id]);
      // console.log("se atiende primero ", nodo.sentencia[0], " ant:", ant,);
      for (var i = 1; i < largo_secuencia - 1; i++) {
        nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], [nodo.sentencia[i-1].id], [nodo.sentencia[i+1].id]);
      }
      nodo.sentencia[largo_secuencia-1]
        = recursivoFlujo(nodo.sentencia[largo_secuencia-1], [nodo.sentencia[largo_secuencia-2].id], sig);
    } else{
      nodo.sentencia[0].ant = ant;
      nodo.sentencia[0].sig = sig;
    }
  } else if((nodo.tipo == "cierro") && (nodo.tag == "loop")){
    nodo.sig.push(nodo.ref);
    //console.log("El nodo ", nodo, ", de etiqueta ", nodo.tag , ", tiene en siguiente ", nodo.sig , "." );
  // } else if((nodo.tipo == "adjunto") && (nodo.tag == "loop")){
  } else if(nodo.tipo == "adjunto"){
    // var aux = recursivoFlujo({"tipo":"secuencia", "sentencia":nodo.sentencia}, nodo.id, sig);
    //obtengo flujo de la secuencia interna de la ejecucion del evento adjunto
    var aux = recursivoFlujo(nodo.sentencia[0], nodo.id, sig);
    nodo.sentencia = [aux];

    //obtengo la tarea a la que debo adjuntar
    var aux_id = tareas[nodo.adjunto_a];
    nodo.adjunto_a_id = aux_id;
    var aux_tarea = findById(aux_id);
    //la siguiente tarea del evento adjunto es la primera de la secuencia
    nodo.sig = [nodo.sentencia[0].sentencia[0].id];
    //la anterior no tiene, pero le pongo la de la tarea a ser adjuntada
    nodo.ant = [aux_tarea.id];
    //seteo lane
    nodo.lane = aux_tarea.sentencia.actor;
    //seteo la tarea anterior para el fin de la adjunta
    var aux_tarea_ant = findById(ant);
    var pos_max = 0;
    for (var i = 1; i < aux_tarea_ant.sig.length; i++) {
      if(aux_tarea_ant.sig[pos_max] < aux_tarea_ant.sig[i]){
        pos_max = i;
      }
    }
    aux_tarea_ant.sig[pos_max] = sig[0];
  }
  else if ( isGateway(nodo.tipo) ){
    nodo.sig = [];
    for (var i = 0; i < nodo.sentencia.length ; i++) {
      nodo.sig.push(nodo.sentencia[i].id);
      nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], [nodo.id], sig);
    }
  }
  updateNodo(nodo);
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
    }else if(elem.tipo == "adjunto"){
      elem.sentencia = asignarId(elem.sentencia);
    }else if(elem.tipo == "task"){
      tareas[elem.sentencia.accion] = elem.id;
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
      //console.log(elem);
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

function asignarLanes(modelo){
  var primerLane;
  var sinLane = [];
  var stack =[];
  var idActual, laneActual;
  var nodo;
  stack.push( modelo.id);
  while(stack.length>0){
    idActual = stack.pop();
    //console.debug("@@@@>" + idActual);
    try {
      nodo = findById(idActual);
      var boolea = nodo.tipo == "task";
    } catch (e) {
      console.error(pd.json(dicccionarioId));
    }
    // console.log(pd.json(nodo,0));
    if((nodo.tipo == "task") || (nodo.tipo == "evento")){
      laneActual = nodo.sentencia.actor;
      if(!primerLane){
        //console.log("");
        primerLane = laneActual;
      }
      nodo.lane = laneActual;
    } else{
      if(!nodo.lane){
        if(!laneActual){
          sinLane.push(nodo.id);
        } else{
          nodo.lane = laneActual;
        }
      }
      if(nodo.sentencia instanceof Array){
        // console.log("Revisando los hijos de " + nodo.tipo);
        for (var i = nodo.sentencia.length-1; i >= 0; i--) {
          //console.log("Tipo:"+nodo.tipo + " id:" + nodo.id + " agrega:" + nodo.sentencia[i].id);
          stack.push(nodo.sentencia[i].id);
        }
      }
    }
    updateNodo(nodo);
  } //fin while
  //ahora proceso los que no tienen lane
  sinLane.push("S");
  sinLane.push("F");
  //console.log("¡¡¡¡SIN LANES!!!!!");
  //console.log(sinLane);
  for (var i = 0; i < sinLane.length; i++) {
    nodo = findById(sinLane[i]);
    nodo.lane = primerLane;
    //console.log("El nodo " + nodo.id + " de tipo:" + nodo.tipo + " en lane:" + primerLane);
    updateNodo(nodo);
  }
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
  globalId = 1;
  dicccionarioId = {};
  if(!dicccionarioId){
    dicccionarioId = {};
  }
  dicccionarioId["S"] = crearEvento("Inicio");
  dicccionarioId["F"] = crearEvento("Fin");
}



//aplica las distintas transformaciones al modelo
var procesarModelo = function(model){
  inicializar();
  //console.info("Crearndo modelo BPMN a partir de una instancia del modelo intermedio.");
  model = asignarId(model.sentencia);
  // console.debug("Con id asignado");
  // console.log(pd.json(model));
  model = balancearModelo(model);
  // console.debug("MODELO BALANCEADO");
  // console.log(pd.json(model));
  aux = {};
  aux.tipo = "secuencia";
  aux.sentencia = model;
  aux.id = ++globalId;
  updateNodo(aux);
  model = asignarFlujo(aux);
  //console.log("LANES");
  asignarLanes(model);
  corregirFlujoSecuencia(model);
  //console.log("LANES FIN");
  model = dicccionarioId[aux.id];
  // console.debug("FLUJO");
  // console.log(pd.json(model));
  return model;
}

function corregirFlujoSecuencia(modelo) {
  var stack =[];
  var nodo;
  stack.push(modelo);
  // console.log(pd.json(dicccionarioId));
  // console.log("_______________________");
  // console.log(pd.json(modelo));
  while(stack.length>0){
    nodo = stack.pop();

    corregirSiguiente(nodo);

    if(nodo.sentencia instanceof Array){
      for (var i = nodo.sentencia.length-1; i >= 0; i--) {
        stack.push(nodo.sentencia[i]);
      }
    }
  } //fin while
  return findById(modelo.id)
}
function corregirSiguiente(nodo) {
  var ret = [];
  for (var i = 0; i < nodo.sig.length; i++) {
    // console.log("analizando el nodo con id " + nodo.id );
    // console.log("siguientes:" + nodo.sig );
    var id_sig = nodo.sig[i];
    if((id_sig == "S")||(id_sig == "F")){
      ret.push(id_sig);
    }else{
      var nodo_siguiente = findById(id_sig);
      if(nodo_siguiente.tipo == "secuencia"){
        ret.push(nodo_siguiente.sentencia[0].id);
      }else{
        ret.push(id_sig);
      }
    }
  }
  nodo.sig = ret;
  updateNodo(nodo);
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
