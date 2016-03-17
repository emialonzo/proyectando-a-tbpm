// var $ = require("jquery");
var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var intermedio = require('./modeloIntermedio');
var procesar = require('./procesamientoModelo');
var toDot = require('./makeDot').toDot;
var ejemplos = require('./cargarEjemplos');

// var x2js = require('x2js'); //new X2JS();
// var conv = new x2js(); // conv.json2xml_str(json);
var Viz = require('viz.js');

var pd = require('pretty-data').pd;

function conversion(){

  //obtengo texto
  var text = $("#id-modelo-texto").val();
  //parsea texto
  try {
    var modelo = parser.parse(text);
    //se pone el modelo generado
    $("#id-modelo-abstracto").text(jsonToString(modelo));
    var modeloInt = intermedio.procesarModelo(modelo);
    $("#id-modelo-abstracto-transformado").html(pd.json(modeloInt));
    var dot = toDot(modeloInt);
    $("#id-dot").html(dot);
    image = Viz(dot, { format: "png-image-element" });
    // console.error(image);
    $("#id-bpmn-model").html(image);

    // var bpmn = makeBpmn.makeBpmn(modeloInt);

    // $("#id-xml-code").text(pd.xml(bpmn));
    try {
      $("#id-xml-code").text(procesar.modelToXML(modeloInt));
    } catch (e) {
      console.error("eeror al pasar a xml");
    }
  } catch (e) {
    console.error(pd.json(e));
    console.error(e);

    // console.log(e.message);
  }

  $('#id-modelo-abstracto-container').tab('show');
  return modelo;
}

function parseSVG(s) {
  var div= document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
  div.innerHTML= '<svg xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
  var frag= document.createDocumentFragment();
  while (div.firstChild.firstChild)
  frag.appendChild(div.firstChild.firstChild);
  return frag;
}

function crearSvg(id, svgContent){
  document.innerHTML(id).appendChild(parseSVG(svgContent));
}

function safe_tags(str) {
  console.log("safe_tags");
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
}

function jsonToString(str){
  console.log("jsonToString");
  return JSON.stringify(str,null, 2);
}

var abc;


var ejemploTexto =
// el cocinero ejecuta el servicio baila la gracamiglia.
// el cocinero espera por 30 segundos.
// al mismo tiempo, 1 el A XX. 2 el A XY. el A XZ. fin

// `el A X.
// el A Y.
// alternativa de X, si transcurre 20 segundos el A Z. el A espera por mensaje MMMM.`

`el A X.
la A Y.
la A Z.
alternativa de X, si transcurre 20 segundos la A L. la A M. la A N. fin
al mismo tiempo,
1 la A I. la A II. la A III.
2 la A J. si se cumple,
condi  entonces la A K. la A KK.
condii entonces el A L.
condiii entonces la A T.
si no la A U. la A UU.
fin
la A JJ.
fin`



function menu(){
  var ejemplo;

  for (var ejemplo in ejemplos) {
    if (ejemplos.hasOwnProperty(ejemplo)) {
    $("#barraEjemplos").append('<li><a href="#" class="ejemplo">'+ejemplo+'</a></li>');
    }
  }

  // for (var i = 0; i < ejemplos.length; i++) {
  //   ejemplo = ejemplos[i]
  //   $("#barraEjemplos").append('<li><a href="#" class="ejemplo">'+ejemplo.titulo+'</a></li>');
  // }

  $(".ejemplo").click(function(){
    var titulo = $(this).html();
    $("#id-modelo-texto").val(ejemplos[titulo]);
  });
}

var ejemploModeloAbstracto;
$(function() {
  menu();


  $("#id-modelo-texto").val(ejemploTexto);
  // $("#id-xml-code").text(ejemploBpmn);
  // $("#id-modelo-abstracto").text(jsonToString(ejemploModeloAbstracto));

  parser.init(__dirname + '/gramatica2.pegjs');
  // conversion();

  // $('#pestanias li').click(function (e) {
  //   $(this).addClass("disabled");
  // })

  // xmljson.to_json(ejemploBpmn, function(error, data){
  //   // console.log(JSON.stringify(data, 1));
  // });
  // bpmnImg.getImage(ejemploBpmn);

});
