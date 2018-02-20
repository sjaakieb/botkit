const Botkit = require(__dirname + "/CoreBot.js");
const request = require("request");
const http = require("http");
const uuidv1 = require('uuid/v1');

function createInboxServer(server_botkit, bot, configuration) {
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
                server_botkit.ingest(bot, message, null);
            }
        })
        .listen(configuration.webhookPort);
}

//configuration {
//    webhookPort
//     callbackUrl
//     botId
// }
function ServerBot(configuration) {
    // Create a core botkit bot
    let server_botkit = Botkit(configuration || {});

    server_botkit.middleware.spawn.use(function(bot, next) {
        createInboxServer(server_botkit, bot, configuration);
    });

    server_botkit.middleware.format.use(function(
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

    server_botkit.defineBot(function(botkit, config) {
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
                    from: `${config.botId}`,
                    to: message.converstation,
                    body: message.text,
                },
                type: "message",
            };

            const requestConfig = {
                method: "POST",
                body: requestData,
                json: true,
                uri: config.callbackUrl,
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
            // server_botkit.client.sendMessage(message.conversation, message.text).then(() => {
            //     if (cb) {
            //         cb();
            //     }
            // });
        };

        bot.reply = function(src, resp, cb) {
            console.log("Replying to message", src, resp);

            const requestData = {
                event: {
                    from: `${server_botkit.name}`,
                    to: src.user,
                    body: resp,
                },
                type: "message",
            };

            const requestConfig = {
                method: "POST",
                body: requestData,
                json: true,
                header: { "api-key": server_botkit.apiKey },
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

    return server_botkit;
}

module.exports = ServerBot;