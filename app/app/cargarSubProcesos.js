var fs = require('fs');

var subProcesos = []
var nombre_archivo;
var path = __dirname + "/XMLbasicos/";
var aux;

var subProcesos = function(){
  return fs.readdirSync(path);
}

module.exports = subProcesos;
