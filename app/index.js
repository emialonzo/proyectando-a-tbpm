const electron = require('electron');
const ipcMain = require('electron').ipcMain;

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

  // const dialog = require('electron').dialog;
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
