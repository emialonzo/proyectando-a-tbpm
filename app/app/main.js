
// var $ = require("jquery");
var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var intermedio = require('./modeloIntermedio');
var procesar = require('./procesamientoModelo');
var makeDot = require('./makeDot');
var makeDot2 = require('./makeDot2');
var ejemplos = require('./cargarEjemplos');
var yaoqiang = require('../imageJava');
var env = require('./env');

var pd = require('pretty-data').pd;
var fs = require('fs');
const ipcRenderer = require('electron').ipcRenderer;

var BpmnModeler = window.BpmnJS;
// var Modeler = require('bpmn-js/lib/Modeler');
var bpmnModeler;
var pre_xml_bpmndi;

var ejemploActivo;
var entrar = true;

var conYaoqiang = env.conYaoqiang;


var x2js = require('x2js'); //new X2JS();
var conv = new x2js();

var ejecutar = false;
function ejecutarProceso(xml){
  var xml = $("#id-xml-ejecutar").text() || xml || ""
  fs.writeFileSync(__dirname + "/../motor/" + "motor.bpmn", pd.xml(xml));
  ipcRenderer.send('abrir-motor');
}

// if(codeMirror){
//   console.log("esta seteado el code mirror");
//   console.log(codeMirror);
// }
// else{
//   console.log("sin code mirror");
// }

// PRUEBAS
// var xmlText = '<userTask completionQuantity="1" id="_3" implementation="##unspecified" isForCompensation="false" name="tarea" startQuantity="1"><ioSpecification><dataOutput id="Dout_3_1" itemSubjectRef="xsd:string" name="outNombre"/><dataOutput id="Dout_3_2" itemSubjectRef="xsd:int" name="outEdad"/><inputSet/><outputSet><dataOutputRefs>Dout_3_1</dataOutputRefs><dataOutputRefs>Dout_3_2</dataOutputRefs></outputSet></ioSpecification>id="Dout_ " itemSubjectRef="xsd:string" name="outNombre"<property id="_3_P_1" itemSubjectRef="xsd:string" name="nombre"/><property id="_3_P_2" itemSubjectRef="xsd:int" name="edad"/><dataOutputAssociation id="DOA_3_1"><sourceRef>Dout_3_1</sourceRef><targetRef>_3_P_1</targetRef></dataOutputAssociation><dataOutputAssociation id="DOA_3_2"><sourceRef>Dout_3_2</sourceRef><targetRef>_3_P_2</targetRef></dataOutputAssociation></userTask>';
// var jsonObj = conv.xml_str2json( xmlText );
// console.log("pruebas" + pd.json(jsonObj));

// console.error = alert;

function saveDiagram() {
  bpmnModeler.saveXML({ format: true }, function(err, xml) {
    if(!err){
      ipcRenderer.send('guardar-archivo', "titulo", "bpmn", xml);
    }
  });
}

