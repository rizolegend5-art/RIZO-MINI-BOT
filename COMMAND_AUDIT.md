# RIZO Mini Bot — Command Audit

This file is generated from the current plugin source. Exact live availability still depends on API uptime, WhatsApp permissions, and Railway environment variables.

- Unique primary patterns scanned (excluding adult-content plugin): **356**
- Primary patterns defined more than once: **27**

## Fixes included

- Message text extraction supports text, media captions, ephemeral/view-once wrappers, and common button/list replies.
- Duplicate command registrations no longer silently discard the earlier implementation: the newest remains the normal command; the earlier handler is retained under a filename-suffixed command (for example, `calc_fun_tools`).
- Owner recognition checks the alternate participant phone identifier (`participantPn`) used by newer Baileys message keys.
- Owner number defaults are no longer hard-coded to someone else; configure `OWNER_NUMBER` and optionally `OWNER_NUMBERS` in Railway Variables.
- Event handlers are awaited and their failures are logged instead of becoming unhandled promise rejections.
- `npm run check:all` syntax-checks JavaScript files.
- Adult-content plugin is excluded from loading.

## Duplicate primary patterns

- `addmember` — `addmember-pro.js:9`, `gc-setting.js:615`, `group-fun-pack.js:207`
- `admins` — `fun-tools.js:128`, `rizo-utility-pack.js:43`
- `alive` — `alive.js:8`, `main-alive.js:6`
- `antidelete` — `anti-delete.js:4`, `new-pack.js:173`
- `botinfo` — `brand-pack.js:126`, `rizo-utility-pack.js:29`
- `calc` — `extra-pack.js:334`, `fun-tools.js:161`, `rizo-utility-pack.js:51`
- `channelinfo` — `channel-power.js:348`, `channel-status.js:316`
- `channelstatus` — `channel-power.js:38`, `channel-status.js:15`
- `chstatbulk` — `channel-power.js:400`, `channel-status.js:283`
- `chstatforward` — `channel-power.js:243`, `channel-status.js:218`
- `chstatimg` — `channel-power.js:76`, `channel-status.js:67`
- `chstatreact` — `channel-power.js:272`, `channel-status.js:251`
- `chstatremind` — `channel-power.js:210`, `channel-status.js:181`
- `chstatsticker` — `channel-power.js:172`, `channel-status.js:139`
- `chstatvid` — `channel-power.js:107`, `channel-status.js:103`
- `forwardall` — `owner-panel-pro.js:161`, `power-pack.js:376`
- `genpass` — `api-master-pack.js:363`, `power-pack.js:186`
- `ginvite` — `addmember-pro.js:304`, `group-fun-pack.js:286`
- `groupinfo` — `fun-tools.js:91`, `rizo-utility-pack.js:37`
- `hug` — `group-fun-pack.js:511`, `love-commands.js:26`
- `kickall` — `gc-setting.js:229`, `group-fun-pack.js:227`
- `owner` — `generale.js:52`, `rizo-utility-pack.js:33`
- `reverse` — `extra-pack.js:355`, `rizo-utility-pack.js:64`
- `setprefix` — `all-settings.js:219`, `owner-panel-pro.js:561`
- `ship` — `group-fun-pack.js:405`, `love-commands.js:53`
- `tagall` — `gc-setting.js:710`, `tagall.js:5`
- `uptime` — `generale.js:8`, `power-pack.js:298`, `rizo-utility-pack.js:26`

## Primary command names

