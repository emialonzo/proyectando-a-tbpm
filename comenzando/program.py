import re
from xml.etree import ElementTree

ET = ElementTree

rootStr = '<?xml version="1.0" encoding="UTF-8"?> <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn"></bpmn:definitions>'
# root = ET.fromstring(rootStr)

def getXmlBpmnTuple():
    ## root of bpmn file
    root = ET.Element('bpmn:definitions')
    root.set('xmlns:bpmn','http://www.omg.org/spec/BPMN/20100524/MODEL')
    root.set('xmlns:bpmndi','http://www.omg.org/spec/BPMN/20100524/DI')

    # pool
    # <bpmn:collaboration id="Collaboration_0i99z6v">
    # <bpmn:participant id="Participant_1d9t24q" processRef="Process_1" />
    # </bpmn:collaboration>
    pools = ET.SubElement(root, 'bpmn:collaboration')

    # process
    process = ET.SubElement(root, 'bpmn:process')
    return (root, pools, process)

def addTask(xmlBpmn, id, name):
    root = xmlBpmn
    process = root.find('process')
    task = ET.SubElement(process, 'bpmn:usertask')
    task.set('id',id)
    task.set('name',name)
    return task


(bpmn, pools, process) = getXmlBpmnTuple()
# addTask(bpmn, '1', 'desdplegar formulario')
# addTask(bpmn, '2', 'desplegar confirmacion')
ET.dump(bpmn)

tareas = []
lanes = []
flujo = []


# cadena="""Se ejecuta la tarea desplegar formulario, mostrando los campos nombre;telefono
# Se ejecuta la tarea desplegar confirmacion, mostrando los nombre;telefono
# Un administrador, ejecuta la tarea
# """
cadena = "la tarea formulario cambiado, se ejecuta luego de formulario sin cambiar"
# pat = '(\w+\s)tarea([\,]),(.*)'
pat = '(\w*)'
patron = re.compile(pat)
matcher = patron.search(cadena)
print matcher.groups()
