// var child = require('child_process').spawn('java done.jar',['argument to pass in']);
// var child = require('child_process').spawn('java xmlToImg');
var fs = require('fs');
var nombreArchivo = "salida"


var filePath = __dirname + '/' + nombreArchivo + '.bpmn';
var filePathPng = __dirname + '/' + nombreArchivo + '.png';
var filePathBpmndi = __dirname + '/' + nombreArchivo + 'BPMNDI.bpmn';
// console.log(filePath);

var yaoqiang = function(bpmn,callback, generarXml){
  // var generarXml = generarXml || true;
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
    console.log(data.toString());
  });

  child.on('close', function (code) {
    if(generarXml){
      var xml = fs.readFileSync(filePathBpmndi).toString();
      callback(xml);
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
