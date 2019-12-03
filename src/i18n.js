import { NativeModules, Platform } from 'react-native';
import { SETTINGS } from 'lbry-redux';
import { doTransifexUpload } from 'lbryinc';
import AsyncStorage from '@react-native-community/async-storage';
import RNFS from 'react-native-fs';

const isProduction = !__DEV__; // eslint-disable-line no-undef
let knownMessages = null;

window.language = 'en';
window.i18n_messages = window.i18n_messages || {};

function saveMessage(message) {
  const messagesFilePath = RNFS.ExternalDirectoryPath + '/app-strings.json';

  if (knownMessages === null) {
    RNFS.readFile(messagesFilePath, 'utf8')
      .then(fileContents => {
        knownMessages = JSON.parse(fileContents);
        checkMessageAndSave(message, messagesFilePath);
      })
      .catch(err => {
        knownMessages = {}; // no known messages, initialise the object
        checkMessageAndSave(message, messagesFilePath);
      });
  } else {
    checkMessageAndSave(message, messagesFilePath);
  }
}

function checkMessageAndSave(message, messagesFilePath) {
  if (!knownMessages[message]) {
    knownMessages[message] = message;
    const contents = JSON.stringify(knownMessages, null, 2);

    RNFS.writeFile(messagesFilePath, contents, 'utf8')
      .then(() => {
        // successful write
        // send to transifex (should we do this even if the file doesn't get saved?)
        /* doTransifexUpload(
          contents,
          'lbry-mobile',
          () => {
            // successful
          },
          err => {
            // failed
          }
        ); */
      })
      .catch(err => {
        if (err) {
          throw err;
        }
      });
  }
}

export function __(message, tokens) {
  const w = global.window ? global.window : window;
  let language = w.language;

  /* Platform.OS === 'android'
      ? NativeModules.I18nManager.localeIdentifier
      : NativeModules.SettingsManager.settings.AppleLocale;
  window.language = language ? language.substring(0, 2) : 'en'; */

  if (!isProduction) {
    saveMessage(message);
  }

  const translatedMessage = w.i18n_messages[language] ? w.i18n_messages[language][message] || message : message;

  if (!tokens) {
    return translatedMessage;
  }

  return translatedMessage.replace(/%([^%]+)%/g, function($1, $2) {
    return tokens[$2] || $2;
  });
}
