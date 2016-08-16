var parser = require("./parser.js");
var intermedio = require('./modeloIntermedio');
var makeBpmn = require("./makeBpmn");
var procesar = require('./procesamientoModelo');
var makeDot2 = require('./makeDot2');
var ejemplos = require('./cargarEjemplos');
var yaoqiang = require('../yaoqiangJava');
var env = require('./env');

var pd = require('pretty-data').pd;
var fs = require('fs');
const ipcRenderer = require('electron').ipcRenderer;

//variables globales
var BpmnModeler = window.BpmnJS;

var bpmnModeler;
var pre_xml_bpmndi;

var ejemploActivo;
var entrar = true;

var bpmnGlobales={};
var conYaoqiang = env.conYaoqiang;
var conBPMNDI = true;


var x2js = require('x2js'); //new X2JS();
var conv = new x2js();

var ejecutar = false;

//funciones
function conversion(){

  $("#id-bpmn-model").empty();
  $("#id-xml-activiti").text("");
  $("#id-xml-code").text("");
  if(bpmnModeler){
    bpmnModeler.clear();
  }
  if(!bpmnModeler){
    inicializarModeler();
  }

  //obtengo texto
  var text = $("#id-modelo-texto").val().toLowerCase();
  var nombre = $("#id-nombre-proceso").val().toLowerCase();

  try {
    var modelo ;
    try {
      //parsea texto
      modelo = parser.parse(text);
    } catch (e) {
      console.error("Error al obtener modelo intermedio desde texto!");
      mostrarError("Ha ocurrido un error al realizar el parser del texto, puede no esté escribiendo el texto acorde a la gramática.")
      errorParser(e);
      return;
    }
    limpiarMensajesError();


    //se muestra el modelo generado por la gramática
    $("#id-modelo-abstracto").text(jsonToString(modelo));

    try{
      var modeloInt = intermedio.procesarModelo(modelo);
      $("#id-modelo-abstracto-transformado").html(pd.json(modeloInt));
    }catch (e) {
      console.error(e);
      console.error("Error al procesar modelo!");
      mostrarError("Ha ocurrido un error interno mientras se aplicaban transformaciones al modelo generado.")
      return;
    }

    try {
      //generando xml
      var result = procesar.modelToXML(modeloInt, nombre);
      var resultActiviti = procesar.modelToXMLactiviti(result.modelo, result.proceso, result.nombreProceso);

      //ajustando nombres de variables
      var bpmn = result.xml;
      var bpmnActiviti = resultActiviti.xml;

      if(conBPMNDI){
        //consumiendo yaoqiang para obtener bpmndi de forma asincrónica
        generarBpmndi(bpmn, function(bpmn_di){
          $("#id-xml-code").text(pd.xml(bpmn_di));
          // $("#pestanias").animatescroll({scrollSpeed:2000,easing:'easeInOutBack', padding:20, element:"body"});
        });

        generarBpmndi(bpmnActiviti, function(bpmn_di){
          $("#id-xml-activiti").text(pd.xml(bpmn_di));
        });

      } else{
        $("#id-xml-code").text(pd.xml(bpmn));
        $("#id-xml-activiti").text(pd.xml(bpmnActiviti));
      }
    } catch (e) {
      console.error(e);
      console.error("error al pasar a xml");
      mostrarError("Ha ocurrido un error interno mientras se generaba el archivo BPMN")
      return;
    }

  } catch (e) {
    console.error(pd.json(e));
    console.error(e);
    mostrarError("Ha ocurrido un error interno inesperado.")
    return;
    // console.log(e.message);
  }

  if(entrar){
    $("#pestanias li:eq(2) a").tab('show');
    // entrar = false;
  }
  return modelo;
} //fin conversion()

function saveDiagram() {
  bpmnModeler.saveSVG({ format: true }, function(err, svg) {
    if(!err){
      // ipcRenderer.send('guardar-archivo', "titulo", "bpmn", pd.xml(agregarBPMNDI(bpmnGlobales.activiti, xml)) );
      ipcRenderer.send('guardar-archivo', "titulo", "svg",  svg);
    }else{
      console.error("Error:" + err);
    }
  });
}

function inicializarModeler(){
  // console.log("Inicializo modeler!!!");
  var div = $('<div id="canvas" style="height: 450px"></div>');
  // id="id-bpmn-container"
  $("#id-modeler-container").append(div);
  bpmnModeler = new BpmnModeler({
    container: '#canvas'
  });
  var button = $('<button type="button" id="getBpmn" class="btn btn-default" onclick="saveDiagram()"><span class="glyphicon glyphicon-save" aria-hidden="true"></span> Guardar Imagen</button>')
  $("#id-modeler-container").prepend(button)
  $(".djs-palette-entries div.group").each(function(){
    if($(this).data("group")!= "tools"){
      $(this).remove();
    }
  })
}

function importarEnModelador(xml){
  // console.log("Importando en modelador.");
  bpmnModeler.clear();
  bpmnModeler.importXML(xml, function(err) {
    if (err) {
      return console.error('could not import BPMN 2.0 diagram', err);
    }
    var canvas = bpmnModeler.get('canvas');
    // console.log("Modelo importado.");
  });
}

function generarDot(xml){
  makeDot2.generateImageElement(xml, callbackDot)
}

function callbackDot(image){
  // console.error(image);
  $("#id-dot").html(image);
  $("#id-dot img").addClass("img-responsive");
  $("#id-dot img").after("<hr />");
  $("#id-dot img").click(function(){
    $(this).toggleClass("img-responsive");
  });
}

