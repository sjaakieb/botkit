var Botkit = require(__dirname + '/CoreBot.js');
var readline = require('readline');


function PhoenixBot(configuration) {

    // Create a core botkit bot
    var phoenix_botkit = Botkit(configuration || {});


    phoenix_botkit.middleware.spawn.use(function(bot, next) {

        //TODO: replace
//        phoenix_botkit.listenStdIn(bot);
        next();

    });

    phoenix_botkit.middleware.format.use(function(bot, message, platform_message, next) {
        // clone the incoming message
        for (var k in message) {
            platform_message[k] = message[k];
        }

        next();
    });

    phoenix_botkit.defineBot(function(botkit, config) {

        var bot = {
            botkit: botkit,
            config: config || {},
            utterances: botkit.utterances,
        };

        bot.createConversation = function(message, cb) {
            botkit.createConversation(this, message, cb);
        };

        bot.startConversation = function(message, cb) {
            botkit.startConversation(this, message, cb);
        };

        bot.send = function(message, cb) {
            console.log('BOT:', message.text);
            if (cb) {
                cb();
            }
        };

        bot.reply = function(src, resp, cb) {
            var msg = {};

            if (typeof(resp) == 'string') {
                msg.text = resp;
            } else {
                msg = resp;
            }

            msg.channel = src.channel;

            bot.say(msg, cb);
        };

        bot.findConversation = function(message, cb) {
            botkit.debug('CUSTOM FIND CONVO', message.user, message.channel);
            for (var t = 0; t < botkit.tasks.length; t++) {
                for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
                    if (
                        botkit.tasks[t].convos[c].isActive() &&
                        botkit.tasks[t].convos[c].source_message.user == message.user
                    ) {
                        botkit.debug('FOUND EXISTING CONVO!');
                        cb(botkit.tasks[t].convos[c]);
                        return;
                    }
                }
            }

            cb();
        };

        return bot;

    });

    phoenix_botkit.listenStdIn = function(bot) {

        phoenix_botkit.startTicking();
        var rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
        rl.on('line', function(line) {
            var message = {
                text: line,
                user: 'user',
                channel: 'text',
                timestamp: Date.now()
            };

            phoenix_botkit.ingest(bot, message, null);

        });
    };

    return phoenix_botkit;
};

module.exports = TextBot;
