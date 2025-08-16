const { default: AtpAgent } = require("@atproto/api");
const Discord = require('discord.js');
const fs = require('fs');

/**
 * @type {{ bskyName: string; bskyPass: string; discordUserID: string; discordBotToken: string; discordGuildID: string; discordChannelId: string; discordSuppressNotifications: boolean; }} 
 */
const config = JSON.parse(fs.readFileSync("./config.json"));

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

//#region Watch for Micah's status updating and save it automatically.
let lastStatus = "";
client.on('presenceUpdate', async (o, n) => {
    try {
        if (n.activities.length > 0 && (n.status != 'invisible' || n.status != 'offline') && n.userId == config.discordUserID) {
            const thisActivity = n.activities[0];
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