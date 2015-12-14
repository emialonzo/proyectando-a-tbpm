## Componentes abracados BPMN2
### Procesos

``` xml
<definitions  
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:activiti="http://activiti.org/bpmn"
  targetNamespace="Examples">

  <process id="myProcess" name="My First Process">
  <!-- Aca va el resto de la definición del proceso -->
  </process>

</definitions>
```
### tareas
#### Tareas de usuario
``` xml
<userTask id="theTask" name="Important task" />
```
### Mensajes
#### Mensajes de secuencia
```xml
<sequenceFlow id="flow1" sourceRef="theStart" targetRef="theTask" />
```

### Gateways
#### Exclusivo
``` xml
<exclusiveGateway id="exclusiveGw" name="Exclusive Gateway" />

<sequenceFlow id="flow2" sourceRef="exclusiveGw" targetRef="theTask1">
  <conditionExpression xsi:type="tFormalExpression">${input == 1}</conditionExpression>
</sequenceFlow>

<sequenceFlow id="flow3" sourceRef="exclusiveGw" targetRef="theTask2">
  <conditionExpression xsi:type="tFormalExpression">${input == 2}</conditionExpression>
</sequenceFlow>

<sequenceFlow id="flow4" sourceRef="exclusiveGw" targetRef="theTask3">
  <conditionExpression xsi:type="tFormalExpression">${input == 3}</conditionExpression>
</sequenceFlow>
```
### Paralelo
``` xml
	<parallelGateway id="myParallelGateway" />
```
``` xml
<startEvent id="theStart" />
<sequenceFlow id="flow1" sourceRef="theStart" targetRef="fork" />

<parallelGateway id="fork" />
<sequenceFlow sourceRef="fork" targetRef="receivePayment" />
<sequenceFlow sourceRef="fork" targetRef="shipOrder" />

<userTask id="receivePayment" name="Receive Payment" />
<sequenceFlow sourceRef="receivePayment" targetRef="join" />

<userTask id="shipOrder" name="Ship Order" />
<sequenceFlow sourceRef="shipOrder" targetRef="join" />

<parallelGateway id="join" />
<sequenceFlow sourceRef="join" targetRef="archiveOrder" />

<userTask id="archiveOrder" name="Archive Order" />
<sequenceFlow sourceRef="archiveOrder" targetRef="theEnd" />

<endEvent id="theEnd" />
```


### Eventos
#### Evento comienzo
```xml
<startEvent id="start" name="Evento inicio" />
```

#### Evento fin
``` xml
<endEvent id="end" name="my end event" />
```

#### Eventos tiempo
``` xml
<timerEventDefinition>
    <timeDuration>P10D</timeDuration>
</timerEventDefinition>
```

### participantes
#### lanes
``` xml
<bpmn:process id="id proceos para ref" isExecutable="false">
<!-- dentro de la def del proceso -->
  <bpmn:laneSet><!-- puede haber varos lanes -->
    <bpmn:lane id="id lane" name="nombre del lane"> <!-- definicion de lane -->
      <bpmn:flowNodeRef>Id de tarea en el lane</bpmn:flowNodeRef>
```
## lenguaje definido
```
inicio
t es una tarea ejecuta por x
x ejecuta t

t1 es una tarea con ...
t3 es webserivce con ...

al inicio se ejecuta [en paralelo] t1, t2, t3.
luego de t1, se ejecuta [en paralelo] t4, t5
luego de t2, se ejecuta t6 [si (x > 0)]
luego de t2, se ejecuta t5
si pasan x minutos en t1, se ejecuta fin
```
#### Palbras reservadas
```
inicio
fin
es una tarea
es webservice
en paralelo
si
si pasan
minutos
se ejecuta
luego

```
