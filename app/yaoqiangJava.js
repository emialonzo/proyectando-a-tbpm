//modulos
var fs = require('fs');
var x2js = require('x2js'); //new X2JS();
var crypto = require('crypto');

//inicializando convertirodor
var conv = new x2js();

//constantes
var nombreArchivo = "salida"
var filePathPng = __dirname + '/' + nombreArchivo + '.png';
var yaoqiangPath = __dirname + '/yaoqiang/modules/org.yaoqiang.bpmn.graph.jar'

var filePath = __dirname + '/' + nombreArchivo + '.bpmn';
var filePathBpmndi = __dirname + '/' + nombreArchivo + 'BPMNDI.bpmn';

var error = false;

var laneSet ;

function procesarYaoqiang(bpmn, callback){
  //inicializamos nombres de archivos temporales
  var random = crypto.randomBytes(4).readUInt32LE(0);
  var filePath = __dirname + '/' + nombreArchivo + random + '.bpmn';
  var filePathBpmndi = __dirname + '/' + nombreArchivo + random + 'BPMNDI.bpmn';

  //borramos laneSet por bug en yaoqiang
  var jsonBpmn = conv.xml_str2json( bpmn );
  laneSet = jsonBpmn.definitions.process.laneSet;
  delete jsonBpmn.definitions.process.laneSet;
  bpmn = conv.json2xml_str(jsonBpmn)

  //se guarda el bpmn en un archivo temporal para que pueda ser utilizado por yaoqiang
  fs.writeFile(filePath, bpmn, function(err) {
    if(err) {
      return console.log(err);
    }
  });

  //inicializamos la bandera de error en falso
  error = false;

  var child = require('child_process').spawn(
    'java', ['-jar', yaoqiangPath, filePath , '--export', filePathBpmndi]
  );

  child.stdout.on('data', function(data) {
  });

  child.stderr.on("data", function (data) {
    // var env = require('./app/env');
    // var excepcionSiFallaYaoqiang = env.excepcionSiFallaYaoqiang || false;
    // if(excepcionSiFallaYaoqiang){
    //   // console.error("Error al procesar en yaoqiang");
    //   throw "Error al procesar en yaoqiang"
    // }else{
    // }
    console.error(data.toString());
    error = true;

  });

  child.on('close', function (code) {
    if(!error){
      var xml = fs.readFileSync(filePathBpmndi).toString();

      var jsonYao = conv.xml_str2json( xml );

      //ajustando pools
      var listaShapes = jsonYao.definitions.BPMNDiagram.BPMNPlane.BPMNShape
      for (var i = 0; i < listaShapes.length; i++) {
        var shape = listaShapes[i];
        if(shape.Bounds._width<0){
          shape.Bounds._width = 200;
          shape.Bounds._height = shape.BPMNLabel.Bounds._height
          // shape.isExpanded="true"
        }
        listaShapes[i] = shape;
      }
      jsonYao.definitions.BPMNDiagram.BPMNPlane.BPMNShape = listaShapes;

      borrarArchivosTemporales(filePath, filePathBpmndi);
      callback(jsonYao.definitions.BPMNDiagram);
    }else{
      borrarArchivosTemporales(filePath, filePathBpmndi);
      callback({});
    }
  });
}


function borrarArchivosTemporales(filePath, filePathBpmndi){
  try {
    // console.log("Borrando archivo temporal " + filePath );
    fs.unlinkSync(filePath);
  } catch (e) {
    console.log("Archivo temporal " + filePath + " no existe.");
  }
  try {
    // console.log("Borrando archivo temporal " + filePathBpmndi );
    fs.unlinkSync(filePathBpmndi);
  } catch (e) {
    console.log("Archivo temporal " + filePathBpmndi + " no existe.");
  }
}


  var generarBpmndiJson = function(bpmn, callback){
    var bpmndi = procesarYaoqiang(bpmn, callback);
  }


module.exports = {
  generarBpmndiJson : generarBpmndiJson
};
