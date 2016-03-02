// var $ = require("jquery");
var parser = require("./parser.js");
var makeBpmn = require("./makeBpmn");
var intermedio = require('./modeloIntermedio');
var toDot = require('./makeDot').toDot;

var xmljson = require('xmljson');
var _ = require("underscore");
var x2js = require('x2js'); //new X2JS();
var conv = new x2js(); // conv.json2xml_str(json);
var Viz = require('viz.js');
var pd = require('pretty-data').pd;

function conversion(){
    parser.init(__dirname + '/gramatica2.pegjs');
  console.log("getAbstractModel");
  var text = $("#id-modelo-texto").val();
  var modelo = parser.parse(text);
  $("#id-bpmn-model").html("<p>Cargando imagen</p>");
  $("#id-modelo-abstracto").text(jsonToString(modelo));
  // console.log(makunction(elem){ makeBpmn.obtenerTareas(elem); })
  var modeloInt = intermedio.procesarModelo(modelo);
  // console.debug(modeloInt);
  $("#id-modelo-abstracto-transformado").html(pd.json(modeloInt));
  // $("#id-modelo-abstracto-transformado").append(pd.json(intermedio.dicccionarioId));
  console.info("++"+pd.json(intermedio.dicccionarioId));
  var dot = toDot(modeloInt);
  $("#id-dot").html(dot);

  // image = Viz(""+file, { format: "png-image-element" });
  image = Viz(dot, { format: "png-image-element" });

  // console.error(image);
  $("#id-bpmn-model").html(image);
  // document.body.appendChild(image);

  parser.init(__dirname + '/gramatica.pegjs');
  var modelo2 = parser.parse(text);
  modelo2 = intermedio.asignarIdCondicion(modelo2);
  makeBpmn.start();
  _.map(modelo2, function(elem){ makeBpmn.obtenerLanes(elem); })
  _.map(modelo2, function(elem){ makeBpmn.obtenerTareas(elem); })
  var j=0;
  for (var i=0 ; i<modelo.length-1 ; i++) {
    makeBpmn.generarFlujo(modelo2[j], modelo2[++j]);
  }
  makeBpmn.conectarStartEvent(modelo2);
  makeBpmn.conectarEndEvent(modelo2);
  // pd.xml(conv.json2xml_str(makeBpmn.proceso));

  $("#id-xml-code").text((pd.xml(conv.json2xml_str(makeBpmn.proceso))));

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
`el A X.
el A Y.
alternativa de X, si transcurre 20 segundos el A Z. el A espera por mensaje MMMM.`
//
// `el cocinero baila la gracamiglia.
// alternativa de baila la gracamiglia, si transcurre 20 segundos el cocinero loco. el cocinero espera por mensaje hoy canto.`;

var ejemploBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
<bpmn:collaboration id="Collaboration_08s4zor">
<bpmn:participant id="Participant_0j5ydp8" name="restaurante" processRef="Process_1" />
</bpmn:collaboration>
<bpmn:process id="Process_1" isExecutable="false">
<bpmn:laneSet>
<bpmn:lane id="Lane_0t1npma" name="cocinero">
<bpmn:flowNodeRef>Task_1h4lllm</bpmn:flowNodeRef>
</bpmn:lane>
<bpmn:lane id="Lane_1hwq0iu" name="mozo">
<bpmn:flowNodeRef>Task_1l1l4c6</bpmn:flowNodeRef>
<bpmn:flowNodeRef>Task_1xffedn</bpmn:flowNodeRef>
<bpmn:flowNodeRef>EndEvent_1doakpt</bpmn:flowNodeRef>
<bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
</bpmn:lane>
</bpmn:laneSet>
<bpmn:startEvent id="StartEvent_1">
<bpmn:outgoing>SequenceFlow_0tgjexu</bpmn:outgoing>
</bpmn:startEvent>
<bpmn:task id="Task_1l1l4c6" name="anotar predido">
<bpmn:incoming>SequenceFlow_0tgjexu</bpmn:incoming>
<bpmn:outgoing>SequenceFlow_1vjzni3</bpmn:outgoing>
</bpmn:task>
<bpmn:sequenceFlow id="SequenceFlow_0tgjexu" sourceRef="StartEvent_1" targetRef="Task_1l1l4c6" />
<bpmn:task id="Task_1h4lllm" name="cocinar pedido">
<bpmn:incoming>SequenceFlow_1vjzni3</bpmn:incoming>
<bpmn:outgoing>SequenceFlow_09q4td0</bpmn:outgoing>
</bpmn:task>
<bpmn:sequenceFlow id="SequenceFlow_1vjzni3" sourceRef="Task_1l1l4c6" targetRef="Task_1h4lllm" />
<bpmn:task id="Task_1xffedn" name="servir mesa">
<bpmn:incoming>SequenceFlow_09q4td0</bpmn:incoming>
<bpmn:outgoing>SequenceFlow_11j9uhx</bpmn:outgoing>
</bpmn:task>
<bpmn:sequenceFlow id="SequenceFlow_09q4td0" sourceRef="Task_1h4lllm" targetRef="Task_1xffedn" />
<bpmn:endEvent id="EndEvent_1doakpt">
<bpmn:incoming>SequenceFlow_11j9uhx</bpmn:incoming>
</bpmn:endEvent>
<bpmn:sequenceFlow id="SequenceFlow_11j9uhx" sourceRef="Task_1xffedn" targetRef="EndEvent_1doakpt" />
</bpmn:process>
<bpmndi:BPMNDiagram id="BPMNDiagram_1">
<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_08s4zor">
<bpmndi:BPMNShape id="Participant_0j5ydp8_di" bpmnElement="Participant_0j5ydp8">
<dc:Bounds x="108" y="133" width="685.2344689378757" height="419" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
<dc:Bounds x="173" y="190" width="36" height="36" />
<bpmndi:BPMNLabel>
<dc:Bounds x="146" y="226" width="90" height="20" />
</bpmndi:BPMNLabel>
</bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1l1l4c6_di" bpmnElement="Task_1l1l4c6">
<dc:Bounds x="265" y="168" width="100" height="80" />
</bpmndi:BPMNShape>
<bpmndi:BPMNEdge id="SequenceFlow_0tgjexu_di" bpmnElement="SequenceFlow_0tgjexu">
<di:waypoint xsi:type="dc:Point" x="209" y="208" />
<di:waypoint xsi:type="dc:Point" x="265" y="208" />
<bpmndi:BPMNLabel>
<dc:Bounds x="192" y="198" width="90" height="20" />
</bpmndi:BPMNLabel>
</bpmndi:BPMNEdge>
<bpmndi:BPMNShape id="Lane_1hwq0iu_di" bpmnElement="Lane_1hwq0iu">
<dc:Bounds x="138" y="133" width="655.2344689378757" height="250" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Lane_0t1npma_di" bpmnElement="Lane_0t1npma">
<dc:Bounds x="138" y="383" width="655.2344689378757" height="169" />
</bpmndi:BPMNShape>
<bpmndi:BPMNShape id="Task_1h4lllm_di" bpmnElement="Task_1h4lllm">
<dc:Bounds x="393.2344689378757" y="423.6623246492986" width="100" height="80" />
</bpmndi:BPMNShape>
<bpmndi:BPMNEdge id="SequenceFlow_1vjzni3_di" bpmnElement="SequenceFlow_1vjzni3">
<di:waypoint xsi:type="dc:Point" x="315" y="248" />
<di:waypoint xsi:type="dc:Point" x="315" y="464" />
<di:waypoint xsi:type="dc:Point" x="393" y="464" />
<bpmndi:BPMNLabel>
<dc:Bounds x="334" y="326" width="90" height="20" />
</bpmndi:BPMNLabel>
</bpmndi:BPMNEdge>
<bpmndi:BPMNShape id="Task_1xffedn_di" bpmnElement="Task_1xffedn">
<dc:Bounds x="500.2344689378757" y="168" width="100" height="80" />
</bpmndi:BPMNShape>
<bpmndi:BPMNEdge id="SequenceFlow_09q4td0_di" bpmnElement="SequenceFlow_09q4td0">
<di:waypoint xsi:type="dc:Point" x="493" y="464" />
<di:waypoint xsi:type="dc:Point" x="550" y="464" />
<di:waypoint xsi:type="dc:Point" x="550" y="248" />
<bpmndi:BPMNLabel>
<dc:Bounds x="451.5" y="326" width="90" height="20" />
</bpmndi:BPMNLabel>
</bpmndi:BPMNEdge>
<bpmndi:BPMNShape id="EndEvent_1doakpt_di" bpmnElement="EndEvent_1doakpt">
<dc:Bounds x="657.2344689378757" y="190" width="36" height="36" />
<bpmndi:BPMNLabel>
<dc:Bounds x="630.2344689378757" y="226" width="90" height="20" />
</bpmndi:BPMNLabel>
</bpmndi:BPMNShape>
<bpmndi:BPMNEdge id="SequenceFlow_11j9uhx_di" bpmnElement="SequenceFlow_11j9uhx">
<di:waypoint xsi:type="dc:Point" x="600" y="208" />
<di:waypoint xsi:type="dc:Point" x="657" y="208" />
<bpmndi:BPMNLabel>
<dc:Bounds x="583.5" y="198" width="90" height="20" />
</bpmndi:BPMNLabel>
</bpmndi:BPMNEdge>
</bpmndi:BPMNPlane>
</bpmndi:BPMNDiagram>
</bpmn:definitions>`;
var ejemploModeloAbstracto;
$(function() {
  parser.init(__dirname + '/gramatica2.pegjs');

  ejemploModeloAbstracto = parser.parse(ejemploTexto);

  $("#id-modelo-texto").val(ejemploTexto);
  $("#id-xml-code").text(ejemploBpmn);
  $("#id-modelo-abstracto").text(jsonToString(ejemploModeloAbstracto));

  abc = ejemploModeloAbstracto;

  // $('#pestanias li').click(function (e) {
  //   $(this).addClass("disabled");
  // })

  // xmljson.to_json(ejemploBpmn, function(error, data){
  //   // console.log(JSON.stringify(data, 1));
  // });
  // bpmnImg.getImage(ejemploBpmn);

});
