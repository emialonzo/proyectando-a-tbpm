// var child = require('child_process').spawn('java done.jar',['argument to pass in']);
// var child = require('child_process').spawn('java xmlToImg');
var fs = require('fs');
var nombreArchivo = "salida"


var filePath = __dirname + '/' + nombreArchivo + '.bpmn';
var filePathPng = __dirname + '/' + nombreArchivo + '.png';
// console.log(filePath);

var yaoqiang = function(bpmn,callback){
  fs.writeFile(nombreArchivo+".bpmn", bpmn, function(err) {
    if(err) {
        return console.log(err);
    }

  });

  try {
    fs.unlinkSync(filePathPng);
  } catch (e) {

  }
  var child = require('child_process').spawn(
    'java', ['-jar', 'yaoqian/modules/org.yaoqiang.asaf.bpmn-graph.jar', filePath , '--export']
  );

  child.stdout.on('data', function(data) {
    // console.log(data.toString());
  });

  child.stderr.on("data", function (data) {
    // console.log(data.toString());
  });

  child.on('close', function (code) {
    console.log('child process exited with code ',code);
    var base64Image = fs.readFileSync(filePathPng).toString('base64');
    callback(base64Image);
    return base64Image;
    // console.log(fs.readFileSync(filePathPng).toString('base64'));
  });
}

module.exports = yaoqiang;
