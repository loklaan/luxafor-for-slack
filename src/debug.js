var hasDebug;

try {
  hasDebug = !!require.resolve('debug');
} catch (e) {
  hasDebug = false;
}

function noop() {
  return noop;
}

const debug = hasDebug ? require('debug') : noop;

debug('debug')('debug module found');

module.exports = debug;
