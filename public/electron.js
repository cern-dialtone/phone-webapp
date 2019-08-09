const {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Menu,
  Tray,
  dialog
} = require('electron');

const path = require('path');
const isDev = require('electron-is-dev');
const storage = require('electron-json-storage');
const notifier = require('node-notifier');

const openAboutWindow = require('about-window').default;
const keytar = require('keytar');
const log = require('electron-log');
const { checkForUpdates } = require('./updater');

const logFormat = '{level} | {y}-{m}-{d} {h}:{i}:{s}:{ms} | {text}';
log.transports.rendererConsole.level = false;
log.transports.console.level = false;
log.transports.file.level = false;
if (!isDev) {
  log.transports.file.level = 'debug';
  log.transports.file.format = logFormat;
  log.transports.console.format = logFormat;
}

let mainWindow;
let authWindow;
let code;
let tray;
let forceQuit = false;

function isEmpty(ob) {
  for (const i in ob) {
    return false;
  }
  return true;
}

const appImagePath = isDev
  ? path.join(__dirname, '/../static/icon.png')
  : path.join(process.resourcesPath, 'icon.png');

const handleAuthClosedEvent = () => {
  // Dereference the authWindowdow object, usually you would store authWindowdows
  // in an array if your app supports multi authWindowdows, this is the time
  // when you should delete the corresponding element.
  authWindow = null;
};

const handleAuthDidNavigateEvent = (event, url) => {
  console.log(url);
  handleCallback(url);
};

const handleAuthDidFinishLoad = () => {
  console.log('Did finish load');
  if (mainWindow) {
    mainWindow.destroy();
  }
};

function createAuthWindow() {
  // Create the browser authWindowdow.
  authWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false
    },
    icon: appImagePath
  });

  const oauthUrl = `https://webrtc-auth.web.cern.ch`;

  authWindow.loadURL(oauthUrl);

  // Emitted when the authWindowdow is closed.
  authWindow.on('closed', handleAuthClosedEvent);
  authWindow.webContents.on('did-navigate', handleAuthDidNavigateEvent);
  authWindow.webContents.once('did-finish-load', handleAuthDidFinishLoad);
}

function logoutUser() {
  if (mainWindow) {
    console.log('Sendind logout request');
    mainWindow.webContents.send('logoutRequest');
  }
}

function unauthenticateUser() {
  storage.set('is_authenticated', {}, error => {
    keytar.deletePassword('cern-phone-app', 'access_token');
    keytar.deletePassword('cern-phone-app', 'refresh_token');
    keytar.deletePassword('cern-phone-app', 'tone_token');
    if (error) {
      console.log(`Error is_authenticated: ${error}`);
    }
    if (!authWindow) {
      createAuthWindow();
    }
    if (mainWindow) {
      mainWindow.destroy();
    }
  });
}

const showQuitDialog = () => {
  const options = {
    type: 'question',
    buttons: ['Minimize to tray', 'No', 'Yes'],
    title: 'Confirm',
    message: 'Are you sure you want to quit?'
  };
  const choice = dialog.showMessageBox(options);
  console.log(choice);
  if (choice === 2) {
    forceQuit = true;
    app.quit();
  }
  if (choice === 0) {
    hide();
  }
};

const openLogsFolder = () => {
  let logsPath;
  switch (process.platform) {
    case 'darwin':
      logsPath = path.join(
        app.getPath('home'),
        'Library',
        'Logs',
        'cern-phone-app',
        'log.log'
      );
      break;
    case 'win32':
      logsPath = path.join(
        app.getPath('home'),
        'AppData',
        'Roaming',
        'cern-phone-app',
        'log.log'
      );
      break;
    case 'linux':
      logsPath = path.join(
        app.getPath('home'),
        '.config',
        'cern-phone-app',
        'log.log'
      );
      break;
    default:
      break;
  }
  shell.showItemInFolder(logsPath);
};

const menu = Menu.buildFromTemplate([
  {
    label: 'App',
    submenu: [
      {
        label: 'About App',
        accelerator: 'CmdOrCtrl+A',
        click: () =>
          openAboutWindow({
            icon_path: appImagePath,
            product_name: 'CERN Phone App',
            package_json_dir: path.join(__dirname, '../'),
            use_version_info: true,
            license: 'GNU GENERAL PUBLIC (v3)',
            bug_link_text:
              'https://github.com/cern-dialtone/dial-clients/issues'
          })
      },
      {
        label: 'Check for updates...',
        accelerator: 'CmdOrCtrl+U',
        click: menuItem => {
          checkForUpdates(menuItem);
        }
      },
      {
        label: 'Open logs folder',
        accelerator: 'CmdOrCtrl+L',
        click: menuItem => {
          log.info('Clicked Open logs folder');
          openLogsFolder();
        }
      },
      {
        label: 'Logout',
        accelerator: 'CmdOrCtrl+O',
        click: () => {
          logoutUser();
        }
      },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          forceQuit = true;
          showQuitDialog();
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    role: 'window',
    submenu: [{ role: 'minimize' }, { role: 'close' }]
  }
]);

const sendAppHideNotification = () => {
  // Object
  notifier.notify({
    title: 'CERN Phone App',
    message: 'The app has been minimized to tray.'
  });
};

const showWindow = () => {
  if (mainWindow) {
    mainWindow.show();
  }
  if (authWindow && !mainWindow) {
    authWindow.hide();
  }
};

const createWindow = () => {
  console.log('Creating main window');
  mainWindow = new BrowserWindow({
    backgroundColor: '#F7F7F7',
    minWidth: 350,
    show: false,
    // titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true
    },
    height: 600,
    width: 1024,
    icon: appImagePath
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS
    } = require('electron-devtools-installer');

    installExtension(REACT_DEVELOPER_TOOLS)
      .then(name => {
        console.log(`Added Extension: ${name}`);
      })
      .catch(err => {
        console.log('An error occurred: ', err);
      });

    installExtension(REDUX_DEVTOOLS)
      .then(name => {
        console.log(`Added Extension: ${name}`);
      })
      .catch(err => {
        console.log('An error occurred: ', err);
      });
    require('devtron').install();
  }

  mainWindow.once('ready-to-show', () => {
    console.log('Showing main window');
    showWindow();

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    ipcMain.on('open-external-window', (event, arg) => {
      shell.openExternal(arg);
    });
  });

  mainWindow.on('close', e => {
    if (forceQuit) {
      app.quit();
    }

    if (!forceQuit) {
      e.preventDefault();
      showQuitDialog();
      // sendAppHideNotification();
    } else {
      app.quit();
    }
  });
};

