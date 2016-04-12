# Luxafor for Slack

Make your [Luxafor](http://luxafor.com/) light change colours in sync with your [Slack](https://slack.com/) statuses.

Currently turns green, unless you're 'away' or 'dnd' then it will turn red.

## Todo

* Enter credentials on CLI
* Configure Luxafor colors/arrangement per Slack status

## Install

```shell
$ npm i -g luxafor-for-slack
$ luxafor-for-slack
```

## Contribute

Install dependencies.

```shell
$ npm i
```

Enter credentials.

* Create a new Slack Application from the [API page](https://api.slack.com/applications).
* Get an API token as well. You can get one from another [API page](https://api.slack.com/web).
* Create a `.env` file in this project with the following variables:  (see `.env-sample`)

```
SLACK_TOKEN=xxxxxxx
SLACK_CLIENT_ID=xxxxxxx
SLACK_CLIENT_SECRET=xxxxxxx
```

Go through the [Todo](#todo) list.
