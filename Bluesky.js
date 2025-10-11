const bskyURL = 'https://bsky.social';
const saveDataPath = "./bsky-posts.json";

const fs = require('fs');
const { default: AtpAgent } = require("@atproto/api"); // Bluesky AtProtocol bot stuff.
const { config } = require(".");
const Network = require("./Network");
const bskyClient = new AtpAgent({ service: bskyURL });

/**
 * @type {Map<String, Promise<{
    uri: string;
    cid: string;
}>>}
 */
let posts = new Map();

// On load, read from file.
loadPosts();

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

module.exports = class Bluesky extends Network {
    /**
     * Logs onto the network.
     * @returns {Promise} Resolves when complete.
     */
    logon() {
        return bskyClient.login({ identifier: config.bskyName, password: config.bskyPass })
    }

    /**
     * Posts to the network as a new post.
     * @param {string} thisStatus Text to send.
     * @returns {Promise} Resolves when complete.
     */
    post(thisStatus) {
        let thisPost = bskyClient.post({ text: thisStatus });
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
        const parentPost = posts.get(oldText);
        if (parentPost != null) {
            const parentAsObject = (await bskyClient.getPosts({uris: [(await parentPost).uri]})).data.posts[0];
            const root = parentAsObject.reply ? parentAsObject.reply.root : await parentPost;
            
            const replyPost = bskyClient.post({
                text: newText,
                reply: {
                    parent: await parentPost,
                    root: root 
                },
            });

            posts.set(newText, replyPost);
            savePosts(); // Save after every post.

            return replyPost;
        }
    }
    
    /**
     * Returns a boolean indicating whether the specific network is enabled or not.
     * @returns {boolean}
     */
    isEnabled() {
        return true;
    }
}