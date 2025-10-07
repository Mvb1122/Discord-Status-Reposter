const bskyURL = 'https://bsky.social';

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
        return thisPost;
    }

    /**
     * Replies to the last post with the specified text, with the specified text. 
     * @param {string} newText Text to send.
     * @param {string} oldText Text of the post to reply to.
     * @returns {Promise} Resolves when complete.
     */
    replyTo(oldText, newText) {
        const parentPost = posts.get(oldText);
        if (parentPost != null) {
            const replyPost = bskyClient.post({
                text: newText,
                reply: {
                    parent: parentPost
                }
            });
            posts.set(newText, replyPost);
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