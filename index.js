const mastodonURL = "https://mastodon.social";

const { default: AtpAgent } = require("@atproto/api"); // Bluesky AtProtocol bot stuff.
const Discord = require('discord.js');
const fs = require('fs');
const { createRestAPIClient } = require("masto"); // Mastodon ActivityPub stuff.

/**
 * Go look at the BLANK_config.json / config.json file and then figure it out yourself what the keys to this are. :)
 */
const config = JSON.parse(fs.readFileSync("./config.json")); // Throws error if file doesn't exist - this is intended behavior.

let masto;
if (config.mastodonEnabled)
    masto = createRestAPIClient({
        url: mastodonURL,
        accessToken: config.mastodonToken,
    });

const bskyClient = new AtpAgent({ service: 'https://bsky.social' });
const discordClient = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildPresences,
    ],
});

// Loading is faster when we do both at the same time.
const loginProms = [
    // Technically this will wait until after the file is completed but it should be reasonably okay.
    new Promise(res => {
        discordClient.on('ready', () => {res();})
    }),
    bskyClient.login({ identifier: config.bskyName, password: config.bskyPass })
    // Mastodon uses a different auth system where it doesn't log on using a promise. 
]

Promise.all(loginProms).then(v => {
    console.log("Ready!")
});

//#region Watch for User's status updating and save it automatically.
    // Fun fact: Because of this function being called async, there's a sad possibility that the same status can be sent multiple times.
    // And because this is in such quick succession (I think I saw like 8 times / sec at one point), I need a variable to track the last one posted,
    // even if we can get the same data from checking the last 100 messages... Because the message check is SLOW. :(
let lastStatus = "";
discordClient.on('presenceUpdate', async (o, newActivity) => {
    try {
        if (newActivity.activities.length > 0 && (newActivity.status != 'invisible' || newActivity.status != 'offline') && newActivity.userId == config.discordUserID) {
            const thisActivity = newActivity.activities[0];
            const emoji = thisActivity.emoji ? thisActivity.emoji.name : "";
            let thisStatus = (emoji + " " + thisActivity.state).trim();
            if (thisStatus != lastStatus) {
                lastStatus = thisStatus;

                /**
                 * @type {Discord.TextChannel}
                 */
                const channel = await discordClient.channels.fetch(config.discordChannelId);

                // Check that it wasn't one that I or the bot already posted.
                /** @type {Discord.GuildMessageManager} */
                const messages = channel.messages;
                const alreadyPosted = (await messages.fetch({ limit: 100 })).some((v) => v.content == thisStatus)

                if (!alreadyPosted) {
                    // Send to Discord
                    channel.send({
                        content: thisStatus,
                        flags: config.discordSuppressNotifications ? [Discord.MessageFlags.SuppressNotifications] : undefined
                    });

                    // Send to BlueSky
                    bskyClient.post({
                        text: thisStatus
                    });

                    // Send to Mastodon
                    if (config.mastodonEnabled)
                        masto.v1.statuses.create({
                            status: thisStatus,
                        });
                }
            }
        }
    } catch {
        // Do nothing.
    }
})

discordClient.login(config.discordBotToken);