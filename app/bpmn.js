var bpmn = require("bpmn");
var path = __dirname + "/processes/";

// var fileName = "exclusiveGateway"
// var start = "Start Event";

// var fileName = "intermediateTimerEvent"
// var start = "Start Event";

// var fileName = "timeout"
// var start = "MyStart";

var fileName = "paralelo"
var start = "Start Event";

// We assume there is a myProcess.js besides myProcess.bpmn that contains the handlers
try {
  bpmn.createUnmanagedProcess(path + fileName + ".bpmn", function(err, myProcess){

    // we start the process
    try {
      myProcess.triggerEvent(start);
    } catch (e) {
      console.error(e);
    }

  });
} catch (e) {
  console.error(e);
}


// function recur(){
//   console.log("probando");
//   setTimeout(recur(), 1000 *3);
// }
// var i=0;
// console.log(bpmn.ProcessManager());
// setInterval(function () {
//   console.log("bpmn:" + i++);
//   console.log(bpmn.ProcessManager());
// }, 1000 * 5);

// recur();
