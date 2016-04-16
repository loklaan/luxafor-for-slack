#!/usr/bin/env node

const argv = require('yargs').argv;
const chalk = require('chalk');
const _slack = require('slack');
const utils = require('./src/util');
const creds = require('./src/credentials');
const debug = require('./src/debug');
const loading = require('./src/loading-messages');
const slack = {
  auth: { test: utils.promisify(_slack.auth.test) },
  user: { getPresence: utils.promisify(_slack.users.getPresence) },
  dnd: { info: utils.promisify(_slack.dnd.info) },
  rtm: { client: _slack.rtm.client },
};
const d = {
  n: debug('network'),
  i: debug('info'),
  e: debug('error'),
};

var STATE = {
  away: false,
  dnd: false
};

d.i('starting...');

utils.printHello();
run();

function run() {
  // Run program. Asks for credentials if not found.
  creds.cliCredsCheck()
  .then((slackCredentials) => {
    d.i(`credentials: ` + chalk.blue(JSON.stringify(slackCredentials, null, '  ')));

    // Cute loading messages
    loading.start();

    // Append credentials to evironment so that slack api can access them.
    Object.keys(slackCredentials).forEach(key => (process.env[key] = slackCredentials[key]));
    // Immediately validate credentials
    return slack.auth.test({token: creds.getToken()});
  })
  .then(() => {
    d.i('initiating...');

    const bot = slack.rtm.client();
    bot.started(message => start(bot, message.self.id));
    bot.listen({token: creds.getToken()});
  })
  .catch((err) => {
    d.e(` ${chalk.red.inverse(err)} `);

    loading.immediateStop().then(() => {
      if (err.message === 'invalid_auth') {
        console.log(`\n${chalk.red.inverse(' Slack API authentication failed. Please re-enter credentials. ')}\n`);
        creds.clear();
        run();
      } else {
        console.log(chalk.red('\n\nExiting...'));
        process.exit(1);
      }
    });
  });
}

// Handle the slack bot
function start(bot, id) {
  const commonArgs = { token: creds.getToken(), user: id };

  d.i('finding current status...');
  Promise.all([ slack.user.getPresence(commonArgs), slack.dnd.info(commonArgs) ])
  .then(data => loading.stop().then(() => data))
  .then(data => {
    d.i('Found statuses');
    d.n('Response:' + chalk.blue(JSON.stringify(data, null, '  ')));

    const presenceMessage = data[0];
    const dndMessage = data[1];

    // Set initial light.
    utils.setAway(STATE, utils.isAway(presenceMessage.presence));
    utils.handleDnd(STATE, dndMessage.dnd_enabled, dndMessage.next_dnd_start_ts, dndMessage.next_dnd_end_ts);

    // Now listen for changes to the slack user.
    d.i('listening for status changes...');
    bot.presence_change(message => {
      d.n(chalk.yellow(JSON.stringify(message, null, '  ')));
      if (message.user == id) {
        utils.setAway(STATE, utils.isAway(message.presence));
      }
    });

    bot.dnd_updated(message => {
      d.n(chalk.yellow(JSON.stringify(message, null, '  ')));
      if (message.user == id) {
        const status = message.dnd_status;
        utils.handleDnd(STATE, status.dnd_enabled, status.next_dnd_start_ts, status.next_dnd_end_ts);
      }
    });

    console.log('\n' + chalk.green('Leave me running! Enjoy!') + '\n');
    console.log(chalk.inverse('  Logs:  ') + '\n');
  });
}
