// var auxiliares = require("./auxiliares");

function comenzarTarea(tarea, datos){
	console.log("Comenzando tarea '" + datos.tarea.nombre + "'");
	setTareaDisponible(tarea, datos);
	eventEmitter.on("fin-"+datos.tarea.nombre, function(){
		console.log("------>" + datos.tarea.nombre);
		tarea.taskDone(datos.tarea.nombre);
	});
}

// exports.StartEvent = function( data , done ){
// 	console.log("Start Event!");
// 	done(data);
// };

exports.hacer_A = function( data , done ){
	datos = {};
	datos.tarea = {};
	datos.tarea.nombre = "hacer A";
	datos.data = data;
	comenzarTarea(this, datos);

	// this.taskDone();
};

exports.hacer_B = function( data , done ){
	datos = {};
	datos.tarea = {};
	datos.tarea.nombre = "hacer B";
	datos.data = data;
	comenzarTarea(this, datos);
};

exports.hacer_C = function( data , done ){
	datos = {};
  datos.tarea = {};
  datos.tarea.nombre = "hacer C";
  datos.data = data;
  comenzarTarea(this, datos);
 };

exports.hacer_D = function( data , done ){
	datos = {};
  datos.tarea = {};
  datos.tarea.nombre = "hacer D";
  datos.data = data;
  comenzarTarea(this, datos);
};


exports.defaultEventHandler = function(eventType, currentFlowObjectName, handlerName, reason, done) {
    // Called, if no handler could be invoked.
    console.log("\teventType: " + eventType);
    console.log("\tcurrentFlowObjectName: " + currentFlowObjectName);
    console.log("\thandlerName: " + handlerName);
    console.log("\treason: " + reason);
    done();
};
//
// exports.defaultErrorHandler = function(error, done) {
//     // Called if errors are thrown in the event handlers
//     console.log("\t\tdefaultErrorHandler");
//     console.error(error);
//     done();
// };
//
// exports.onBeginHandler = function(currentFlowObjectName, data, done) {
//     // do something
//     console.log("**** onBeginHandler -> " + currentFlowObjectName + " **** ");
//     done(data);
// }
