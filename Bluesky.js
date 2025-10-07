const { default: AtpAgent } = require("@atproto/api"); // Bluesky AtProtocol bot stuff.
const { config } = require(".");
const Network = require("./Network");
const bskyClient = new AtpAgent({ service: 'https://bsky.social' });

/**
 * @type {Promise<{
    uri: string;
    cid: string;
}>}
 */
let lastPost = null;

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
        lastPost = bskyClient.post({ text: thisStatus });
        return lastPost;
    }

    /**
     * Replies to the last post. 
     * @param {string} thisStatus Text to send.
     * @returns {Promise} Resolves when complete.
     */
    replyLast(thisStatus) {
        if (lastPost == null) return null;
        else {
            bskyClient.post({
                text: thisStatus,
                reply: {
                    parent: lastPost
                }
            });
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