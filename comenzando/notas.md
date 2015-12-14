BPMN aspectos de calidad [O.I. Lindland, G. Sindre, and A. Sølvberg. Understanding quality in conceptual modeling. IEEE software, 11:42–49, 1994]
 - semantica, el modelo refleja correctamente el modelado dominio
 - sintáctica, esta bien escrito
 - programática, los involucrados entienden el modelo y saben trabajar con el

 3 tipos de etiquetados de oraciones: (J. Mendling, H.A. Reijers, and J. Recker. Activity labeling in process modeling: empirical insights and recommendations.)
 - verbo-objeto: (verbo en modo imperativo) aptobó un reclamo
 - acción-sustantivo: (verbo nominalizado) imprimiendo reclamo
 - resto

* el papaer principal
 Analisis de oracion:
 - extraer actores
 - extraer verbos
 - extraer objetos  y combinar con verbos
 - cada actor con cada accion
 - chequear global conjuntion

 Creando BPMN
 - crear nodos
 - crear flujos de secuencia
 - remover nodos dummy (sin flujo)
 - inicio y fin
 - meta actividades
 - constriur pools de caja negra
 - constriur objedos de datos


* Faster and More Focused Control-Flow Analysis for Business Process Models through SESE Decomposition
Buscan un algoritmo rápido para chequeo de calidad mediante el análisis de grafos: transformando al grafo en un rad petri de libre elección (free choise petri net) y luego usando teorema de rango (rank theorem) que si bien tiene orden cúbico no da información de diagnóstico.
Así que deciden usar una heurísitca para encontrar patrones que se observan en los modelos reales. Utiliza algunas reglas de reducción

* The Refined-diapo-vanhatalo
plantea hacer traducción a bpel para:
 - pasar de modelo de grafo a modelo de fragmentos
 - busqueda de patrones
 - analisis de control flujo
 - combinar proceos
 - detectar subprocesos
Determinan fragmentos si pueden modelarse como algo que tiene la misma cantidad de entradas y salidas (pag 17 de diapo) 
