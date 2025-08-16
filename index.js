const { default: AtpAgent } = require("@atproto/api"); // Bluesky AtProtocol bot stuff.
const Discord = require('discord.js');
const fs = require('fs');

/**
 * @type {{ bskyName: string; bskyPass: string; discordUserID: string; discordBotToken: string; discordGuildID: string; discordChannelId: string; discordSuppressNotifications: boolean; }} 
 */
const config = JSON.parse(fs.readFileSync("./config.json")); // Throws error if file doesn't exist - this is intended behavior.

const agent = new AtpAgent({ service: 'https://bsky.social' });
const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildPresences,
    ],
});

client.on('ready', async () => {
    await agent.login({ identifier: config.bskyName, password: config.bskyPass })

    console.log("Ready!");
})

//#region Watch for User's status updating and save it automatically.
    // Fun fact: Because of this function being called async, there's a sad possibility that the same status can be sent multiple times.
    // And because this is in such quick succession (I think I saw like 8 times / sec at one point), I need a variable to track the last one posted,
    // even if we can get the same data from checking the last 100 messages... Because the message check is SLOW. :(
let lastStatus = "";
client.on('presenceUpdate', async (o, newActivity) => {
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
                const channel = await client.channels.fetch(config.discordChannelId);

                // Check that it wasn't one that I or the bot already posted.
                /** @type {Discord.GuildMessageManager} */
                const messages = channel.messages;
                const alreadyPosted = (await messages.fetch({ limit: 100 })).some((v) => v.content == thisStatus)
                const flags = [];
                if (config.discordSuppressNotifications) {
                    flags.push(Discord.MessageFlags.SuppressNotifications);
                }

                if (!alreadyPosted) {
                    channel.send({
                        content: thisStatus,
                        flags
                    });
                    agent.post({
                        text: thisStatus
                    });
                }
            }
        }
    } catch {
        // Do nothing.
    }
})

client.login(config.discordBotToken);