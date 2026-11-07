# Update 2.7.0

## Naya: `.svotes` (sab ke liye)
Saare connected sessions channel poll par vote karte hain.
- `.svotes <poll-link> 1`        -> option 1 (pehla)
- `.svotes <poll-link> B`        -> option B (doosra)
- `.svotes <poll-link> Ali`      -> option ka naam
- `.svotes <poll-link> 1 2`      -> sessions dono options mein baant diye jate hain
- `.svotes <poll-link> A follow` -> pehle channel follow, phir vote
- `.svotes <poll-link> list`     -> poll ke options dikhata hai

## Change
- `.sreacts` / `.arcadd` ab host-only nahi: sab use kar sakte hain.

## Fix: `.islamiccartoon` — poori episode
- Pehle sirf watch link deta tha / download provider 15-30 sec ka preview deta tha.
- Ab local yt-dlp se *poori episode* download hoti hai (480p -> 360p -> 240p -> 144p, 250 MB tak).
- 90 MB se badi file document ki tarah jati hai.
- Download ke baad duration check hoti hai; agar file chhoti ho to "full" nahi kehta.
- Naya helper: `mediaDl.downloadFullVideoFile()` in `lib/media-dl.js`.

## `.sreacts` — reply mode
- Group/chat mein kisi message ko *reply* karke `.sreacts` (ya `.sreacts ❤️ 🔥`) likho -> saare sessions us message par react karte hain.
- Sirf wahi sessions react kar sakte hain jo us group mein maujood hon.

## `.sreacts sticker` — emoji ki sticker
- Message ko reply karke `.sreacts sticker ❤️ 🔥` -> har session emoji ki bani sticker us message ke neeche bhejta hai.
- Emoji image Twemoji (jsDelivr) se aati hai, sharp se 512x512 webp banti hai (server par internet chahiye).
- Note: WhatsApp ka asli "sticker reaction" (bubble ke corner wala) Baileys mein support nahi, is liye sticker reply ki tarah jati hai.

## Pair website (pair.html) — naya design + features
- Number auto-format: `03XX...` likhne par Pakistan (+92) khud lag jata hai, preview dikhta hai.
- Code 8 boxes mein dikhta hai, 2 minute ka countdown bar, expire hone par "Naya code" button.
- Connect hote hi page khud pakar leta hai (`/status` poll) aur "Bot connect ho gaya" dikhata hai.
- Live "Linked accounts" counter, last number yaad rakhta hai, Roman Urdu / English toggle.
- Features cards, Channel / Group buttons, FAQ ("code nahi aa raha").
- Backend: `/code` ab pairing code 3 dafa try karta hai aur local number normalise karta hai. Purana `/code` JSON format waisa hi hai.

## `.sreacts sticker` — animated circle
- Message ko reply karke `.sreacts sticker ❤️ 🔥 😍` -> emojis neeche se uthte hain, ek gol circle (ring) banate hain, phir ring ghoomti hai. Animated sticker sab sessions bhejte hain.
- Ring mein 8-14 emojis (sessions ki tadaad ke hisab se), diye hue emojis repeat hote hain.
- Purana single emoji sticker chahiye to: `.sreacts sticker static ❤️`
- Size WhatsApp ki 500 KB hadd ke andar rakhne ke liye khud quality kam karta hai. Pehli baar banne mein 1-20 second lag sakte hain, phir cache se foran.

## Fix round — svotes / sreacts / song / anime
- Plugin errors ab chat mein dikhte hain (pehle sirf console mein jate the, isi liye command "chup" lagta tha).
- `.svotes`: har network call par time limit (12-15s). Hang nahi hota, jawab aata hai. `.massvote` / `.autovote` ab isi ke alias hain.
- `plugins/massvote.js` hata diya: wo asal vote nahi karta tha, sirf nakli counter badhata tha.
- `.arcadd` ab `.sreacts` wala hi engine hai (channel link + group reply mode + sticker). `arcadd.js` hata diya.
- Song/video: YouTube ke 6 clients ek ek kar ke try hote hain (default, android_vr, tv, web_safari, mweb, ios), phir ytdl-core, phir SoundCloud. Fail hone par asal wajah chat mein.
- Naya `.nettest` (aur `.nettest yt`): server ka internet / yt-dlp / ffmpeg / YouTube check.
- `.waifu` / `.neko`: purana single-API handler (api-master-pack) hata kar 5-API chain (nekos.best, waifu.pics, nekosia, waifu.im, purrbot).
