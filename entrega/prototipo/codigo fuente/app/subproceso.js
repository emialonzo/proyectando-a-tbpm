
var xml =
"<definitions  " +
"  xmlns='http://www.omg.org/spec/BPMN/20100524/MODEL'  " +
"  xmlns:bpmndi='http://www.omg.org/spec/BPMN/20100524/DI'  " +
"  xmlns:dc='http://www.omg.org/spec/DD/20100524/DC'  " +
"  xmlns:di='http://www.omg.org/spec/DD/20100524/DI'  " +
"  xmlns:activiti='http://activiti.org/bpmn'  " +
"  xmlns:xsd='http://www.w3.org/2001/XMLSchema'  " +
"  xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' expressionLanguage='http://www.w3.org/1999/XPath' targetNamespace='http://sourceforge.net/bpmn/definitions/_1459655886338'> " +
"  <collaboration> " +
"    <participant id='pool_id' name='PoolProcess' processRef='id_proceso'/> " +
"  </collaboration> " +
"  <process id='id_proceso' isExecutable='true'> " +
"    <laneSet> " +
"      <lane id='Lane_usuario' name='usuario'> " +
"        <flowNodeRef>3</flowNodeRef> " +
"        <flowNodeRef>StartEvent_1</flowNodeRef> " +
"        <flowNodeRef>EndEvent_1</flowNodeRef> " +
"      </lane> " +
"    </laneSet> " +
"    <startEvent id='StartEvent_1'/> " +
"    <userTask id='_3' name='hace A' activiti:candidateGroups='usuario'> " +
"      <extensionElements> " +
"        <activiti:formProperty id='nombre' name='nombre' type='texto' required='true'></activiti:formProperty> " +
"        <activiti:formProperty id='apellido' name='apellido' type='texto' required='true'></activiti:formProperty> " +
"        <activiti:formProperty id='edad' name='edad' type='numero' required='false'></activiti:formProperty> " +
"      </extensionElements> " +
"    </userTask> " +
"    <serviceTask/> " +
"    <exclusiveGateway/> " +
"    <parallelGateway/> " +
"    <intermediateCatchEvent/> " +
"    <intermediateThrowEvent/> " +
"    <boundaryEvent/> " +
"    <endEvent id='EndEvent_1'/> " +
"    <subProcess/> " +
"    <sequenceFlow id='StartEvent_1_3' sourceRef='StartEvent_1' targetRef='3'></sequenceFlow> " +
"    <sequenceFlow id='3_EndEvent_1' sourceRef='3' targetRef='EndEvent_1'></sequenceFlow> " +
"  </process> " +
"</definitions> "
;

var obtenerXML = function(name) {
  //FIXME se deberia buscar en algun directorio el xml del proceso name para retornarlo aca.
  return xml;
}

module.exports = {
  obtenerXML : obtenerXML,
}
