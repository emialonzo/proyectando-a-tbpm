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
