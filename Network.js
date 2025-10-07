class Network {
    /**
     * Logs onto the network.
     * @returns {Promise} Resolves when complete.
     */
    logon() {
        
    }

    /**
     * Posts to the network as a new post.
     * @param {string} thisStatus Text to send.
     * @returns {Promise} Resolves when complete.
     */
    post(thisStatus) {

    }

    /**
     * Replies to the last post. 
     * @param {string} thisStatus Text to send.
     * @returns {Promise} Resolves when complete.
     */
    replyLast(thisStatus) {

    }

    /**
     * Returns a boolean indicating whether the specific network is enabled or not.
     * @returns {boolean}
     */
    isEnabled() {
        return true;
    }
}

module.exports = Network