var _ = require("underscore");
var pd = require('pretty-data').pd;

/////globales datos
//contador id
var globalId;
//diccionario clave 'id', valor 'nodo'
var dicccionarioId = {};
//dicionario clave 'nombre de la tarea' valor 'nodo.id'
var tareas= {};

function inicializar(){
  globalId = 3;
  dicccionarioId = {};
  if(!dicccionarioId){
    dicccionarioId = {};
  }
  dicccionarioId["S"] = crearEvento("Inicio");
  dicccionarioId["F"] = crearEvento("Fin");
}

var cierrogw = function (elem){
  var nodo = {
    "tipo": "cierro",
    "sentencia" : elem.tipo,
    "tag": elem.tipo,
    "ref": elem.id,
    "id": globalId++
  }
  if(elem.expresion){
    nodo.expresion = elem.expresion
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

// recursivoFlujo
// PRE: los nodos deben tener id
// PRE: las gw deben estar balanceadas
// return: a cada nodo le agrega un flujo
function asignarFlujo(modelo){
  var aux =  recursivoFlujo(modelo, ["S"], ["F"]);
  return aux;
}

function recursivoFlujo(nodox, ant, sig){
  if(_.isUndefined(nodox)){
    return ;
  }
  var nodo = findById(nodox.id);
  var a_ant = nodo.ant;
  var a_sig = nodo.sig;
  var a_id = nodo.id;
  var a_tipo = nodo.tipo;
  try {
    //se le asigna al nodo el siguiente y el anterior
    //luego dependiendo del tipo se le hacen correcciones
    nodo.sig = [];
    _.map(sig, function(elem){nodo.sig.push(elem)});
    nodo.ant = ant;
  } catch (e) {
    console.error(pd.json(nodox));
    console.error(pd.json(nodo));
    console.error(pd.json(dicccionarioId, 2));
  }

  if(nodo.tipo == "secuencia"){
    // console.log("SECUENCIA:" + nodo.ant + " <- " + nodo.id + " -> " + nodo.sig);
    //si es una secuencia, hay que asignar sig y ant de todas las tareas internas
    var largo_secuencia = nodo.sentencia.length;
    if(largo_secuencia>1){
      nodo.sentencia[0] = recursivoFlujo(nodo.sentencia[0], ant, [nodo.sentencia[1].id]);
      for (var i = 1; i < largo_secuencia - 1; i++) {
        nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], [nodo.sentencia[i-1].id], [nodo.sentencia[i+1].id]);
      }
      nodo.sentencia[largo_secuencia-1]
        = recursivoFlujo(nodo.sentencia[largo_secuencia-1], [nodo.sentencia[largo_secuencia-2].id], sig);
    } else if(largo_secuencia>0){
      if(nodo.sentencia[0].finaliza){
        sig = ["F"];
      }
      // aux = recursivoFlujo(nodo.sentencia[0], ant, sig)
      // nodo.sentencia[0] = aux
      nodo.sentencia[0].ant = ant;
      nodo.sentencia[0].sig = sig;

    } else{
      // console.log("Secuencia vacia");
    }
  } else if((nodo.tipo == "cierro") && (nodo.tag == "loop")){
    //si es el cierro (compuerta de balance) de un loop  se asigna flujo defecto
    nodo.default = nodo.sig[0];

    //FIXME es un parche, la responsabilidad de asignar condiciones deberia estar en otra funcion
    nodo.condiciones = {}
    nodo.condiciones[nodo.ref] = nodo.expresion

    //asigna un flujo siguiente al
    nodo.sig.push(nodo.ref);
    // console.log("agrego el flujo: " + nodo.id + " -> " + nodo.ref);
  } else if(nodo.tipo == "adjunto"){
    //obtengo flujo de la secuencia interna de la ejecucion del evento adjunto
    var aux
    if(nodo.interrumpible){
      //si es interrumpible, el siguiente de un adjunto es el
      aux = recursivoFlujo(nodo.sentencia[0], nodo.id, sig);
    } else{
      //si la tarea a la cual se adjunta no se interrumpe
      //entonces lo que sale como alternativa debe estar conectado a un evento de fin
      //TODO que sea un evento de fin distinto
      aux = recursivoFlujo(nodo.sentencia[0], nodo.id, "F");
    }
    nodo.sentencia = [aux];

    //obtengo la tarea a la que debo adjuntar
    var aux_id = tareas[nodo.adjunto_a];
    nodo.adjunto_a_id = aux_id;
    var aux_tarea = findById(aux_id);
    if(!aux_tarea){
      console.error(pd.json(nodo));
      throw "Tarea '" + nodo.adjunto_a + "' no existe"
    }
    //la siguiente tarea del evento adjunto es la primera de la secuencia
    nodo.sig = [nodo.sentencia[0].sentencia[0].id];

    //no tiene tarea anteriror
    nodo.ant = [];
    // nodo.ant = [aux_tarea.id]; //la anterior no tiene, pero le pongo la de la tarea a ser adjuntada

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
    //si es un compuerta entonces se debe asingar el flujo a todos sus elementos internos
    // if(nodo.tipo=="loop"){
    //   console.log("El loop tenia" + pd.json(nodo));
    // }
    // var aux = sig[0];
    nodo.sig = [];
    for (var i = 0; i < nodo.sentencia.length ; i++) {
      nodo.sig.push(nodo.sentencia[i].id);
      // console.log("Compuerta:" + nodo.tipo + " ID:" + nodo.id + " sig:" + sig);
      nodo.sentencia[i] = recursivoFlujo(nodo.sentencia[i], [nodo.id], sig);
    }
  }
  if(nodo.finaliza){
    nodo.sig = ["F"]
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

// //toma un nodo de tipo compuerta y chequea si es necesario agregar compuerta de cierre
// function corroborarBalance(nodo){
//   var cantSalida = nodo.sentencia.length;
//   var cantTerminados = 0;
//   for (var i = 0; i < nodo.sentencia.length; i++) {
//     var secuencia = nodo.sentencia[i]
//     for (var j = 0; j < secuencia.sentencia.length; j++) {
//       var nodo_secuencia = secuencia.sentencia[j]
//       if(nodo_secuencia.finaliza){
//         cantTerminados++
//       }
//     }
//   }
//   console.debug("::: CorroborarBalance :::")
//   console.debug("cantSalida:"+cantSalida)
//   console.debug("cantTerminados:"+cantTerminados)
//
//   return cantSalida - cantTerminados > 1
// }

//itera sobre el modelo, en caso de encontrar un gw dentro de una secuencia agrega una gw de cierre inmediatamente despues
var balancearModelo = function(modelo){
  return recursivoBalance(modelo);
}

function recursivoBalance(modelo){
  var ret = [];
  while(modelo.length >0){
    var elem = modelo.shift();
    // if(isGateway(elem.tipo) && corroborarBalance(elem)){
    if(isGateway(elem.tipo)){
      modelo.unshift(cierrogw(elem));
    } else if((elem.tipo == "adjunto") && elem.interrumpible && !elem.unica){
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

function procesarEventosAdjuntos(){
  for (var key in dicccionarioId) {
    if (dicccionarioId.hasOwnProperty(key)) {
      if(dicccionarioId[key].tipo == "adjunto" && dicccionarioId[key].unica == true){
        var idAdjuntoA = dicccionarioId[key].adjunto_a_id
        var tarea = findById(idAdjuntoA)
        if(tarea.sig[0]!="F"){
          throw "Modelo mal formado!! No debieron tareas siguientes a \"" + dicccionarioId[key].adjunto_a + "\" dado que tiene una única salida por el evento adjunto."
        }else{
          tarea.sig = []
        }
        updateNodoById(idAdjuntoA, tarea)
      }
    }
  }
}

function eliminarXorInnecesarios(modelo){
  var stack =[];
  var nodo;
  stack.push(modelo);
  while(stack.length>0){
    nodo = stack.pop();
    try {
      //si tengo una compuerta xor con un elemento de entrada y uno solo de salida
      if( ((nodo.tipo == "cierro") && (nodo.sentencia = "xor")) && (nodo.sig.length == 1) && (nodo.ant.length == 1)){
      // if( (((nodo.tipo == "cierro") && (nodo.sentencia = "xor")) || (nodo.tipo == "xor")) && (nodo.sig.length == 1) && (nodo.ant.length == 1)){
        console.log("Se quita compuerta: " + nodo.id)
        anterior = findById(nodo.ant[0]);
        for (var i = 0; i < anterior.sig.length; i++) {
          if(anterior.sig[i] == nodo.id){
            anterior.sig[i] = nodo.sig[0];
          }
          if(anterior.default && (anterior.default == nodo.id)){
            anterior.default = nodo.sig[0];
          }
        }
        nodo.sig = [];
        updateNodo(anterior)
        updateNodo(nodo)
      }
    } catch (e) {
      console.error(e);
      console.error(pd.json(nodo));
    }
    if(nodo.sentencia instanceof Array){
      for (var i = nodo.sentencia.length-1; i >= 0; i--) {
        stack.push(nodo.sentencia[i]);
      }
    }
  } //fin while
  return findById(modelo.id)
}


function asociarCampos(modelo, campos) {
  if (campos) {
    var stack = [];
    var nodo;
    stack.push(modelo);
    while (stack.length > 0) {
      nodo = stack.pop();
      if (nodo.tipo == "task") {
        for (var i=0; i< campos.length; i++) {
          if (campos[i].tarea == nodo.sentencia.accion) {
            nodo.sentencia.campos = campos[i].campos;
            break;
          }
        }
      } else {
        if(nodo.sentencia instanceof Array){
          for (var i = nodo.sentencia.length-1; i >= 0; i--) {
            //console.log("Tipo:"+nodo.tipo + " id:" + nodo.id + " agrega:" + nodo.sentencia[i].id);
            stack.push(nodo.sentencia[i]);
          }
        }
      }
    }
  }
  return modelo;
}

function asociarExpresiones(modelo, expresiones) {
  // if (expresiones) {
    var stack = [];
    var nodo;
    stack.push(modelo);
    while (stack.length > 0) {
      nodo = stack.pop();
      if (nodo.tipo == "xor") {
        nodo.condiciones = {}
        for (var i=0; i < nodo.sentencia.length; i++) {
          if (nodo.sentencia[i].condicion != "defecto") {
            if(nodo.sentencia[i].sentencia[0]){
              nodo.condiciones[nodo.sentencia[i].sentencia[0].id] = nodo.sentencia[i].expresion;
            }else{
              nodo.condiciones[nodo.sentencia[i].sig[0]] = nodo.sentencia[i].expresion;
            }
          }
          else{
            // nodo.default = nodo.sentencia[i].sentencia[0].id;
            if(nodo.sentencia[i].sentencia[0]){
              nodo.default = nodo.sentencia[i].sentencia[0].id;
            }else{
              //permite secuencias vacias
              nodo.default =  nodo.sentencia[i].sig[0];
            }
          }
        }
        // console.debug("condiciones de " + nodo.id + ":" +nodo.condiciones);
      }

        if(nodo.sentencia instanceof Array){
          for (var i = nodo.sentencia.length-1; i >= 0; i--) {
            stack.push(nodo.sentencia[i]);
          }
        }
    }
  // }
}

//recorre el modelo y para coda nodo corrije el flujo del siguiente si corresponde
function corregirFlujoSecuencia(modelo) {
  var stack =[];
  var nodo;
  stack.push(modelo);
  while(stack.length>0){
    nodo = stack.pop();
    try {
      corregirSiguiente(nodo);
    } catch (e) {
      console.error(e);
      console.error(pd.json(nodo));
    } finally {

    }
    if(nodo.sentencia instanceof Array){
      for (var i = nodo.sentencia.length-1; i >= 0; i--) {
        stack.push(nodo.sentencia[i]);
      }
    }
  } //fin while
  return findById(modelo.id)
}

//corrije el flujo de la siguiente manera:
//en caso de que el siguiente nodo sea una secuencia se le asigna el primero de la secuencia
//si la secuencia es vacia, entonces el siguiente sera el siguiente de la secuencia
function corregirSiguiente(nodo) {
  var siguientes_nuevos = [];
  for (var i = 0; i < nodo.sig.length; i++) {
    var id_sig = nodo.sig[i];
    if((id_sig == "S")||(id_sig == "F")){
      siguientes_nuevos.push(id_sig);
    }else{
      var nodo_siguiente = findById(id_sig);
      if(nodo_siguiente.tipo == "secuencia"){
        if(nodo_siguiente.sentencia[0]){
          siguientes_nuevos.push(nodo_siguiente.sentencia[0].id);
        }else{
          siguientes_nuevos.push(nodo_siguiente.sig[0]);
          // siguientes_nuevos = nodo_siguiente.sig;
        }
      }else{
        siguientes_nuevos.push(id_sig);
      }
    }
  }
  nodo.sig = siguientes_nuevos;
  updateNodo(nodo);
}


//aplica las distintas transformaciones al modelo
var procesarModelo = function(model){
  var modelo = model.proceso;
  inicializar();
  //se asigna id
  modelo = asignarId(modelo.sentencia);
  //se balancea el modelo
  modelo = balancearModelo(modelo);

  aux = {};
  aux.tipo = "secuencia";
  aux.sentencia = modelo;
  aux.id = ++globalId;
  updateNodo(aux);
  //se asigna el flujo
  modelo = asignarFlujo(aux);
  //se asignan los lanes
  asignarLanes(modelo);
  //corregir flujo
  corregirFlujoSecuencia(modelo);

  modelo = asociarCampos(modelo, model.campos);
  modelo = asociarExpresiones(modelo, model.expresiones);

  // eliminarXorInnecesarios(dicccionarioId[aux.id]);
  //elimina el flujo de salida de una tarea que tenga un evento adjunto con UNICA en true
  procesarEventosAdjuntos();

  modelo = dicccionarioId[aux.id];
  return modelo;
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
