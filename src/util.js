const luxafor = require('luxafor-api');
const chalk = require('chalk');
const debugD = require('debug')('dnd');
const debugA = require('debug')('away');
const debugT = require('debug')('timer');

const COLORS = {
  red: '#f00',
  green: '#0f0'
};

const TIMER_OFF = `'TIMER_OFF'`;
const TIMER_ON = `'TIMER_ON'`;

const TYPE_DND = 'DnD ';
const TYPE_AWAY = 'Away';

function typeLogger(chalker, type, message) {
  console.log(chalker(` ${type} `) + ` ${message}`);
}

function hasCredentials() {
  return process.env.SLACK_TOKEN != null &&
    process.env.SLACK_CLIENT_ID != null &&
    process.env.SLACK_CLIENT_SECRET;
}

function printHello() {
  console.log('\n');
  console.log('  ' + chalk.bgRed('                       '));
  console.log('  ' + chalk.bold.white.bgRed('   Luxafor for Slack   '));
  console.log('  ' + chalk.bgRed('                       '));
  console.log('\n');
}

var dndTimer;
var dndQueueTimer;
var bufferTime = 1; //ms
function configureDndTimer(state, startUnixTs, endUnixTs) {
  const nowUnixTs = getNowUnixTs();

  if (nowUnixTs > startUnixTs) {
    if (endUnixTs > nowUnixTs) {
      debugT(`starting ${TIMER_OFF}, to trigger at ${new Date(endUnixTs * 1000)}`);
      // When the timestamp is between start and end, set dnd to true and run a
      // timeout to then set it false (on the end ts)
      setDnd(state, true);
      clearTimeout(dndTimer);
      const endMs = (endUnixTs - nowUnixTs + bufferTime) * 1000;
      dndTimer = setTimeout(function() {
        setDnd(state, false)
        typeLogger(
          chalk.bold.black.bgYellow,
          TYPE_DND,
          `Disabled.`
        );
      }, endMs);

      setTimeout(function() {
        typeLogger(
          chalk.bold.black.bgYellow,
          TYPE_DND,
          `Enabled. Set to disable at ${(new Date(endUnixTs * 1000)).toLocaleTimeString()}.`
        );
      }, 50);
    } else {
      // When the timestamp is above bounds, set dnd to false
      setDnd(state, false);
    };
  } else {
    debugT(`starting ${TIMER_ON}, to trigger at ${new Date(startUnixTs * 1000)}`);
    // When the timestamp is below bounds, set dnd to false, and run a timeout
    // to then set it to true (on the start ts)
    setDnd(state, false);
    clearTimeout(dndQueueTimer);
    const startMs = (startUnixTs - nowUnixTs + bufferTime) * 1000;
    dndQueueTimer = setTimeout(configureDndTimer.bind(null, state, startUnixTs, endUnixTs), startMs);

    setTimeout(function() {
      typeLogger(
        chalk.bold.black.bgYellow,
        TYPE_DND,
        `Disabled. Set to enable at ${(new Date(startUnixTs * 1000)).toLocaleTimeString()}.`
      );
    }, 50);
  }
}

function setDnd(state, bool) {
  debugD(`${bool ? 'enabled' : 'disabled'}`);
  state.dnd = !!bool;
  processLuxaforColor(state);
}

function setAway(state, bool) {
  bool = !!bool;
  if (state.away === bool) return;
  debugA(`${bool ? 'enabled' : 'disabled'}`);
  state.away = bool;
  processLuxaforColor(state);

  setTimeout(function() {
    // Avoids early logging.
    typeLogger(
      chalk.bold.white.bgBlue,
      TYPE_AWAY,
      state.away ? `Enabled.` : `Disabled.`
    );
  }, 50);
}

function isAway(presence) {
  return presence == 'away';
}

function getNowUnixTs() {
  return parseInt(+(new Date()) / 1000);
}

function handleDnd(state, enabled, startUnixTs, endUnixTs) {
  const nowUnixTs = getNowUnixTs();
  const shouldRunDndTimer = enabled;

  debugT(`${shouldRunDndTimer ? 'configuring' : 'skipping'} dnd timer`);
  if (shouldRunDndTimer) {
      configureDndTimer(state, startUnixTs, endUnixTs);
  }
}

function processLuxaforColor(state) {
  luxafor.setColor('both', COLORS[state.dnd || state.away ? 'red' : 'green']);
}

function promisify(nodeAsyncFn, context) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    return new Promise((resolve, reject) => {
      args.push(function(err, val) {
        if (err !== null) {
          return reject(err);
        }

        return resolve(val);
      });

      nodeAsyncFn.apply(context || {}, args);
    });
  };
}

module.exports = {
  promisify: promisify,
  printHello: printHello,
  handleDnd: handleDnd,
  setAway: setAway,
  isAway: isAway,
  processLuxaforColor: processLuxaforColor,
  hasCredentials: hasCredentials,
};
