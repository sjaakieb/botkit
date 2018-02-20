const Botkit = require(__dirname + "/CoreBot.js");
const request = require("request");
const http = require("http");
const uuidv1 = require("uuid/v1");

function createInboxServer(server_botkit, bot, configuration) {
    http
        .createServer(function(req, res) {
            const { headers, method, url } = req;
            console.log("REQ headers", headers);
            console.log("REQ method", method);
            console.log("REQ url", url);
            if (method == "POST" && url == "/message") {
                console.log("Receiving body");
                let body = [];
                req
                    .on("error", err => {
                        console.error(err);
                    })
                    .on("data", chunk => {
                        body.push(chunk);
                    })
                    .on("end", () => {
                        body = Buffer.concat(body).toString();
                        // At this point, we have the headers, method, url and body, and can now
                        // do whatever we need to in order to respond to this request.
                        console.log("REQ body", body);
                        const data = JSON.parse(body);
                        let message = {
                            text: data.body,
                            user: data.from,
                            channel: data.to,
                            timestamp: Date.now(),
                        };
                        console.log("ingesting message", message);
                        server_botkit.ingest(bot, message, null);
                        res.writeHead(200, { "Content-Type": "text/plain" });
                        res.end();
                    });
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
                    from: botkit.config.botId,
                    to: message.converstation,
                    body: message.text,
                },
                type: "message",
            };

            const requestConfig = {
                method: "POST",
                body: requestData,
                json: true,
                uri: botkit.config.callbackUrl,
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
            console.log("Replying to message", src);
            console.log("With response", resp);
            console.log("With config", botkit.config);

            const requestData = {
                event: {
                    id: `${uuidv1()}`,
                    from: botkit.config.botId,
                    to: src.user,
                    body: resp,
                },
                type: "message",
            };

            const requestConfig = {
                method: "POST",
                body: requestData,
                json: true,
                uri: botkit.config.callbackUrl,
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
