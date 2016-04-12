exports.tareaX = function( data , done ){
	console.log("se ejecuta tareaX");
  this.taskDone("tareaX", data);
};

exports.tareaY = function( data , done ){
  console.log("se ejecuta tareaY");
  this.taskDone("tareaY", data);
};

exports.tareaZ = function( data , done ){
 console.log("se ejecuta tareaZ");
 this.taskDone("tareaZ", data);
 };

exports.tareaA = function( data , done ){
 console.log("se ejecuta tareaA");
 this.taskDone("tareaA", data);
};

exports.tareaB = function( data , done ){
 console.log("se ejecuta tareaB");
 this.taskDone("tareaB", data);
};

exports.tareaFinal = function( data , done ){
 console.log("se ejecuta tareaFinal");
 this.taskDone("tareaFinal", data);
};

exports.tiempo$getTimeout = function(data, done) {
    // called when arriving on "Intermediate Catch Timer Event"
    // should return wait time in ms.

    return 1000 * 10;
};

exports.tiempo = function( data , done ){
    // called if the timeout triggers
	console.log(">Evento tiempo termiado<");
	done();
};


exports.tareaXDone = function( data , done ){
    // Called after the process has been notified that the task has been finished
    // by invoking myProcess.taskDone("MyTask").
    // Note: <task name> + "Done" handler are only called for
    // user tasks, manual task, and unspecified tasks
    console.log("tareaX se ha realizado");
    done(data);
};


/**
 * @param {String} eventType Possible types are: "activityFinishedEvent", "callHandler"
 * @param {String?} currentFlowObjectName The current activity or event
 * @param {String} handlerName
 * @param {String} reason Possible reasons:
 *                          - no handler given
 *                          - process is not in a state to handle the incoming event
 *                          - the event is not defined in the process
 *                          - the current state cannot be left because there are no outgoing flows
 */
exports.defaultEventHandler = function(eventType, currentFlowObjectName, handlerName, reason, done) {
    // Called, if no handler could be invoked.
    console.log("\teventType: " + eventType);
    console.log("\tcurrentFlowObjectName: " + currentFlowObjectName);
    console.log("\thandlerName: " + handlerName);
    console.log("\treason: " + reason);
    done();
};

exports.defaultErrorHandler = function(error, done) {
    // Called if errors are thrown in the event handlers
    console.log("\t\tdefaultErrorHandler");
    console.error(error);
    done();
};

exports.onBeginHandler = function(currentFlowObjectName, data, done) {
    // do something
    console.log("**** onBeginHandler **** ");
    done(data);
};

exports.onEndHandler = function(currentFlowObjectName, data, done) {
    // do something
    console.log("<<<<<<<<<< onEndHandler");
    done(data);
};
