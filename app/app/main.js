// var $ = require("jquery");
var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var intermedio = require('./modeloIntermedio');
var procesar = require('./procesamientoModelo');
var toDot = require('./makeDot').toDot;
var ejemplos = require('./cargarEjemplos');

var Viz = require('viz.js');
var pd = require('pretty-data').pd;

var ejemploActivo;

// console.error = alert;

function conversion(){
  //obtengo texto
  var text = $("#id-modelo-texto").val();
  try {
    var modelo ;
    try {
      //parsea texto
      modelo = parser.parse(text);
    } catch (e) {
      console.error(e);
      console.error("Error al obtener modelo intermedio desde texto!");
      return;
    }

    var campos = modelo.campos;
    $("#id-forms").html(pd.json(campos));

    var expresiones = modelo.expresiones;
    $("#id-expresiones").html(pd.json(expresiones));

    //se muestra el modelo generado por la gramática
    $("#id-modelo-abstracto").text(jsonToString(modelo));

    try{
      var modeloInt = intermedio.procesarModelo(modelo.proceso);
      $("#id-modelo-abstracto-transformado").html(pd.json(modeloInt));
    }catch (e) {
      console.error(e);
      console.error("Error al procesar modelo!");
      return;
    }

    try {
      var dot = toDot(modeloInt);
      $("#id-dot").html(dot);
      image = Viz(dot, { format: "png-image-element" });
      // console.error(image);
      $("#id-bpmn-model").html(image);
      $("#id-bpmn-model img").addClass("img-responsive");
      $("#id-bpmn-model img").click(function(){
        $(this).toggleClass("img-responsive");
      });
    } catch (e) {
      console.error("error al obtener graphviz");
      console.error(e);
      return;
    }


    try {
      // var bpmn = makeBpmn.makeBpmn(modeloInt);
      // $("#id-xml-code").text(pd.xml(bpmn));
      //
      $("#id-xml-code").text(procesar.modelToXML(modeloInt));
    } catch (e) {
      console.error("error al pasar a xml");
      return;
    }

  } catch (e) {
    console.error(pd.json(e));
    console.error(e);
    return;
    // console.log(e.message);
  }

  $("#pestanias li:eq(0) a").tab('show');
  // $('#id-bpmn-container').tab('show');
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
  // console.log("jsonToString");
  // return JSON.stringify(str,null, 2);
  return pd.json(str);
}

var abc;

//carga los elementos del menu a partir de la lista ejemplos
function menu(){
  var ejemplo;

  for (var ejemplo in ejemplos) {
    if (ejemplos.hasOwnProperty(ejemplo)) {
      $("#barraEjemplos").append('<li><a href="#" class="ejemplo">'+ejemplo+'</a></li>');
    }
  }
  ejemploActivo = $("#barraEjemplos li:first");

  $(".ejemplo").click(function(){
    var titulo = $(this).html();
    console.log("click en " + titulo);
    //cargo texto
    $("#id-modelo-texto").val(ejemplos[titulo]);
    //desactivo "active" del resto de las
    ejemploActivo.removeClass("text-success");
    //agrego a la que hizo click
    $(this).addClass("text-success");
    ejemploActivo = $(this);
  });
}

var ejemploModeloAbstracto;
$(function() {
  menu();
  parser.init(__dirname + '/gramatica2.pegjs');

});
