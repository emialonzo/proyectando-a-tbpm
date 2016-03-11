var fs = require('fs');

var ejemplos = {}
var nombre_archivo;
var path = __dirname + "/ejemplos/";
var aux;

items = fs.readdirSync(path);
for (var i=0; i<items.length; i++) {
  // aux = {}
  // aux.titulo = nombre_archivo = items[i];
  // aux.texto = fs.readFileSync(path + nombre_archivo).toString();
  // ejemplos.push(aux)
  // console.log(aux);
  nombre_archivo = items[i];
  ejemplos[nombre_archivo] = fs.readFileSync(path + nombre_archivo).toString();
}

// var pd = require('pretty-data').pd;
// console.log(pd.json(ejemplos));

module.exports = ejemplos;
