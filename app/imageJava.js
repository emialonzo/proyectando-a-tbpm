// var child = require('child_process').spawn('java done.jar',['argument to pass in']);
// var child = require('child_process').spawn('java xmlToImg');
var fs = require('fs');
var nombreArchivo = "salida"

var x2js = require('x2js'); //new X2JS();
var conv = new x2js();



var filePath = __dirname + '/' + nombreArchivo + '.bpmn';
var filePathPng = __dirname + '/' + nombreArchivo + '.png';
var filePathBpmndi = __dirname + '/' + nombreArchivo + 'BPMNDI.bpmn';
// console.log(filePath);

var laneSet ;

var yaoqiang = function(bpmn,callback, generarXml){
  // var generarXml = generarXml || true;

  //borramos laneSet por bug en yaoqiang
  var jsonBpmn = conv.xml_str2json( bpmn );
  laneSet = jsonBpmn.definitions.process.laneSet;
  delete jsonBpmn.definitions.process.laneSet;


  fs.writeFile(nombreArchivo+".bpmn", bpmn, function(err) {
    if(err) {
        return console.log(err);
    }
  });

  var formato = generarXml? 'salidaBPMNDI.bpmn' : ''

  var child = require('child_process').spawn(
    'java', ['-jar', 'yaoqian/modules/org.yaoqiang.asaf.bpmn-graph.jar', filePath , '--export', formato]
  );
  child.stdout.on('data', function(data) {
    // console.log(data.toString());
  });

  child.stderr.on("data", function (data) {
    var env = require('./app/env');
    var excepcionSiFallaYaoqiang = env.excepcionSiFallaYaoqiang || false;
    if(excepcionSiFallaYaoqiang){
      // console.error("Error al procesar en yaoqiang");
      throw "Error al procesar en yaoqiang"
    }else{
      console.log(data.toString());
    }
  });

  child.on('close', function (code) {
    if(generarXml){
      //leo archivo xml
      var xml = fs.readFileSync(filePathBpmndi).toString();

      //inicializando ajuste de archivo generado
      var jsonBpmn = conv.xml_str2json( bpmn );
      var jsonYao = conv.xml_str2json( xml );
      //ajustando pools
      var listaShapes = jsonYao.definitions.BPMNDiagram.BPMNPlane.BPMNShape
      for (var i = 0; i < listaShapes.length; i++) {
        var shape = listaShapes[i]
        if(shape.Bounds._width<0){
          shape.Bounds._width = 200;
          shape.Bounds._height = shape.BPMNLabel.Bounds._height
          // shape.isExpanded="true"
        }
        listaShapes[i] = shape
      }
      //ajustando condiciones
      // jsonYao.definitions.process.sequenceFlow = jsonBpmn.definitions.process.sequenceFlow
      jsonBpmn.definitions.BPMNDiagram = jsonYao.definitions.BPMNDiagram;
      jsonBpmn.definitions.process.laneSet = laneSet;

      // callback(xml);
      callback(conv.json2xml_str(jsonBpmn))
    }else{
      var base64Image = fs.readFileSync(filePathPng).toString('base64');
      callback(base64Image);
      return base64Image;
    }
  });
}


var generarImagen = function(bpmn, callback){
  try {
    fs.unlinkSync(filePathPng);
  } catch (e) {

  }
  yaoqiang(bpmn, callback, false);
}

var generarXml = function(bpmn, callback){
  try {
    fs.unlinkSync(filePathBpmndi);
  } catch (e) {

  }
  yaoqiang(bpmn, callback, true);
}

module.exports = {
  generarImagen : generarImagen,
  generarXml : generarXml
};