function callbackXml(xml){
  $("#id-xml-ejecutar").text(pd.xml(xml));
  // importarEnModelador(xml);
  console.log("XML finalizado!");
  var myNotification = new Notification('XML terminado', {
    body: 'Se ha terminado de generar el XML'
  });
  myNotification.onclick = function () {
    // console.log('Notification clicked')
  }
}

function callbackYaoqiang(base64){
  var img = $('<img id="yaoqiang-img">');
  img.attr( 'src', 'data:image/png;base64,'+base64 );
  img.addClass("img-responsive");
  img.click(function(){
    $(this).toggleClass("img-responsive");
  });
  $("#id-bpmn-model").append(img);
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
    $("#id-nombre-proceso").val(titulo);

    //desactivo "active" del resto de las
    ejemploActivo.removeClass("text-success");
    //agrego a la que hizo click
    $(this).addClass("text-success");
    ejemploActivo = $(this);
  });
}

function posPegError(pegError) {
  // console.log(JSON.stringify(pegError));
  return [pegError.location.start.offset, pegError.location.end.offset]
}

function errorParser(pegError){
  // success info warning danger
  var tipo = "danger";

  var strError = pegError.toString()
  strError = strError.replace("SyntaxError: Expected", "Error de sintaxis. Se esperaba por:");
  strError = strError.replace("but", "pero se encontró");
  strError = strError.replace("end of input", "fin del texto");
  strError = strError.replace("found", "");


  var str = `<div class="alert alert-`+ tipo +` alert-dismissible" role="alert">
  <button type="button" class="close"
    data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
  ` + strError + `</div>`

  $("div#id-texto-container div#div-error").prepend(str);
  var pos = posPegError(pegError);
  $('#id-modelo-texto').get(0).setSelectionRange(pos[0], pos[1]);
}

function mostrarError(error){
  alert(error)
}

function limpiarMensajesError(){
  $("div#id-texto-container div#div-error").html("");
}

//agrega o sustituyo el bpmndi del xml por un bpmndi en formato json
function agregarBPMNDIJson(xmlBase, jsonBpmndi){
  var jsonBase = conv.xml_str2json( xmlBase );
  jsonBase.definitions.BPMNDiagram = jsonBpmndi;
  return conv.json2xml_str(jsonBase);
}

function generarBpmndi(bpmn, callback){
  yaoqiang.generarBpmndiJson(bpmn, function(bpmndi){
    // console.log("bpmn:"+bpmn);
    // console.log("bpmndi:"+bpmndi);
    callback(agregarBPMNDIJson(bpmn, bpmndi))
  });
}

// Le agrega o sustituye al primer XML el BPMNDI del segundo
function agregarBPMNDI(xmlBase, xmlBPMNDI){
  var jsonBpmndi = conv.xml_str2json( xmlBPMNDI );
  return agregarBPMNDIJson(xmlBase, jsonBpmndi.definitions.BPMNDiagram);
}

function agregarSpin(){
  if(!Spin){
    var Spin = require('spin');
  }
  var overlay = $('<div class="overlay" id="overlay-id" style="position: fixed; background: rgba(0,0,0,0.25); height: 100%; width: 100%; top:0px; left:0px; z-index: 10000;"></div>');
  overlay.appendTo($("body"));
  new Spin().spin(document.getElementById('overlay-id'))
  overlay.children().first().offset({ top: "50%", left: "50%" });
}


function quitarSpin(){
  // console.log("quitar spin");
  $("body #overlay-id").remove();
}


var tourInicializado = false;
var tour = undefined;

function ayuda(){
  console.log("ayuda!");
  if(!tourInicializado){
    tourInicializado=true;
    tour = new Tour({
      // debug: true,
      orphan: true,
      steps: [
        {
          element: "#barra-navegacion",
          title: "Ejemplos",
          content: "Una lista con los ejemplos básicos de la aplicación. Se eligen al hacer click.",
          placement: "right",
          onNext: function (tour) {$(".ejemplo ").first().trigger( "click" );},
        },
        {
          element: "#id-modelo-texto",
          title: "Editor de texto.",
          content: "Aquí se debe escribir la descripción del modelo en el lenguaje establecido.",
          placement: "bottom"
        },
        {
          element: "#getBpmn",
          title: "Ejecutar sistema",
          content: "Una vez escrito el modelo se debe hacer click para ejecutar el sistema.",
          onNext: function (tour) {$("#getBpmn").first().trigger( "click" );},
        },
        {
          element: "li #id-xml-container",
          title: "Resultado",
          content: "En esta pestaña se depliegan los resultados obtenidos de la aplicación.",
          placement: "top"
        }
      ]
    });
    tour.init();
    tour.restart();
    // tour.start();
    tour.goTo(0);
  }else{
    tour.restart();
    tour.goTo(0);
  }
}

var conteinerActual;
var xmlActual;

$(function() {

  $('.btn-descargar').click(function(){
    var idContainer = $(this).data('target');
    var xml = $(idContainer).text();
    ipcRenderer.send('guardar-archivo', "titulo", "bpmn", xml);
  })


  $('.btn-modeler').click(function(){
    // console.log("Abriendo modelador.");
    conteinerActual = $(this).parent().find("code");
    xmlActual = conteinerActual.text();
    importarEnModelador(xmlActual);
  })

  $('.btn-dot').click(function(){
    var xml = $(this).parent().find("code").text();
    generarDot(xml);
  })

  $('#modalModeler').on('hidden.bs.modal', function (e) {
    bpmnModeler.saveXML({ format: true }, function(err, xmlModeler) {
      if(!err){
        conteinerActual.text(pd.xml(agregarBPMNDI(xmlActual, xmlModeler)));
      }else{
        console.error("Error:" + err);
      }

    });
  });

  menu();
  parser.init(__dirname + '/gramatica2.pegjs');

});
