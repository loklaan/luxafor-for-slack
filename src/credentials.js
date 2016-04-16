const configstore = require('configstore');
const prompt = require('prompt');
const chalk = require('chalk');
const pkg = require('../package.json');
const conf = new configstore(pkg.name);
const utils = require('./util');
const debug = require('./debug');
const d = {
  c: debug('creds')
};

const SLACK_TOKEN_KEY = 'SLACK_TOKEN';
const SLACK_CLIENT_ID_KEY = 'SLACK_CLIENT_ID';
const SLACK_CLIENT_SECRET_KEY = 'SLACK_CLIENT_SECRET';
const readableMap = {
  [SLACK_TOKEN_KEY]: 'Token',
  [SLACK_CLIENT_ID_KEY]: 'Client ID',
  [SLACK_CLIENT_SECRET_KEY]: 'Client Secret'
}
const inverseReadableMap = Object.keys(readableMap)
  .reduce(function(inverse, key) {
    inverse[readableMap[key]] = key;
    return inverse;
  }, {});

const forceFreshCreds = require('yargs').argv.fresh != null;
forceFreshCreds && d.c('forcing a credentials refresh');

function hasCredentials() {
  return conf.get(SLACK_TOKEN_KEY) != null &&
         conf.get(SLACK_CLIENT_ID_KEY) != null &&
         conf.get(SLACK_CLIENT_SECRET_KEY) != null;
}

function cliCredsCheck() {
  d.c('starting a credential check');
  return new Promise((resolve) => {
    const missingCreds = Object.keys(readableMap)
      .reduce((missing, key) => (
        forceFreshCreds || conf.get(key) == null ?
          missing.concat(readableMap[key]) :
          missing
      ), []);

    if (missingCreds.length > 0) {
      d.c('getting credentials from user');
      console.log(chalk.white(`Please enter your Slack Credentials. See https://git.io/vwLRq for help.`))
      prompt.message = '';
      prompt.start();
      resolve(utils.promisify(prompt.get)(missingCreds));
    } else {
        d.c('already has all credentials');
        resolve();
    }
  }).then((promptResults) => {
    console.log();
    if (promptResults) {
      Object.keys(promptResults).forEach(resultKey => conf.set(
        inverseReadableMap[resultKey],
        promptResults[resultKey]
      ));
    }

    return {
      [SLACK_TOKEN_KEY]: conf.get(SLACK_TOKEN_KEY),
      [SLACK_CLIENT_ID_KEY]: conf.get(SLACK_CLIENT_ID_KEY),
      [SLACK_CLIENT_SECRET_KEY]: conf.get(SLACK_CLIENT_SECRET_KEY)
    }
  });
}

function getToken() {
  return conf.get(SLACK_TOKEN_KEY);
}

function clear() {
  conf.clear();
}

module.exports = {
  clear: clear,
  getToken: getToken,
  cliCredsCheck: cliCredsCheck,
  hasCredentials: hasCredentials,
};
