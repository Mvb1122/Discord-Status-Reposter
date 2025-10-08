# SETUP: 
1. Copy and fill out `BLANK_config.json`.
2. Rename your copy to `config.json`
3. Make a Discord bot application thing. 
    1. Make sure your Discord bot has presence and message contents intent, can see the channel you specified and is in a server with specified user.
4. Run `node index.js`
5. Change the status of the user in question. It should send everything through.

Mastodon Config: 
1. Make an account. 
2. Make a an application through that account.
3. Make sure it has `write:statuses` permission. 
4. Add its access token to the config and enable it.

Bsky Config: 
1. Make an account. 
2. Enter your Username and Password into the config (Data will be kept on your device only.)