- `8ball`, `abcd`, `acceptall`, `activetime`, `add`, `addmember`
- `addmember2`, `addmember3`, `admincheck`, `admins`, `advice`, `age`
- `airport`, `alive`, `allahname`, `allnamaz`, `anagram`, `animequote`
- `animes`, `animesearch`, `animewall`, `anti-call`, `anticall`, `antidelete`
- `antilink`, `antilinkreset`, `apk`, `arcadd`, `arcset`, `arcstatus`
- `ascii`, `attp`, `autobio`, `autolikestatus`, `autoreact-off`, `autoreact-on`
- `autoread`, `autorecording`, `autotyping`, `autoviewsview`, `ayat`, `ayat2`
- `b64`, `banlist`, `base64`, `base64dec`, `base64enc`, `binary`
- `blur`, `bmi`, `botadmin`, `bothealth`, `botinfo`, `botnotice`
- `botpause`, `botresume`, `botscript`, `botstats`, `broadcast2`, `bugbotscript`
- `calc`, `capital`, `cat`, `channelinfo`, `channelstatus`, `charcount`
- `chatanalysis`, `checknum`, `choose`, `chstatauto`, `chstatbulk`, `chstatforward`
- `chstatimg`, `chstatlist`, `chstatreact`, `chstatremind`, `chstatsticker`, `chstatvid`
- `chucknorris`, `coinflip`, `color`, `compliment`, `compliment2`, `count`
- `count123`, `countryinfo`, `cpuinfo`, `crush`, `currency`, `dailyhadith`
- `dare`, `dare2`, `date`, `dayinfo`, `delpromo`, `demote`
- `dice`, `dog`, `dua`, `duacat`, `duel`, `emojimix`
- `end`, `eval2`, `expense`, `fakechat`, `fancytext`, `fb`
- `ff`, `flag`, `flip`, `forecast`, `fortune`, `forwardall`
- `fox`, `frombin`, `ftnum`, `ftraw`, `gaymeter`, `genpass`
- `ginvite`, `github`, `goldrate`, `goodbye`, `gooddeeds`, `goodmorning`
- `goodnight`, `grevoke`, `groupinfo`, `groupstats`, `groupstatus`, `habit`
- `hack`, `hadith2`, `hidetag`, `hijri`, `hijri2`, `howgay`
- `hug`, `ig3`, `igdl`, `igdl2`, `igdl4`, `insult`
- `ip2`, `iplookup`, `islamiccartoon`, `islamicevent`, `islamicfact`, `islamicmonths`
- `islamicquiz`, `islamicvideo`, `islamquiz`, `jarvis`, `jid`, `joke`
- `joke2`, `kalima`, `kick`, `kickall`, `kill`, `killall`
- `kiss`, `languages`, `leakvideo`, `leakvideo2`, `leave`, `length`
- `livescore`, `lock`, `lockgroup`, `logs`, `love`, `lovemeter`
- `lowercase`, `lyrics`, `maintenance`, `mathcheck`, `mathspeed`, `mcserver`
- `meme`, `mememaker`, `memory`, `memorycheck`, `memorygame`, `menu`
- `mlbb`, `mode`, `moon`, `morse`, `myref`, `naatvideo`
- `namaz`, `namaz2`, `namemeaning`, `neko`, `neverhave`, `nextnamaz`
- `nickname`, `online`, `owner`, `ownerhelp`, `ownerhub`, `pair`
- `pair2`, `palindrome`, `panda`, `password2`, `petrol`, `pickup`
- `ping`, `ping2`, `pings`, `pluginscan`, `pokemon`, `poll`
- `population`, `premium`, `premiumlookup`, `promo`, `promolist`, `promote`
- `prophetvideo`, `punch`, `punjabi`, `qrcode`, `quiz`, `quote2`
- `quransearch`, `raju`, `ramadancount`, `random`, `randomanime`, `randomline`
- `randompic`, `rate`, `reactioncheck`, `reactiontest`, `redeem`, `refadd`
- `refcheck`, `referralstats`, `refgrant`, `refleaderboard`, `refremove`, `refreset`
- `refrevoke`, `rejectall`, `remind`, `remindme`, `removeadmins`, `removedup`
- `removepp`, `replace`, `report`, `reportcarding`, `reportguide`, `reportscam`
- `reportscamchannel`, `requestlist`, `resetwarn`, `restart`, `reverse`, `riddle`
- `rizokijan`, `rletter`, `rnum`, `roast`, `salahguide`, `say`
- `screenshot`, `sendto`, `sepia`, `server`, `serverinfo`, `sessions`
- `setall`, `setbotname`, `setdesc`, `setgdesc`, `setgname`, `setname`
- `setpp`, `setprefix`, `setstatus`, `shayari2`, `ship`, `short2`
- `shorturl`, `silenttag`, `slap`, `slogan`, `song`, `sorttext`
- `steam`, `stickerinfo`, `stickerpack`, `sunriseset`, `surah`, `tagall`
- `tagme`, `tasbeeh`, `theme`, `timer`, `timezone`, `tobin`
- `todo`, `topactive`, `topwords`, `translate`, `traveltip`, `trivia`
- `triviacheck`, `truth`, `truth2`, `tts`, `typingcheck`, `typingtest`
- `unban`, `unbanhard`, `unblock`, `unlock`, `unlockgroup`, `uppercase`
- `uptime`, `usagestats`, `userban`, `userinfo`, `userunban`, `video`
- `voices`, `vv`, `vv2`, `waifu`, `warn`, `warns`
- `waterintake`, `watermark`, `weather`, `weatherweek`, `webshot`, `welcome`
- `whois`, `wiki`, `wordchain`, `wordcount`, `worldtime`, `wouldyou`
- `wouldyourather`, `wuduguide`, `xxxvideo`, `yesno`, `yts`, `zikr`
- `zikrstart`, `zodiacsign`

## Railway setup

Set `OWNER_NUMBER` to the owner WhatsApp phone number in international format with digits only (example format: `923001234567`). For multiple owners, set `OWNER_NUMBERS` to comma-separated international numbers. Set these in Railway Variables, then redeploy. Never put session files, database passwords, or API keys in public source.

## Verification limits

JavaScript syntax checks and a small command-registry duplicate test pass. The project was not deployed to Railway from this environment and WhatsApp/API runtime tests have not been performed. Song download providers may fail independently; the fallback sequence is designed to try the next provider.
