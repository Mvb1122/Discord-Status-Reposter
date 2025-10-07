const mastodonURL = "https://mastodon.social";
const { createRestAPIClient } = require("masto"); // Mastodon ActivityPub stuff.
const { config } = require(".");
const Network = require("./Network");

let masto;

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
     * @returns {Promise} Resolves when complete.
     */
    post() {
        return masto.v1.statuses.create({
            status: thisStatus,
        });
    }

    /**
     * Replies to the last post. 
     * @returns {Promise} Resolves when complete.
     */
    replyLast() {

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