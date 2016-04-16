const shuffle = require('shuffle-array');
const ora = require('ora');
const spinner = ora();
spinner.color = 'yellow';

const PER_WORD_HUMAN_READTIME = 320;//ms
const prefix = 'Please wait';
const messages = [
  `, reticulating splines.`,
  `... I love you.`,
  ` the bits are breeding.`,
  `, they're taking the hobbits to Isengard.`,
  ` and take a moment to sign up for cake.`,
  `.. Wait, did you order a sandwhich? I have one here...`,
  `, I am doing quite a lot here you know.`,
  `. Try humming?`,
  ` while I test your patience.`,
  `. STARING CONTEST!    O.O`,
  ` while Slack continues to dominate the world of chat clients.`,
  `, the bits are flowing slowly today.`,
  `. I am also playing chess, if you're interested...`,
  `. Follow the white rabbit.`,
  `. Hold your breath.`,
  ` and dream of faster internet.`,
  `. Don't think of pink giraffes. (You're failing, aren't you?)`,
  `. Ponder the existence of silicon based lifeforms.`,
  `. Checking for gravity.`,
  `, and don't pay attention to the man standing behind you.`,
  ` - a few bits were trying to escape, but I've got'em.`,
  `. What do you think of me, so far?`,
  `. The last time I tried this the monkey didn't survive.`,
  `. My other loading screen is much faster - you should have tried that.`,
  ` - I am driving V8 right now. No, really, I am.`,
  `. When I was being tested, the loading messages were much funnier.`,
  ` - loading humourous message.`,
];

const messagesMixBag = shuffle(messages);
var nextIndex = 0;

function getMessage() {
  const message = prefix + messagesMixBag[nextIndex];
  const readingTime = message.split(' ').length * PER_WORD_HUMAN_READTIME;
  nextIndex = (nextIndex+1) % messagesMixBag.length;
  return {
    text: message,
    readingTime: readingTime
  };
}

var looper = false;
var looperPromise;

function loopMessages(previousLoopsResolve) {
  if (!looper) {
    spinner.stop();
    previousLoopsResolve();
    return;
  }

  const message = getMessage();
  spinner.text = message.text;
  looperPromise = new Promise(resolve => {
    looper = setTimeout(() => loopMessages(resolve), message.readingTime);
  });
}

function start() {
  looper = true;
  spinner.text = '';
  spinner.start();
  loopMessages();
}

function stop() {
  looper = false;
  return looperPromise;
}

function immediateStop() {
  clearTimeout(looper);
  spinner.stop();
  looper = false;
  looperPromise = null;
  return Promise.resolve();
}

module.exports = {
  start,
  stop,
  immediateStop,
}
