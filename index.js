#!/usr/bin/env node

const argv = require('yargs').argv;
const chalk = require('chalk');
const slack = require('slack');
const _ = require('./src/util');

require('dotenv').config();
const DEBUG = typeof argv.debug !== 'undefined';
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

_.printHello();

var STATE = {
  away: false,
  dnd: false
};

// Run program
if (HAS_CREDENTIALS) {
  console.log(chalk.green('Slack Credentials found. Initiating...'));

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

  console.log(chalk.cyan('Finding current status...'));
  Promise.all([ slackPromised.user.getPresence(commonArgs), slackPromised.dnd.info(commonArgs) ])
  .then(data => {
    const presenceMessage = data[0];
    const dndMessage = data[1];

    if (DEBUG) {
      console.log(chalk.blue(JSON.stringify(data, null, '  ')));
    }

    // Set initial light.
    STATE.away = _.isAway(presenceMessage.presence);
    SUPPORTS_DND ?
      _.handleDnd(STATE, dndMessage.dnd_enabled, dndMessage.next_dnd_start_ts, dndMessage.next_dnd_end_ts) :
      (function() {})();
    _.processLuxaforColor(STATE);

    // Now listen for changes to the slack user.
    console.log(chalk.cyan('Listening for status changes...'));
    bot.presence_change(message => {
      if (DEBUG) console.log(chalk.yellow(JSON.stringify(message, null, '  ')));
      if (message.user == id) {
        STATE.away = _.isAway(message.presence);
        _.processLuxaforColor(STATE);
      }
    });

    if (SUPPORTS_DND) {
      bot.dnd_updated(message => {
        if (DEBUG) console.log(chalk.yellow(JSON.stringify(message, null, '  ')));
        if (message.user == id) {
          const status = message.dnd_status;
          _.handleDnd(STATE, status.dnd_enabled, status.next_dnd_start_ts, status.next_dnd_end_ts);
        }
      });
    }

    console.log(chalk.green('Initiated. Leave me running, and enjoy!'));
  });
}
