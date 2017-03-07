const remote = require('electron').remote;
const subProcesos = require('./cargarSubProcesos');

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

var text ;
var startSelection  ;
var selectionEnd ;
var textArea;
var sub_menu_elementos = {};

var menu_nuevo = new Menu();
var sub_menu = generarSubMenu();

menu_nuevo.append(sub_menu)
menu_nuevo.append(new MenuItem({ type: 'separator' }));
menu_nuevo.append(new MenuItem({ label: 'Deshacer',  role: 'undo'}));
menu_nuevo.append(new MenuItem({ label: 'Cortar',  role: 'cut'}));
menu_nuevo.append(new MenuItem({ label: 'Copiar',  role: 'copy'}));
menu_nuevo.append(new MenuItem({ label: 'Pegar',  role: 'paste'}));
menu_nuevo.append(new MenuItem({ label: 'Seleccionar Todo',  role: 'selectall'}));

//funcion que toma un elemento del menu, el nombre de su etiqueta y lo sustituye en una variable global que contiene el area de texto
function menuItemClick(menu_item){
  var newText = text.substring (0, startSelection) +
  menu_item.label +
  text.substring (selectionEnd);
  textArea.value = newText;
}

//genera el submenu
function generarSubMenu(){
  var menu_sub_proc = new Menu();
  for (sub_proc of subProcesos()) {
    nombreSubProceso = sub_proc.substring (0, sub_proc.indexOf('.'));
    menu_sub_proc.append(new MenuItem({ label: nombreSubProceso, click: menuItemClick }));
    sub_menu_elementos[nombreSubProceso] = true;
  }
  return new MenuItem({ label: 'SubProcesos', submenu: menu_sub_proc});
}

//agrega un elemento al submenu
function agregarElemento(nombreSubProceso){
  if(!(nombreSubProceso in sub_menu_elementos)){
    sub_menu_elementos[nombreSubProceso] = true;
    sub_menu.submenu.append(new MenuItem({ label: nombreSubProceso, click: menuItemClick }));
  }
}


window.addEventListener('contextmenu', function (e) {
  console.debug("Click derecho")
  e.preventDefault();
  if (!e.target.closest('textarea, input, [contenteditable="true"]')) return;
  text = e.target.value;
  startSelection = e.target.selectionStart;
  selectionEnd = e.target.selectionEnd;
  textArea = e.target;

  menu_nuevo.popup(remote.getCurrentWindow());

}, false);



module.exports = {
  agregarElemento : agregarElemento
}
