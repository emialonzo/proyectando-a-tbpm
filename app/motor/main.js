var bpmn = require("bpmn");
var fs = require('fs');
//
// var nombreArchivo = "salida.bpmn"
// var rutaArchivo = __dirname + "/motor/" + nombreArchivo
//
// console.log("antes de cargar proceso");
// bpmn.createUnmanagedProcess(rutaArchivo, function(err, myProcess){
//     console.log("Proceso cargado, listo para comenzar");
//     myProcess.triggerEvent("StartEvent");
//     console.log("Proceso comenzado!");
// });


var path = __dirname + "/"
// var fileName = "paralelo"
// var start = "Start Event";

var fileName = "prototipo"
var start = "StartEvent";

var pathCompleto = path + fileName + ".bpmn"
console.log(pathCompleto);
var canvas;

(function(BpmnViewer, $) {
  var bpmnViewer = new BpmnViewer({
    container: '#modelo'
  });
  var xml = fs.readFileSync(pathCompleto).toString();
  bpmnViewer.importXML(xml, function(err) {
    if (err) {
      return console.error('could not import BPMN 2.0 diagram', err);
    }
    canvas = bpmnViewer.get('canvas');
    // overlays = bpmnViewer.get('overlays');
    // // attach an overlay to a node
    // overlays.add('_7', 'note', {
    //   position: {
    //     bottom: 0,
    //     right: 0
    //   },
    //   html: '<div class="diagram-note">Mixed up the labels?</div>'
    // });
    // add marker
    // canvas.addMarker('_7', 'needs-discussion');
  });
})(window.BpmnJS, window.jQuery);



try {
  bpmn.createUnmanagedProcess(pathCompleto, function(err, proceso){
    if(err){
      console.error("Error?");
      console.error(err);
    }

    // we start the process
    try {
      proceso.triggerEvent("StartEvent");
    } catch (e) {
      console.error("Error al lanzar evento de inicio!!!!");
      console.error(e);
    }

  });
} catch (e) {
  console.error("Error al crear iniciar proceso");
  console.error(e);
}


// bpmn.createUnmanagedCollaboratingProcesses(pathCompleto,
//     function(err, collaboratingProcesses){
//   if(err){
//     console.error("Error?");
//     console.error(err);
//   }
//   console.log(collaboratingProcesses);
//   var proceso = collaboratingProcesses[0];
//   proceso.triggerEvent("StartEvent");
// });
