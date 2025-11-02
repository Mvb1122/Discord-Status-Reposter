/** @import { ImageURLOptions, User } from "discord.js" */

/** I represent a cache for Discord user avatars. I am used when multiple networks need the same avatar with varying sizes and extensions. */
class AvatarCache {
    /**
     * @param {User} user
     */
    constructor(user) {
        /** @type {Map<string, Promise<Blob>} */
        this.cachedBlobs = new Map();
        this.user = user;
    }

    /**
     * Fetches the avatar data with the specified image URL options and populates the cache.
     * @param {ImageURLOptions} imageUrlOptions
     */
    fetch(imageUrlOptions) {
        const key = AvatarCache.getImageUrlOptionsKey(imageUrlOptions)
        const cachedBlob = this.cachedBlobs.get(key)
        if (cachedBlob) {
            return cachedBlob;
        } else {
            const imageUrl = this.user.avatarURL(imageUrlOptions);
            const fetchPromise = fetch(imageUrl).then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}.`);
                }
                return response.blob();
            }).catch((error) => {
                this.cachedBlobs.delete(key);
                throw error
            })
            this.cachedBlobs.set(key, fetchPromise);
            return fetchPromise;
        }
    }

    /**
     * @param {ImageURLOptions} imageUrlOptions
     * @returns {string}
     */
    static getImageUrlOptionsKey(imageUrlOptions) {
        return `${imageUrlOptions.forceStatic == true}${imageUrlOptions.size}${imageUrlOptions.extension}`;
    }
}

module.exports = AvatarCache;