function conversion(){
  $("#id-bpmn-model").empty();
  if(bpmnModeler){
    bpmnModeler.clear();
  }
  //obtengo texto
  var text = $("#id-modelo-texto").val();
  var nombre = $("#id-nombre-proceso").val();
  // console.log("##########################################")
  // console.log(nombre)
  // console.log("##########################################")
  try {
    var modelo ;
    try {
      //parsea texto
      modelo = parser.parse(text);
    } catch (e) {
      // console.error(e);
      // console.error(pd.json(e));
      console.error("Error al obtener modelo intermedio desde texto!");
      mostrarError("Ha ocurrido un error al realizar el parser del texto, puede no esté escribiendo el texto acorde a la gramática.")
      errorParser(e);
      return;
    }
    limpiarMensajesError();

    var campos = modelo.campos;
    $("#id-forms").html(pd.json(campos));

    var expresiones = modelo.expresiones;
    $("#id-expresiones").html(pd.json(expresiones));

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
      if(conYaoqiang){
        var result = procesar.modelToXML(modeloInt, nombre);
        var bpmn = result.xml;
        var resultActiviti = procesar.modelToXMLactiviti(result.modelo, result.proceso, result.nombreProceso)
        var bpmnActiviti = resultActiviti.xml;

        //var bpmn = pd.xml(makeBpmn.makeBpmn(modeloInt));
        $("#id-xml-code").text(bpmn);
        $("#id-json-code").text(pd.json(conv.xml_str2json(bpmn)));
        $("#id-xml-activiti").text(bpmnActiviti);
        try{
          var dot2 = makeDot2.toDot(bpmnActiviti);
          $("#id-dot").html(dot2);
          makeDot.executeDot(dot2, callbackDot)
        } catch(e){
          $("#id-dot").html("error!!");
          mostrarError("Ha ocurrido un error interno mientras se generaba el gráfico de flujo con la herramienta Graphviz")
        }

        yaoqiang.generarImagen(bpmn, callbackYaoqiang);
        yaoqiang.generarXml(bpmn, callbackXml);

        if(!bpmnModeler){
          var div = $('<div id="canvas" style="height: 450px"></div>');
          // id="id-bpmn-container"
          $("#id-modeler-container").append(div);
          bpmnModeler = new BpmnModeler({
            container: '#canvas'
          });

          var button = $('<button type="button" id="getBpmn" class="btn btn-default" onclick="saveDiagram()"><span class="glyphicon glyphicon-save" aria-hidden="true"></span></button>')

          $("#id-modeler-container").prepend(button)

          $(".djs-palette-entries div.group").each(function(){
            if($(this).data("group")!= "tools"){
              $(this).remove();
            }
          })
        }
      } else{
        var procesoBPMN = procesar.modelToXML(modeloInt, nombre);
        $("#id-xml-code").text(procesoBPMN);
        var procesoJSON = procesar.xml2json(procesoBPMN);
        $("#id-json-code").text(procesoJSON);
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
    $("#pestanias li:eq(0) a").tab('show');
    entrar = false;
  }
  return modelo;
}

function callbackDot(image){
  // console.error(image);
  $("#id-dot").prepend(image);
  $("#id-dot img").addClass("img-responsive");
  $("#id-dot img").after("<hr />");
  $("#id-dot img").click(function(){
    $(this).toggleClass("img-responsive");
  });
}

function callbackXml(xml){
  // console.error(image);
  // $("#id-xml-container").append("<hr/>");
  // if(!pre_xml_bpmndi){
  //   pre_xml_bpmndi = $('<pre id="xml-bpmndi" />');
  //   $("#id-xml-container").append(pre_xml_bpmndi);
  // }
  $("#id-xml-ejecutar").text(pd.xml(xml));
  // pre_xml_bpmndi.text(pd.xml(xml));
  // console.error(xml);

  bpmnModeler.importXML(xml, function(err) {
    if (err) {
      return console.error('could not import BPMN 2.0 diagram', err);
    }
    var canvas = bpmnModeler.get('canvas');
    // canvas.zoom('fit-viewport');
  });
  console.log("XML finalizado!");
  var myNotification = new Notification('XML terminado', {
    body: 'Se ha terminado de generar el XML'
  });

  myNotification.onclick = function () {
    // console.log('Notification clicked')
  }
}

function callbackYaoqiang(base64){
  // console.log("base64::" + base64);
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
    $("#id-nombre-proceso").val(titulo);

    //desactivo "active" del resto de las
    ejemploActivo.removeClass("text-success");
    //agrego a la que hizo click
    $(this).addClass("text-success");
    ejemploActivo = $(this);
  });
}

var ejemploModeloAbstracto;

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

$(function() {
  $('.btn-descargar').click(function(){
    var idContainer = $(this).data('target');
    var xml = $(idContainer).text();
    ipcRenderer.send('guardar-archivo', "titulo", "bpmn", xml);
    if(ejecutar){
      ejecutarProceso(xml)
    }
    // console.log(xml);


  })
  menu();
  parser.init(__dirname + '/gramatica2.pegjs');

});
