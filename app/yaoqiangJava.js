//modulos
var fs = require('fs');
var x2js = require('x2js'); //new X2JS();

//inicializando convertirodor
var conv = new x2js();


//constantes
var nombreArchivo = "salida"
var filePath = __dirname + '/' + nombreArchivo + '.bpmn';
var filePathPng = __dirname + '/' + nombreArchivo + '.png';
var filePathBpmndi = __dirname + '/' + nombreArchivo + 'BPMNDI.bpmn';
var yaoqiangPath = __dirname + '/yaoqian/modules/org.yaoqiang.asaf.bpmn-graph.jar'


var laneSet ;

// bpmn str
var yaoqiang = function(bpmn,callback, generarXml){
  // var generarXml = generarXml || true;

  //borramos laneSet por bug en yaoqiang
  var jsonBpmn = conv.xml_str2json( bpmn );
  laneSet = jsonBpmn.definitions.process.laneSet;
  delete jsonBpmn.definitions.process.laneSet;
  bpmn = conv.json2xml_str(jsonBpmn)

  // console.log("bpmn:" + bpmn);

  fs.writeFile(filePath, bpmn, function(err) {
    if(err) {
      return console.log(err);
    }
  });

  var formato = generarXml? 'salidaBPMNDI.bpmn' : 'salida.png'

  var child = require('child_process').spawn(
    'java', ['-jar', yaoqiangPath, filePath , '--export', __dirname+'/'+formato]
  );
  child.stdout.on('data', function(data) {
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

function procesarYaoqiang(bpmn, callback){
  //borramos laneSet por bug en yaoqiang
  var jsonBpmn = conv.xml_str2json( bpmn );
  laneSet = jsonBpmn.definitions.process.laneSet;
  delete jsonBpmn.definitions.process.laneSet;

  bpmn = conv.json2xml_str(jsonBpmn)

  // console.log("Y aca es "+bpmn);

  fs.writeFile(filePath, bpmn, function(err) {
    if(err) {
      return console.log(err);
    }
  });

  // console.log("filePath"+fs.readFileSync(filePath).toString());

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
      console.log(data.toString());
    // }
  });

  child.on('close', function (code) {
    var xml = fs.readFileSync(filePathBpmndi).toString();
    // console.log("xml final:" + xml);

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

    // console.debug(jsonYao.definitions.BPMNDiagram);
    callback(jsonYao.definitions.BPMNDiagram);
  });
}

var generarBpmndiJson = function(bpmn, callback){
  try {
    fs.unlinkSync(filePathBpmndi);
  }catch (e) {

  }
  var bpmndi = procesarYaoqiang(bpmn, callback);
}

module.exports = {
  generarImagen : generarImagen,
  generarXml : generarXml,
  generarBpmndiJson : generarBpmndiJson
};
