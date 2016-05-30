//generar archivos dot de graphviz  partir de el modelo de datos
var fs = require("fs");
var _ = require("underscore");
var pd = require('pretty-data').pd;
var intermedio = require('./modeloIntermedio');
var isGateway = intermedio.isGateway;

var x2js = require('x2js');
var conv = new x2js({
  arrayAccessFormPaths : [
    "definitions.process.startEvent" ,
    "definitions.process.userTask" ,
    "definitions.process.manualTask" ,
    "definitions.process.serviceTask" ,
    "definitions.process.exclusiveGateway" ,
    "definitions.process.parallelGateway" ,
    "definitions.process.intermediateCatchEvent" ,
    "definitions.process.intermediateThrowEvent" ,
    "definitions.process.boundaryEvent" ,
    "definitions.process.endEvent" ,
    "definitions.process.subProcess" ,
    "definitions.process.sequenceFlow"
  ]
});

var Viz = require('viz.js');




var toDot = function(xml){
  file = [];
  taskdot={};
  gwdot=[];
  flujodot=[];
  secuencias = {};

  processXml(xml)
  printFile(flujodot);
  return file.join("\n");
}

var saltoLinea = "\n"

function processXml(xml){
  // var finales = 1;
  //inicializacion
  var bpmn = conv.xml_str2json(xml)
  var proceso = bpmn.definitions.process
  //armando flujo
  if(proceso.sequenceFlow){
    for (var i = 0; i < proceso.sequenceFlow.length; i++) {
      var sec = proceso.sequenceFlow[i]
      var cond = ""
      if(sec.conditionExpression){
         cond = "[ label=\"" + sec.conditionExpression.__cdata.replace(/\"/g, "\\\"") + "\"]"
      }
      // if(sec._targetRef == "_EndEvent_1"){
      //   flujodot.push(sec._sourceRef + " -> " + sec._targetRef + "_" + (finales++) + cond)
      // }else{
        flujodot.push(sec._sourceRef + " -> " + sec._targetRef + cond)
      // }
    }
  }
  if(proceso.exclusiveGateway){
    for (var i = 0; i < proceso.exclusiveGateway.length; i++) {
      var exclusivo = proceso.exclusiveGateway[i]
      if(exclusivo._default){
        var defecto = exclusivo._default; // _num__num
        defecto = defecto.replace("__", " -> _")
        for (var j = 0; j < flujodot.length; j++) {
          var flujo = flujodot[j]
          if(flujo == defecto){
            flujodot[j] += " [arrowtail=rcrowlvee]"
          }
        }
      }
      flujodot.push(templateTarea(exclusivo._id, "XOR:" + saltoLinea + exclusivo._name, "paleturquoise2"))
    }

  }
  //armando tareas
  if(proceso.userTask){
    for (var i = 0; i < proceso.userTask.length; i++) {
      var tarea = proceso.userTask[i]
      flujodot.push(templateTarea(tarea._id, "TareaUsuario:" + saltoLinea + tarea._name, "seagreen1"))
    }
  }

  if(proceso.manualTask){
    for (var i = 0; i < proceso.manualTask.length; i++) {
      var tarea = proceso.manualTask[i]
      flujodot.push(templateTarea(tarea._id, "manualTask:" + saltoLinea + tarea._name, "seagreen2"))
    }
  }

  if(proceso.subProcess){
    for (var i = 0; i < proceso.subProcess.length; i++) {
      var tarea = proceso.subProcess[i]
      flujodot.push(templateTarea(tarea._id, "subProcess:" + saltoLinea + tarea._name, "seagreen3"))
    }
  }

  if(proceso.serviceTask){
    for (var i = 0; i < proceso.serviceTask.length; i++) {
      var tarea = proceso.serviceTask[i]
      flujodot.push(templateTarea(tarea._id, "serviceTask:" + saltoLinea + tarea._name, "seagreen4"))
    }
  }


  templateCapturaEvento(proceso)

  if(proceso.boundaryEvent){
    for (var i = 0; i < proceso.boundaryEvent.length; i++) {
      var adjunto = proceso.boundaryEvent[i]

      if(adjunto.timerEventDefinition){
        flujodot.push(templateTarea(adjunto._id, "ADJUNTO::Tiempo:\n" + adjunto.timerEventDefinition.timeDuration, "pink2"))
      }else if(adjunto.messageEventDefinition){
        flujodot.push(templateTarea(adjunto._id, "ADJUNTO::Mensaje:\n" + adjunto.messageEventDefinition._messageRef, "pink3"))
      }

      flujodot.push(adjunto._attachedToRef + " -> " + adjunto._id + "[label=adjunto fontcolor=red style=dotted]")
    }
  }

  if(proceso.parallelGateway){
    for (var i = 0; i < proceso.parallelGateway.length; i++) {
      var paralelo = proceso.parallelGateway[i]
      flujodot.push(templateTarea(paralelo._id, "AND:"  + saltoLinea + paralelo._name, "paleturquoise1"))
    }
  }

  if(proceso.startEvent){
    for (var i = 0; i < proceso.startEvent.length; i++) {
      var comienzo = proceso.startEvent[i]
      flujodot.push(templateTarea(comienzo._id, "COMIENZO:" + saltoLinea + comienzo._name, "pink"))
    }
  }

  if(proceso.endEvent){
    for (var i = 0; i < proceso.endEvent.length; i++) {
      var fin = proceso.endEvent[i]
      flujodot.push(templateTarea(fin._id, "FIN:" + saltoLinea + fin._name, "pink4"))
    }
  }
  // //FIXME parche
  // if(proceso.endEvent){
  //   for (var i = 0; i < proceso.endEvent.length; i++) {
  //     var fin = proceso.endEvent[i]
  //     for (var k = 1; k < finales; k++) {
  //       flujodot.push(templateTarea(fin._id + "_" + k, "FIN:" + saltoLinea + fin._name, "pink4"))
  //     }
  //   }
  // }

}

