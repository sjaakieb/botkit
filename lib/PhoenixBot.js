const Botkit = require(__dirname + '/CoreBot.js');
const PhoenixClient = require('phoenix-js-connector');

function PhoenixBot(configuration) {

    // Create a core botkit bot
    let phoenix_botkit = Botkit(configuration || {});

    phoenix_botkit.middleware.spawn.use(function(bot, next) {

        phoenix_botkit.client = new PhoenixClient({
            appId: configuration.appId
        });

        phoenix_botkit.client.on('message', function(data) {
            let message = {
                text: data.text,
                user: data.from,
                channel: data.to,
                timestamp: Date.now()
            };
            phoenix_botkit.ingest(bot, message, null);
        });
    
        //todo: maybe unregister handler after next();
        phoenix_botkit.client.on('connection:status', function(data) {
            console.log('*** connection status received ***', data);
            if (data == 5) {
                next();
            }
        });

        phoenix_botkit.client.login(configuration.ucid, configuration.userId, configuration.userCredential)
            .then(phoenix_botkit.client.connect);
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
            console.log("Sending message",message);
            phoenix_botkit.client.sendMessage(message.conversation, message.text).then(() => {
                if (cb) {
                    cb();
                }
            });
        };

        bot.reply = function(src, resp, cb) {
            console.log("Replying to message",src,resp);
            phoenix_botkit.client.sendMessage(src.user, resp).then(() => {
                if (cb) {
                    cb();
                }
            });
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

    return phoenix_botkit;
};

module.exports = PhoenixBot;
