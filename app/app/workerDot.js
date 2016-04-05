var Viz = require('viz.js');
console.log("arranca hilo");

process.on('message', function(dot_file) {
  var image = Viz(dot_file, { format: "png-image-element" });
  console.log("graphviz generado");
  process.send(image);
  console.log("imagen enviada");
  process.exit();
});
