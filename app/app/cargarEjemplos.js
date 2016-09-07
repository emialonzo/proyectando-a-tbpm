var fs = require('fs');

var ejemplos = {}
var nombre_archivo;
var path = __dirname + "/ejemplos/";
var aux;

items = fs.readdirSync(path);
for (var i=0; i<items.length; i++) {
  nombre_archivo = items[i];
  ejemplos[nombre_archivo] = fs.readFileSync(path + nombre_archivo).toString();
}


module.exports = ejemplos;
