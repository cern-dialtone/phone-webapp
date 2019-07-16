import Raven from 'raven-js';
import ReactPiwik from 'react-piwik';

import log from 'electron-log';

const { remote } = window.require('electron');
const remoteLog = remote.require('electron-log');

const logFormat = '{level} | {h}:{i}:{s}:{ms} | {processType} | {text}';
log.transports.file.level = false;
if (process.env.NODE_ENV === 'production') {
  log.transports.console.level = false;
} else {
  log.transports.console.level = 'debug';
  log.transports.console.format = logFormat;
}

(() => {
  // saving the original console.log function
  // const preservedConsoleLog = console.log;
  // const preservedConsoleError = console.error;
  // overriding console.log function
  function customLog() {
    // we can't just call to `preservedConsoleLog` function,
    // that will throw an error (TypeError: Illegal invocation)
    // because we need the function to be inside the
    // scope of the `console` object so we going to use the
    // `apply` function
    if (process.env.NODE_ENV !== 'production') {
      log.info(arguments);
    }
    remoteLog.info(arguments);
  }

  function customError() {
    // we can't just call to `preservedConsoleLog` function,
    // that will throw an error (TypeError: Illegal invocation)
    // because we need the function to be inside the
    // scope of the `console` object so we going to use the
    // `apply` function
    if (process.env.NODE_ENV !== 'production') {
      log.error(arguments);
    }
    remoteLog.info(arguments);
  }

  console.log = customLog;
  console.error = customError;
})();

const toneInMessage = message => {
  log.info(`%cTONE_IN | ${JSON.stringify(message)}`, 'color: red');
};
const toneOutMessage = message => {
  log.info(`%cTONE_OUT | ${JSON.stringify(message)}`, 'color: blue');
};
const infoMessage = message => {
  log.info(JSON.stringify(message));
};
const errorMessage = message => {
  log.error(JSON.stringify(message));
};
const warnMessage = message => {
  log.warn(JSON.stringify(message));
};
const actionMessage = message => {
  log.warn(`ACTION | ${JSON.stringify(message)}`);
};
const logMessage = message => {
  log.info(JSON.stringify(message));
};

/**
 * Initializes Raven error logging
 */
Raven.config(process.env.REACT_APP_SENTRY_DSN).install();

/**
 * Logs all the events to Piwik if the environment is not test
 * @param category (string) Category of the event
 * @param method (string) Method of the event
 * @param message (string) Message to display
 */
const logEvent = (category, method, message = '') => {
  if (process.env.NODE_ENV === 'production') {
    ReactPiwik.push(['trackEvent', category, method, message]);
  } else {
    logMessage(message);
  }
};

export {
  errorMessage,
  warnMessage,
  infoMessage,
  logMessage,
  toneInMessage,
  toneOutMessage,
  actionMessage,
  logEvent
};
