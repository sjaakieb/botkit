const Botkit = require(__dirname + '/CoreBot.js');
const request = require('request');
const http = require('http');

function PhoenixBot(configuration) {

    // Create a core botkit bot
    let phoenix_botkit = Botkit(configuration || {});

    phoenix_botkit.middleware.spawn.use(function(bot, next) {


        http.createServer(function (req, res) {
            console.log('REQ',req);
            const { headers, method, url } = req;
            if (method == 'POST' && url =='message'){
                let message = {
                    text: req.body.body,
                    user: req.body.from,
                    channel: req.body.to,
                    timestamp: Date.now()
                };
                phoenix_botkit.ingest(bot, message, null);
            }
        }).listen(configuration.webhook.port);

        const data = {
            appId: configuration.appId, 
            profile: 
                { name: configuration.name, 
                  picture: configuration.picture, 
                  url: configuration.url, 
                  description: configuration.description
                }, 
            config: 
                { webhooks: { message: `${configuration.webhook.uri}:${configuration.webhook.port}/message`}, 
                  enableWebhooks: true
                }
        };

        const configuration = {
            method:"POST",
            body: data,
            json: true
        }
        
        request( configuration, function(error, response){
            if (error){
                console.error("OH NOES, RECEIVED AN ERROR", error);
            } else {
                phoenix_botkit.id = response.id;
                phoenix_botkit.apiKey = response.apiKey;
                next();
            }
        })


        // phoenix_botkit.client = new PhoenixClient({
        //     appId: configuration.appId
        // });

        // phoenix_botkit.client.on('message', function(data) {
        //     let message = {
        //         text: data.text,
        //         user: data.from,
        //         channel: data.to,
        //         timestamp: Date.now()
        //     };
        //     phoenix_botkit.ingest(bot, message, null);
        // });
    
        //todo: maybe unregister handler after next();
        // phoenix_botkit.client.on('connection:status', function(data) {
        //     console.log('*** connection status received ***', data);
        //     if (data == 5) {
        //         next();
        //     }
        // });

        // phoenix_botkit.client.login(configuration.ucid, configuration.userId, configuration.userCredential)
        //     .then(phoenix_botkit.client.connect);
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

            const data = {
                event: 
                    { from: `${phoenix_botkit.id}@extension.my-io.ch`,
                      to: message.converstation, 
                      body: message.text,
                    }, 
                type: "message",
            };
    
            const configuration = {
                method:"POST",
                body: data,
                json: true,
                header : {'api-key':phoenix_botkit.apiKey},
            }

            request(configuration, function(error,response){
                if (error){
                    console.error("OH NOES", error);
                } else {
                    if (cb){
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
            console.log("Replying to message",src,resp);

            const data = {
                event: 
                    { from: `${phoenix_botkit.id}@extension.my-io.ch`,
                      to: src.user, 
                      body: resp,
                    }, 
                type: "message",
            };
    
            const configuration = {
                method:"POST",
                body: data,
                json: true,
                header : {'api-key':phoenix_botkit.apiKey},
            }

            request(configuration, function(error,response){
                if (error){
                    console.error("OH NOES", error);
                } else {
                    if (cb){
                        cb();
                    }
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
