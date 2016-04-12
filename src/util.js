const luxafor = require('luxafor-api');
const chalk = require('chalk');

const COLORS = {
  red: '#f00',
  green: '#0f0'
};

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
function startDndTimer(state, startUnixTs, endUnixTs) {
  const nowUnixTs = getNowUnixTs();


  if (nowUnixTs > startUnixTs) {
    if (endUnixTs > nowUnixTs) {
      setDndToTrue();
      clearTimeout(dndTimer);
      dndTimer = setTimeout(
        setDndToFalse.bind(null, state),
        (endUnixTs - nowUnixTs + bufferTime) * 1000
      );
    } else {
      setDndToFalse(state);
    };
  } else {
      setDndToFalse();
      clearTimeout(dndQueueTimer);
      dndQueueTimer = setTimeout(
        startDndTimer.bind(null, startUnixTs, endUnixTs),
        (startUnixTs - nowUnixTs + bufferTime) * 1000
      );
  }
}

function setDndToFalse(state) {
  state.dnd = false;
  processLuxaforColor(state);
}

function setDndToTrue(state) {
  state.dnd = true;
  processLuxaforColor(state);
}

function getNowUnixTs() {
    return parseInt(+(new Date()) / 1000);
}

function handleDnd(state, enabled, startUnixTs, endUnixTs) {
  const nowUnixTs = getNowUnixTs();
  const shouldRunDndTimer = enabled && endUnixTs > nowUnixTs;
  startDndTimer(state, startUnixTs, endUnixTs);
}

function isAway(presence) {
  return presence == 'away';
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
  isAway: isAway,
  processLuxaforColor: processLuxaforColor,
  hasCredentials: hasCredentials,
};