/**
 *
 * @param url
 */
function handleCallback(url) {
  const rawCode = /code=([^&]*)/.exec(url) || null;
  code = rawCode && rawCode.length > 1 ? rawCode[1] : null;
  const error = /\?error=(.+)$/.exec(url);

  // If there is a code, proceed to get token from github
  if (code) {
    createWindow();
    authWindow.destroy();
  } else if (error) {
    alert(
      "Oops! Something went wrong and we couldn't " +
        'log you in using Github. Please try again.'
    );
  }
}

const handleAppCertificateError = (
  event,
  webContents,
  url,
  error,
  certificate,
  callback
) => {
  if (isDev) {
    process.stdout.write(`Preventing certificate error: ${url}\n`);
    event.preventDefault();
    callback(true);
  }
};

const hide = () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  sendAppHideNotification();
};

const toggleWindow = () => {
  const result = mainWindow && mainWindow.isVisible() ? hide() : showWindow();
  return result;
};

const createTray = () => {
  const imagePath = isDev
    ? path.join(__dirname, '/../static/icons/icon_16.png')
    : path.join(process.resourcesPath, 'icons', 'icon_16.png');

  tray = new Tray(imagePath);
  tray.on('click', event => {
    toggleWindow();
  });
};

const handleAppReady = () => {
  storage.get('is_authenticated', (error, data) => {
    if (error) throw error;

    if (isEmpty(data)) {
      console.log('empty dict');
    }

    Menu.setApplicationMenu(menu);
    createTray();

    if (!isEmpty(data) && data.authenticated === true) {
      code = data;
      createWindow();
    } else {
      createAuthWindow();
    }
  });
};

const appHandleAllWindowsClosed = () => {
  app.quit();
};
const appHandleActivate = () => {
  if (mainWindow === null) {
    createWindow();
  }
};

/**
 * App events
 */
app.on('certificate-error', handleAppCertificateError);
app.on('ready', handleAppReady);
app.on('window-all-closed', appHandleAllWindowsClosed);
app.on('activate', appHandleActivate);

app.on('activate-with-no-open-windows', () => {
  showWindow();
});

const appHandleLoadPage = (event, arg) => {
  mainWindow.loadURL(arg);
};

const handleUserAsAuthenticated = async obj => {
  if (obj.access_token && obj.refresh_token) {
    await keytar.setPassword(
      'cern-phone-app',
      'access_token',
      obj.access_token
    );
    await keytar.setPassword(
      'cern-phone-app',
      'refresh_token',
      obj.refresh_token
    );
  }
  storage.set('is_authenticated', { authenticated: true }, error => {});
};

const updateAccessToken = async obj => {
  if (obj.access_token) {
    await keytar.setPassword(
      'cern-phone-app',
      'access_token',
      obj.access_token
    );
  }
};

const ipcHandleSyncMessages = async (event, arg, obj = null) => {
  if (arg === 'code') {
    event.returnValue = code;
    return;
  }

  if (arg === 'user-unauthenticated') {
    event.returnValue = 'ok';
    unauthenticateUser();
    return;
  }

  if (arg === 'update-access-token') {
    await updateAccessToken(obj);
    event.returnValue = 'ok';
    return;
  }

  if (arg === 'user-authenticated') {
    await handleUserAsAuthenticated(obj);
    event.returnValue = 'ok';
  }

  if (arg === 'receiveCall') {
    event.returnValue = 'ok';
    if (obj && !obj.doNotDisturb) {
      showWindow();
    }
  }

  if (arg === 'getSecret' && obj && obj.name) {
    const secret = keytar.getPassword('cern-phone-app', obj.name);
    secret.then(result => {
      event.returnValue = result; // result will be 'secret'
    });
  }

  if (arg === 'saveToneToken' && obj && obj.name) {
    if (obj.tone_token) {
      keytar.setPassword('cern-phone-app', 'tone_token', obj.tone_token);
    }
    event.returnValue = 'ok';
  }

  if (arg === 'open-logs-folder') {
    openLogsFolder();
    event.returnValue = 'ok';
  }

  if (arg === 'setUpdateChannelValue') {
    console.log(`Setting update channel to ${obj.value}`);
    storage.set('update_channel', { channel: obj.value }, error => {
      console.error(`Unable to set updateChannel: ${error}`);
    });
    event.returnValue = 'ok';
  }
  if (arg === 'getUpdateChannelValue') {
    console.log('GetUpdateChannel');
    storage.get('update_channel', (error, data) => {
      if (error) event.returnValue = 'error';
      event.returnValue = data;
    });
  }
};

/**
 * Ipc events
 */
ipcMain.on('load-page', appHandleLoadPage);
ipcMain.on('synchronous-message', ipcHandleSyncMessages);