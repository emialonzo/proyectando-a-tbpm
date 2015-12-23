var PEG = require("pegjs");
var fs = require("fs");

var gramatica = null;
var parser = null;

var init = function(path){
  path = path || __dirname + '/gramatica.pegjs';
  gramatica = fs.readFileSync(path).toString();
  parser = PEG.buildParser(gramatica);
}

var parseText = function(text){
  if(parser == null){
    console.error("No se ha inicializado el parser correctamente.");
    throw "No se ha inicializado el parser correctamente.";
  }
  if(gramatica == null){
    console.error("No se ha inicializado la gramatica correctamente.");
    throw "No se ha inicializado la gramatica correctamente.";
  }
  var modeloAbstracto = parser.parse(text);
  return modeloAbstracto;
}

module.exports = {
  init : init,
  parse : parseText
}
