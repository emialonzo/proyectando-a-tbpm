var parser = require("./parser.js");

$(function() {
  console.log("doc ready");
  $('#modalGramatica').on('show.bs.modal', function (e) {
    var gramatica = parser.gramatica();
    console.log("gram::::" + gramatica);
    $('#fgramatica').val(gramatica);
  });

  $('#modal-actualizar').click(function(){
    console.log("actualizar");
    parser.actualizarGramatica($('#fgramatica').val());
  });

  $('#modal-save').click(function(){
    console.log("save");
    parser.guardarGramatica();
  });


});
