var mapName2HandlerName = require("bpmn").mapName2HandlerName;
// var mapName2HandlerName = bpmn.mapName2HandlerName
var events = require('events');
var eventEmitter = new events.EventEmitter();
// eventEmitter.on('doorOpen', ringBell);
// eventEmitter.emit('doorOpen');

////////// MENU
var menuTareas = {}
menuTareas.tareas = {}

menuTareas.getTarea = function(nombreTareas){
  return menuTareas.tareas[nombreTareas];
}
menuTareas.getTareas = function(nombreTareas){
  var listaTareas = [];
  for (var tarea_datos in menuTareas.tareas) {
    if (menuTareas.tareas.hasOwnProperty(tarea_datos)) {
      listaTareas.push(tarea_datos.datos.tarea.nombre);
    }
  }
  return listaTareas;
}
menuTareas.removerTarea = function(nombreTarea){
  var aux = menuTareas.tareas[nombreTarea];
  delete menuTareas.tareas[nombreTarea];
  $("#menuTareas").find("#menu-"+mapName2HandlerName(nombreTarea)).remove();
  return aux;
}
menuTareas.agregarTarea = function(tarea, datos){
  var nombreTarea = datos.tarea.nombre;
  var elemnto = $('<li><a href="#" class="elementoMenu" id="menu-'+mapName2HandlerName(nombreTarea)+'">'+nombreTarea+'</a></li>')
  elemnto.click(function(){

    eventEmitter.emit('renderTarea', nombreTarea);
  })
  // $("#menuTareas").append('<li><a href="#" class="elementoMenu" id="menu-'+nombreTarea+'">'+nombreTarea+'</a></li>');
  $("#menuTareas").append(elemnto)
  $("#menuTareas").click(tarea, function(){

  })
  console.log("Agergando tarea " + nombreTarea + " al diccionario.");
  menuTareas.tareas[nombreTarea] = {"tarea":tarea, "datos":datos}
  eventEmitter.emit('menuAgregar')
}

/////////// EVENTOS

eventEmitter.on('menuAgregar', function(){
  //manipular web para agregar un elemento al menu
  console.debug("Agregar elemento al menu")
});
eventEmitter.on('quitarMenu', function(){
  //manipular web para QUITAR un elemento al menu
  console.debug("Quitando elemento del menu")
});

eventEmitter.on('renderTarea', function(nombreTarea){
  console.debug("Renderizacion de tarea " + nombreTarea);
  var tarea_datos = menuTareas.getTarea(nombreTarea);
  renderTarea(tarea_datos);
  // console.log(tarea_datos.datos);
  // eventEmitter.on(tarea_datos.datos.tarea.nombre, function(){
  //   console.log("Tarea realizada!!!");
  //   tarea_datos.tarea.taskDone();
  // });
});

function getId(nombreTarea){
  aux = {
    "hacer A" : "_3",
    "hacer B" : "_7",
    "hacer C" : "_15",
    "hacer D" : "_11",
  }
  return aux[nombreTarea]
}

eventEmitter.on('finalizarTarea', function(nombreTarea){
  console.debug("Finaliza ejecución de tarea " + nombreTarea);
  var tarea_datos = menuTareas.getTarea(nombreTarea);
  console.log(tarea_datos);
  try {
    tarea_datos.tarea.taskDone(nombreTarea);
    menuTareas.removerTarea(nombreTarea);
    canvas.addMarker(getId(nombreTarea), 'needs-discussion');
  } catch (e) {
    console.error(">"+e+"<");
  }

  console.debug("*Finaliza ejecución de tarea " + nombreTarea);
});


function setTareaDisponible(tarea, datos){
  console.log("Tarea '" + datos.tarea.nombre + "' esta disponible");
  menuTareas.agregarTarea(tarea, datos);
  // tarea.taskDone(datos.tarea.nombre);
};

function renderTarea(tarea_datos){
  console.log("Mostrando render tareas");
  var renderArea = $("#renderArea");
  renderArea.html("<h1>" + tarea_datos.datos.tarea.nombre + "</h1>");
  form = $('<div class="form">Formulario</div>')
  button = $('<button class="form">Terminar Tarea '+ tarea_datos.datos.tarea.nombre +'</button>')

  button.click({"nombre":tarea_datos.datos.tarea.nombre}, function(event){
    console.log("Intentando terminar tarea " + event.data.nombre);
    eventEmitter.emit("finalizarTarea", event.data.nombre);
    $("#renderArea").empty();
  });
  // form.alpaca({
  //   "schema": {
  //       "title": "What do you think of Alpaca?",
  //       "type": "object",
  //       "properties": {
  //           "name": {
  //               "type": "string",
  //               "title": "Name"
  //           },
  //           "ranking": {
  //               "type": "string",
  //               "title": "Ranking",
  //               "enum": ['excellent', 'not too shabby', 'alpaca built my hotrod']
  //           }
  //       }
  //   },
  //   "options":{
  //     "form": {
  //           "buttons": {
  //               "Realizar": {
  //                   "click": function() {
  //                       var value = this.getValue();
  //                       alert(JSON.stringify(value, null, "  "));
  //                   }
  //               }
  //           }
  //       }
  //   }
  // });
  renderArea.append(form);
  renderArea.append(button);
  eventEmitter.emit(datos.tarea.nombre, tarea_datos);
};

// module.exports = {};
// module.exports.eventEmitter = eventEmitter;
// module.exports.setTareaDisponible = setTareaDisponible;
