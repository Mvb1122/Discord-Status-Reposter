const Discord = require('discord.js');
const fs = require('fs');

/**
 * Go look at the BLANK_config.json / config.json file and then figure it out yourself what the keys to this are. :)
 */
const config = JSON.parse(fs.readFileSync("./config.json")); // Throws error if file doesn't exist - this is intended behavior.
module.exports = {
    config
};

const Mastodon = require('./Mastodon');
const Bluesky = require('./Bluesky');
const Network = require('./Network');

/**
 * @type {Network[]}
 */
const networks = [new Mastodon(), new Bluesky()]

const discordClient = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildPresences,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMessages
    ],
});

// Loading is faster when we do both at the same time.
const loginProms = networks.map(v => v.logon()).concat([
    // Technically this will wait until after the file is completed but it should be reasonably okay.
    new Promise(res => {
        discordClient.on('ready', () => {res();})
    })
]);

Promise.all(loginProms).then(v => {
    console.log("Ready!");
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

                    // Send to all enabled networks.
                    networks.forEach(v => {
                        if (v.isEnabled()) {
                            v.post(thisStatus);
                        }
                    })

                    console.log("Relayed status: " + thisStatus);
                    
                }
            }
        }
    } catch {
        // Do nothing.
    }
})



// When someone sends a reply, check if the root post (that is, the last post in the chain of replies) belongs to us.
    // If it does: Post the reply to the posts on the networks.
discordClient.on("messageCreate", async (message) => {
    if (message.reference != null) {
        let root = await getRootMessage(message);
        const parent = await getReferencedMessage(message);

        if (root.author.id == discordClient.user.id) {
            console.log("Relaying reply to old message: " + parent.content + "\nWith new message: " + message.content)

            // Now we can post replies.
            networks.forEach(nw => {
                if (nw.isEnabled()) nw.replyTo(parent.content, message.content);
            });
        }
    }
})

discordClient.login(config.discordBotToken);

async function getRootMessage(message) {
    let root = message;
    while (root.reference != null) {
        // Move up chain of replies.
        root = await getReferencedMessage(root);
    }
    return root;
}

/**
 * Gets the message referenced by message reference property.
 * @param {Discord.Message} root 
 * @returns {Promise<Discord.Message>}
 */
async function getReferencedMessage(root) {
    // I guess this is the proper way to follow the chain of replies? Since you can cross-channel reply... Maybe they'll add cross-server replies. IDK.
    const replyChannel = await (discordClient.guilds.cache.get(root.reference.guildId)
        .channels.fetch(root.reference.channelId));

    return replyChannel.messages.fetch(root.reference.messageId);
}