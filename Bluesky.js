const { default: AtpAgent } = require("@atproto/api"); // Bluesky AtProtocol bot stuff.
const { config } = require(".");
const Network = require("./Network");
const bskyClient = new AtpAgent({ service: 'https://bsky.social' });

module.exports = class Bluesky extends Network {
    /**
     * Logs onto the network.
     * @returns {Promise} Resolves when complete.
     */
    Logon() {
        return bskyClient.login({ identifier: config.bskyName, password: config.bskyPass })
    }

    /**
     * Posts to the network as a new post.
     * @returns {Promise} Resolves when complete.
     */
    Post() {
        return bskyClient.post({ text: thisStatus });
    }

    /**
     * Replies to the last post. 
     * @returns {Promise} Resolves when complete.
     */
    ReplyLast() {
    
    }
    
    /**
     * Returns a boolean indicating whether the specific network is enabled or not.
     * @returns {boolean}
     */
    isEnabled() {
        return true;
    }
}