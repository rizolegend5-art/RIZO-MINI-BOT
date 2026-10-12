# Mini Bot update notes

## Fixed
- Normalized WhatsApp phone, device-JID, and LID/alternate-phone identities before owner/admin checks. Configured owner numbers can be overridden with `OWNER_NUMBER` or `OWNER_NUMBERS`.
- Registered the Baileys group-participant event listener. Welcome/goodbye settings now save per group and may be changed by a group admin or configured owner.
- Fixed message body extraction, command alias lookup, awaited async command handlers, caught event-plugin errors, and preserved WhatsApp reply options such as mentions.
- Added persisted `ANTI_STATUS`, `.antistatus on/off`, `.autostatusreply on/off`, and corrected status-view command aliases while keeping older spellings as aliases.
- Removed referral and promo command plugins, referral pairing attribution, and premium menu entries. Regular commands no longer have premium gates; bot-profile and channel-publishing controls remain owner-only.
- Replaced the broken anime image lookup with Jikan anime search; serialized/rate-limited Jikan calls and retry transient service failures once.
- Removed an obfuscated, eval/debugger-heavy connection-open hook that was not needed for core bot startup, and removed the external “bug bot script” download command.
- Added durable `.setprefix` and `.mode` settings, plus a complete syntax-check/test script.

## Setup
- Copy `.env.example` to `.env` and set the MongoDB URI and the intended owner phone number(s). Keep `.env` private.
- Reconnect/restart the bot session after updating the project. The owner number must be an international phone number (e.g. `923154734548`), not a WhatsApp LID.
- The bot itself must be an admin in a group to remove anti-link messages or perform moderation. A human group admin can toggle `.antilink`, `.welcome`, and `.goodbye`.

## Validation and limits
- `npm run check` runs `node --check` on every JavaScript file and the built-in tests for owner/admin identity matching and command alias lookup.
- This archive was checked locally; live WhatsApp group events, MongoDB writes, external anime API availability, and every third-party command/API were not exercised. No ZIP-only source review can guarantee every network-backed command works in the target account/environment.
- An older report in the source archive identified a previously exposed MongoDB credential. The current archive contains only placeholders; rotate that credential if it is still active.
