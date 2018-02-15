const Botkit = require(__dirname + "/CoreBot.js");
const request = require("request");
const http = require("http");
const uuidv1 = require('uuid/v1');

function createInboxServer(phoenix_botkit, bot, configuration) {
    http
        .createServer(function(req, res) {
            console.log("REQ", req);
            const { headers, method, url } = req;
            if (method == "POST" && url == "message") {
                let message = {
                    text: req.body.body,
                    user: req.body.from,
                    channel: req.body.to,
                    timestamp: Date.now(),
                };
                phoenix_botkit.ingest(bot, message, null);
            }
        })
        .listen(configuration.webhook.port);
}

function registerBot(phoenix_botkit, configuration, next) {

    var options = {
        url: configuration.location,
        headers: {
          'apiKey': configuration.apiKey,
        }
      };

    request(options, function(error, response, body) {
        const data = JSON.parse(body);
        console.log("Added webhook", data);
        phoenix_botkit.id = data.id;
        phoenix_botkit.apiKey = data.apiKey;
        phoenix_botkit.name = data.profile.name;
        next();
    });
}

function PhoenixBot(configuration) {
    // Create a core botkit bot
    let phoenix_botkit = Botkit(configuration || {});

    phoenix_botkit.middleware.spawn.use(function(bot, next) {
        createInboxServer(phoenix_botkit, bot, configuration);
        registerBot(phoenix_botkit, configuration, next);
    });

    phoenix_botkit.middleware.format.use(function(
        bot,
        message,
        platform_message,
        next
    ) {
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
            console.log("Sending message", message);

            const requestData = {
                event: {
                    id: `${uuidv1()}`,
                    from: `${phoenix_botkit.id}@extension.my-io.ch`,
                    to: message.converstation,
                    body: message.text,
                },
                type: "message",
            };

            const requestConfig = {
                method: "POST",
                body: requestData,
                json: true,
                header: { "api-key": phoenix_botkit.apiKey },
                uri: messageServiceUri,
            };

            request(requestConfig, function(error, response) {
                if (error) {
                    console.error("OH NOES", error);
                } else {
                    if (cb) {
                        cb();
                    }
                }
            });
            // phoenix_botkit.client.sendMessage(message.conversation, message.text).then(() => {
            //     if (cb) {
            //         cb();
            //     }
            // });
        };

        bot.reply = function(src, resp, cb) {
            console.log("Replying to message", src, resp);

            const requestData = {
                event: {
                    from: `${phoenix_botkit.name}`,
                    to: src.user,
                    body: resp,
                },
                type: "message",
            };

            const requestConfig = {
                method: "POST",
                body: requestData,
                json: true,
                header: { "api-key": phoenix_botkit.apiKey },
                uri: messageServiceUri,
            };

            request(requestConfig, function(error, response) {
                if (error) {
                    console.error("OH NOES", error);
                } else {
                    if (cb) {
                        cb();
                    }
                }
            });
        };

        bot.findConversation = function(message, cb) {
            botkit.debug("CUSTOM FIND CONVO", message.user, message.channel);
            for (var t = 0; t < botkit.tasks.length; t++) {
                for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
                    if (
                        botkit.tasks[t].convos[c].isActive() &&
                        botkit.tasks[t].convos[c].source_message.user ==
                            message.user
                    ) {
                        botkit.debug("FOUND EXISTING CONVO!");
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
}

module.exports = PhoenixBot;