function templateCapturaEvento(proceso){
  if(proceso.intermediateCatchEvent){
    for (var i = 0; i < proceso.intermediateCatchEvent.length; i++) {
      var evento = proceso.intermediateCatchEvent[i]
      if(evento.timerEventDefinition){
        flujodot.push(templateTarea(evento._id, "Tiempo:\n" + evento.timerEventDefinition.timeDuration, "pink2"))
      }else if(evento.messageEventDefinition){
        flujodot.push(templateTarea(evento._id, "Mensaje:\n" + evento.messageEventDefinition._messageRef, "pink3"))
      }
    }
  }
}

function templateTarea(id, nombre, color){
  return id + " [label=\"id:" + id +" "+nombre + "\" fillcolor=\""+color+"\" ];";
}


var file = [];
function printFile() {
  file.push("digraph G01 {");
  file.push("rankdir=LR; node [shape=box, style=\"rounded, filled\"];");
  for (var key in taskdot) {
     var listaTareas = taskdot[key];
      file.push("subgraph cluster" + key.replace(/\s+/g, '_') + " { rankdir=LR;")
      file.push("labeljust=l;");
      file.push("label=\"Lane:" + key  + "\";");
     for (var prop in listaTareas) {
       file.push(listaTareas[prop]);
        // console.log(prop + " = " );
     }
     file.push("");
     file.push("}");
     file.push("");
  }
  _.map(gwdot, function(elem){file.push(elem);});
  _.map(flujodot, function(elem){file.push(elem);});
  file.push("}");
}

function templateDotTask(nodo){
  if(nodo.sentencia.task == "human")
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" fillcolor=\"red\" ];";
  else if(nodo.sentencia.task == "service")
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" fillcolor=\"green\" ];";
  else
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" fillcolor=\"blue\" ];";

}

function templateEventTask(nodo){
  // console.info(JSON.stringify(nodo));
  if(nodo.sentencia.evento.tiempo){
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.evento.tiempo + " " + nodo.sentencia.evento.unidad + "\" shape=circle fillcolor=\"aquamarine\" ];";
  } else if(nodo.sentencia.evento.mensaje){
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.evento.mensaje + "\" shape=circle fillcolor=\"cadetblue1\" ];";
  } else{
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" shape=circle fillcolor=\"white\" ];";
  }
}

function templateAdjuntoEventTask(nodo){
  // console.info(JSON.stringify(nodo));
  if(nodo.evento.tiempo){
    return nodo.id + " [label=\"id:" + nodo.id +" adjunto a " + nodo.adjunto_a + "\\n Evento:" + nodo.evento.tiempo + " " + nodo.evento.unidad + "\" shape=circle fillcolor=\"aquamarine\" ];";
  } else if(nodo.evento.mensaje){
    return nodo.id + " [label=\"id:" + nodo.id +" adjunto a " + nodo.adjunto_a + "\\n Evento: mensaje"+nodo.evento.mensaje + "\" shape=circle fillcolor=\"cadetblue1\" ];";
  }
  // else{
  //   return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia.accion + "\" shape=circle fillcolor=\"white\" ];";
  // }
}

function templateDotGw(nodo){
  if(nodo.tipo == "cierro"){
    return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.sentencia + "(" + nodo.ref + ")" + "\",  shape=diamond];";
  }
  return nodo.id + " [label=\"id:" + nodo.id +" "+nodo.tipo + "\",  shape=diamond];";
}

function templateDotFlow(nodo){
  var ret = [];
  if(!_.isUndefined(nodo.sig)){
    var aux;
    for (var i = 0; i < nodo.sig.length; i++) {
      aux = nodo.id + " -> " + nodo.sig[i] + ";";
      ret.push(aux);
    }
  }
  return ret;
}


var cp = require('child_process');

var executeDot = function(dot_file, callback){
    var image = Viz(dot_file, { format: "png-image-element" });
    callback(image)
    // var child = cp.fork(__dirname+'/workerDot.js', { execPath: "node" }, function(error, stdout, stderr) {
  //   console.log('stdout: ' + stdout);
  //   console.log('stderr: ' + stderr);
  //
  //   if (error !== null) {
  //     console.log('exec error: ' + error);
  //   }
  // });
  //
  // child.on('message', function(image) {
  //   console.log("Llega imagen");
  //   callback(image)
  // });
  // // console.log(pd.json(child));
  // child.send(dot_file);
}

module.exports = {
  toDot: toDot,
  executeDot: executeDot
};
