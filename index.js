#!/usr/bin/env node

const argv = require('yargs').argv;
const chalk = require('chalk');
const slack = require('slack');
const _ = require('./src/util');
const debug = require('debug');
const debugN = debug('network');
const debugI = debug('info');

require('dotenv').config();
const DEBUG = typeof argv.DEBUG !== 'undefined';
const TOKEN = process.env.SLACK_TOKEN;
const SUPPORTS_DND = (slack.dnd && slack.dnd.info) != null;
const HAS_CREDENTIALS = _.hasCredentials();
const slackPromised = {
  user: { getPresence: _.promisify(slack.users.getPresence) },
  dnd: { info: SUPPORTS_DND ? _.promisify(slack.dnd.info) : () => Promise.resolve(true) }
};

if (DEBUG) {
  process.on('uncaughtException', function(err) {
    console.error('Caught exception: ' + err);
  });
}

if (SUPPORTS_DND) {
  debugI(`${SUPPORTS_DND ? 'Supports' : 'Does not support'} DND methods.`);
}

_.printHello();

var STATE = {
  away: false,
  dnd: false
};

// Run program
if (HAS_CREDENTIALS) {
  console.log('Slack Credentials found. Initiating...');

  const bot = slack.rtm.client();
  bot.started(message => start(bot, message.self.id));
  bot.listen({token: TOKEN});
} else {
  console.log(chalk.red('Slack Credentials cannot be found. See the README for instructions.'));
  console.log(chalk.red('\nExiting...'));
  process.exit(1);
}

// Handle the slack bot
function start(bot, id) {
  const commonArgs = { token: TOKEN, user: id };

  console.log('Finding current status...');
  Promise.all([ slackPromised.user.getPresence(commonArgs), slackPromised.dnd.info(commonArgs) ])
  .then(data => {
    debugI('Found statuses');
    debugN('Response:' + chalk.blue(JSON.stringify(data, null, '  ')));

    const presenceMessage = data[0];
    const dndMessage = data[1];

    // Set initial light.
    _.setAway(STATE, _.isAway(presenceMessage.presence));
    _.handleDnd(STATE, dndMessage.dnd_enabled, dndMessage.next_dnd_start_ts, dndMessage.next_dnd_end_ts);

    // Now listen for changes to the slack user.
    console.log('Listening for status changes...');
    bot.presence_change(message => {
      if (DEBUG) debugN(chalk.yellow(JSON.stringify(message, null, '  ')));
      if (message.user == id) {
        _.setAway(STATE, _.isAway(message.presence));
      }
    });

    if (SUPPORTS_DND) {
      bot.dnd_updated(message => {
        if (DEBUG) debugN(chalk.yellow(JSON.stringify(message, null, '  ')));
        if (message.user == id) {
          const status = message.dnd_status;
          _.handleDnd(STATE, status.dnd_enabled, status.next_dnd_start_ts, status.next_dnd_end_ts);
        }
      });
    }

    console.log('\n' + chalk.green('Initiated. Leave me running, and enjoy!') + '\n');
  });
}
