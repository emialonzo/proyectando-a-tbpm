var PEG = require("pegjs");
var fs = require("fs");

var gramatica = null;
var parser = null;

//path es la ruta relativa donde se encuentra la gramatica,
var init = function(path){
  // var path = path || __dirname + '/gramatica.pegjs';
  var path = path || __dirname + '/gramatica2.pegjs'; //gramatica por defecto
  gramatica = fs.readFileSync(path).toString();
  parser = PEG.buildParser(gramatica);
}

var getGramatica = function(){
  return gramatica;
}

var actualizarGramatica = function(nueva_gramatica){
  gramatica = nueva_gramatica;
  parser = PEG.buildParser(gramatica);
  console.log("Gramatica actualizada");
}

var guardarGramatica = function(){
  var path = __dirname + '/gramatica.pegjs'
  fs.writeFile(path, gramatica, function (err) {
    if (err) return console.error(err);
    console.log("Gramatica guardada en " + path);
  });
}

function control(){
  if(parser == null){
    console.error("No se ha inicializado el parser correctamente.");
    throw "No se ha inicializado el parser correctamente.";
  }
  if(gramatica == null){
    console.error("No se ha inicializado la gramatica correctamente.");
    throw "No se ha inicializado la gramatica correctamente.";
  }
}

var parseText = function(text){
  try {
    control();
  } catch (e) {
    console.console.log("Tratando de inicializar.");
    init();
    control();
  }
  var modeloAbstracto = parser.parse(text);
  return modeloAbstracto;
}

module.exports = {
  init : init,
  parse : parseText,
  actualizarGramatica : actualizarGramatica,
  guardarGramatica : guardarGramatica,
  gramatica : getGramatica
}
