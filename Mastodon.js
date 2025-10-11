const mastodonURL = "https://mastodon.social";
const saveDataPath = "./masto-posts.json";

const { createRestAPIClient } = require("masto"); // Mastodon ActivityPub stuff.
const { config } = require(".");
const Network = require("./Network");
const fs = require('fs');

/**
 * @type {import("masto/mastodon/rest/client.js").Client}
 */
let masto;

/**
 * @type {Map<String, Promise<import("masto/mastodon/entities/v1/status.js").Status>>}
 */
let posts = new Map();


function loadPosts() {
    if (fs.existsSync(saveDataPath)) {
        const rawData = fs.readFileSync(saveDataPath);
        const savedPosts = JSON.parse(rawData);
        for (const [key, value] of Object.entries(savedPosts)) {
            posts.set(key, value);
        }
    }
}

async function savePosts() {
    const objToSave = {};
    for (const [key, value] of posts) {
        objToSave[key] = await value;
    }
    fs.writeFileSync(saveDataPath, JSON.stringify(objToSave));
}

// On exit, write to file.
process.on("beforeExit", () => {
    savePosts();
});

// On load, read from file.
loadPosts();

class Mastodon extends Network {
    /**
     * Logs onto the network.
     * @returns {Promise} Resolves when complete.
     */
    logon() {
        masto = createRestAPIClient({
            url: mastodonURL,
            accessToken: config.mastodonToken,
        });

        return true;
    }

    /**
     * Posts to the network as a new post.
     * @param {string} thisStatus Text to send.
     * @returns {Promise} Resolves when complete.
     */
    post(thisStatus) {
        let thisPost = masto.v1.statuses.create({
            status: thisStatus,
        });
        
        posts.set(thisStatus, thisPost);
        savePosts(); // Save after every post.
        return thisPost;
    }

    /**
     * Replies to the last post with the specified text, with the specified text. 
     * @param {string} newText Text to send.
     * @param {string} oldText Text of the post to reply to.
     * @returns {Promise} Resolves when complete.
     */
    async replyTo(oldText, newText) {
        let parentPost = posts.get(oldText);
        if (parentPost != null) {
            let reply = masto.v1.statuses.create({
                inReplyToId: (await parentPost).id,
                status: newText
            });
            
            posts.set(newText, reply);
            savePosts(); // Save after every post.
            
            return reply;
        }
    }

    /**
     * Returns a boolean indicating whether the specific network is enabled or not.
     * @returns {boolean}
     */
    isEnabled() {
        return config.mastodonEnabled;
    }
}

module.exports = Mastodon