const mastodonURL = "https://mastodon.social";
const { createRestAPIClient } = require("masto"); // Mastodon ActivityPub stuff.
const { config } = require(".");
const Network = require("./Network");

/**
 * @type {import("masto/mastodon/rest/client.js").Client}
 */
let masto;

/**
 * @type {import("masto/mastodon/entities/v1/status.js").Status}
 */
let lastStatus = null;

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
        return masto.v1.statuses.create({
            status: thisStatus,
        });
    }

    /**
     * Replies to the last post. 
     * @param {string} thisStatus Text to send.
     * @returns {Promise} Resolves when complete.
     */
    replyLast(thisStatus) {
        if (lastStatus != null) {
            lastStatus = masto.v1.statuses.create({
                inReplyToId: lastStatus.id,
                status: thisStatus
            });
            return lastStatus;
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