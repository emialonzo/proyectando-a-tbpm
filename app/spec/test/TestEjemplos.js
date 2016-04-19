var fs = require('fs');

var directorioBase = __dirname + "/../../app/"
// dump(directorioBase);

var parser = require(directorioBase + "parser.js");
var makeBpmn = require(directorioBase + "makeBpmn.js");
var intermedio = require(directorioBase + 'modeloIntermedio');

var yaoqiang = require(__dirname + '/../../imageJava');

var intermedio = require(directorioBase + '/modeloIntermedio');

var path = directorioBase + "ejemplos/";
parser.init();

var ejemplos = {}
var items = fs.readdirSync(path);
for (var i=0; i<items.length; i++) {
  // aux = {}
  // aux.titulo = nombre_archivo = items[i];
  // aux.texto = fs.readFileSync(path + nombre_archivo).toString();
  // ejemplos.push(aux)
  // jasmine.log(aux);
  nombre_archivo = items[i];
  ejemplos[nombre_archivo] = fs.readFileSync(path + nombre_archivo).toString();
}

describe("Testeando ejemplos", function() {

  it("Reccorriendo ejemplos", function(){
    var correcto = [];
    var error = [];
    for (var nombre_archivo in ejemplos) {
      try{
        if (ejemplos.hasOwnProperty(nombre_archivo)) {
          var text = ejemplos[nombre_archivo];

          var modelo = parser.parse(text);
          var modeloInt = intermedio.procesarModelo(modelo);

          var bpmn = makeBpmn.makeBpmnForTest(modeloInt);

          yaoqiang.generarXml(bpmn, function(xml){
            correcto.push(nombre_archivo)
          });
        }
      } catch(e){
        error.push(nombre_archivo)
      }

    } //end for ejemplos
    console.log("paso: " + correcto + " | fallo:" + error);
  })

});
