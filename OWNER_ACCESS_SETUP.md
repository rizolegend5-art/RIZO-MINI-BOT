# RIZO HELL-MD — Owner access and Railway setup

## Owner number
The configured personal owner number is **03154734548** (international format **923154734548**). The WhatsApp account used to pair/connect the bot can be a different number. Send owner commands from the personal owner number to the bot's WhatsApp chat; do not use the bot's own connected number as your personal owner identity.

If you deploy this ZIP to Railway, set these Variables under **Service → Variables**:

- `OWNER_NUMBER` = `923154734548`
- `MONGODB_URI` = your own MongoDB connection string (required for persistent sessions and user settings)
- `PREFIX` = `.` (optional)

Do not paste your database URI or any API keys into public chats or commit them to GitHub. The ZIP intentionally does not include a database password.

## Added lightweight commands
- `.uptime` / `.runtime` — process uptime
- `.botinfo` — runtime / memory / platform info
- `.owner` — official owner contact
- `.groupinfo` / `.ginfo` — current group details
- `.admins` — list group admins
- `.jid` — current chat and sender IDs
- `.calc  (25 + 5) * 2` — safe basic calculator
- `.base64enc text` / `.base64dec <encoded>` — Base64 conversion
- `.reverse hello` — reverse text
- `.charcount text` — character, word and line counts

Existing plugins and commands were retained except the removed referral/promo/premium system and unsafe external bug-script download. Group welcome/goodbye toggles and admin detection were repaired. The lyrics command still depends on provider availability and song indexing; audio downloads still depend on their external services.

## MongoDB Atlas connection (security)
The app already reads `MONGODB_URI` from environment variables; no password is hardcoded in this ZIP.

1. Because a database URI was pasted into chat, open MongoDB Atlas and rotate/change that database user's password before deployment. Update the URI to use the new password.
2. In Railway, open your project → the bot service → **Variables** → **New Variable**.
3. Set the variable name to `MONGODB_URI` and the value to the new Atlas connection string. Keep it private; do not put it in GitHub or inside the ZIP.
4. In Atlas, ensure Network Access permits your deployment environment. Prefer a restricted allowlist where feasible; avoid broad public access when possible.
5. Redeploy/restart the Railway service and check logs for `Database Connected Successfully`. If connection fails, check the username/password URL-encoding, database user permissions, and Atlas network access.

`.env.example` is only a template; it contains no real credentials. For local testing, copy it to `.env` and fill in your rotated URI. Keep `.env` out of version control.
