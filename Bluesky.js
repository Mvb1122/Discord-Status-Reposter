const saveDataPath = "./bsky-posts.json";

const fs = require('fs');
const { default: AtpAgent } = require("@atproto/api"); // Bluesky AtProtocol bot stuff.
const { config } = require(".");
const Network = require("./Network");
const { DidResolver, HandleResolver } = require("@atproto/identity");
/** @import AvatarCache from './AvatarCache'; */
/** @import { DidDocument } from '@atproto/identity'; */

/**
 * @type {Map<String, Promise<{uri: string;cid: string;}>>}
 * @type {Map<String, Promise<{uri: string;cid: string;}>>}
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

class Resolver {
    /**
      * @param {string} handle - The account's handle.
      * @returns {Promise<DidDocument | null>} The DID document.
      * @throws {Error} If I am unable to find the specified {@link handle}'s DID document.
      */
    static async resolveDidDocumentFromHandle(handle) {
        const did = await Resolver.#handleResolver.resolve(handle);
        if (!did) throw new Error("Unable to resolve handle.");
        const document = await Resolver.#didResolver.resolve(did);
        return document
    }

    /**
      * @param {string} handle - The account's handle.
      * @returns {Promise<string>} The account's service endpoint.
      * @throws {Error} If I am unable to find the specified {@link handle}'s PDS.
      */
    static async resolveServiceFromHandle(handle) {
        const document = await Resolver.resolveDidDocumentFromHandle(handle)
        if (!(document && document.service)) throw new Error("DID document does not specify services.");
        const service = document.service.find(service => service.id == "#atproto_pds");
        if (!service) throw new Error("DID document does not specify a personal data server.");
        if (typeof service.serviceEndpoint !== "string") throw new Error("Service endpoint not found in document.");
        return service.serviceEndpoint;
    }
    static #didResolver = new DidResolver({});
    static #handleResolver = new HandleResolver({});
}

module.exports = class Bluesky extends Network {
    name = "Bluesky"
    // Doesn't quite satisify TypeScript; thinks it could be undefined. Unsure of an elegant solution. Though, it doesn't matter on runtime.
    /** @type {AtpAgent} */
    blueskyClient

    /**
     * Logs onto the network.
     * @returns {Promise} Resolves when complete.
     */
    async logon() {
        const serviceEndpoint = await Resolver.resolveServiceFromHandle(config.bskyName);
        this.bskyClient = new AtpAgent({ service: serviceEndpoint });
        return await this.bskyClient.login({ identifier: config.bskyName, password: config.bskyPass });
    }

    /**
     * Posts to the network as a new post.
     * @param {string} thisStatus Text to send.
     * @returns {Promise} Resolves when complete.
     */
    post(thisStatus) {
        let thisPost = this.bskyClient.post({ text: thisStatus });
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
            const parentAsObject = await this.#fetchPost(await parentPost);
            /**
             * I went through the effort of documenting this because apparently it wasn't written down anywhere? See the BlueskyReply file.
             * @type {import('./BlueskyReply').BlueskyReply | undefined}
             */
            const reply = parentAsObject.record.reply; 
            const root = reply ? reply.root : await parentPost;
            
            const replyPost = this.bskyClient.post({
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
     * @param {{uri: string;cid: string;}} post 
     * @returns {Promise<import('@atproto/api/dist/client/types/app/bsky/feed/defs').PostView>}
     */
    async #fetchPost(post) {
        return (await this.bskyClient.getPosts({uris: [post.uri]})).data.posts[0];
    }
    
    /**
     * Returns a boolean indicating whether the specific network is enabled or not.
     * @returns {boolean}
     */
    isEnabled() {
        return true;
    }

    /**
     * Sets the profile picture from an AvatarCache instance.
     * @param {AvatarCache} avatarCache The AvatarCache instance
     */
    async setAvatar(avatarCache) {
        const avatarBlob = await avatarCache.fetch({
            extension: "png",
            forceStatic: true,
            size: 512,
        });
        const blobUploadResponse = await this.bskyClient.uploadBlob(avatarBlob, {
            encoding: "image/png",
        });
        await this.bskyClient.upsertProfile((record => {
            record.avatar = blobUploadResponse.data.blob
            return record
        }));
    }
}