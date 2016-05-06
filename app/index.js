const electron = require('electron');
const ipcMain = require('electron').ipcMain;
const dialog = require('electron').dialog;
var fs = require('fs');

const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const appIndex = 'file://' + __dirname +  '/app/index.html';
const motorIndex = 'file://' + __dirname +  '/motor/index.html';

// Report crashes to our server.
electron.crashReporter.start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;
var engineWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.loadURL(appIndex);

  // and load the index.html of the app.

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  mainWindow.setMenu(null)


  // console.log(dialog.showOpenDialog({ properties: [ 'openFile', 'openDirectory', 'multiSelections' ]}));

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

});

ipcMain.on('abrir-motor', function(){
  mainWindow.hide();
  engineWindow = new BrowserWindow({width: 800, height: 600});
  engineWindow.loadURL(motorIndex);
  engineWindow.on('closed', function() {
    engineWindow = null;
    mainWindow.show();
  });
})


ipcMain.on('guardar-archivo', function(event, nombre_archivo, extension, contenido){
  // dialog.showSaveDialog([browserWindow, ]options[, callback])
  // console.log("guardando archivo:" + nombre_archivo);
  // console.log("extension:"+extension);
  // console.log("contenido:"+contenido);

  var path = dialog.showSaveDialog({
    'title':"Guardando archivo",
    'defaultPath': app.getPath('home'),
    'filters' : [
      { name: extension, extensions: [extension] },
  ]
  })
  if(path){
    if(!path.endsWith("."+extension)){
      path += "." + extension
    }
    console.log("Archivo a guardar:" + path);
    fs.writeFile(path, contenido+"\n", function(err) {
      if(err) {
        return console.log(err);
      }
    });
  }


})
