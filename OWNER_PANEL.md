# Owner Panel + Pair fix + Follow password (V35 fixes)

## 1) Variables (Katabump / Railway) — yeh 3 daalo
| Variable | Kaam |
|---|---|
| `RIZO_PANEL_TOKEN` (ya wahi `PANEL_SECRET`) | `/panel` website ka login password |
| `FOLLOW_PASSWORD` | follow commands ka password (ya bot mein `.setfollowpass <pass>`) |
| `AI_API_URL` + `AI_API_KEY` + `AI_MODEL` | `.code` ke liye AI (optional, neeche dekho) |

Baqi pehle jaisa: `OWNER_NUMBER` = tumhara number (panel sirf is number ke session par chalta hai).

## 2) Owner Panel (buttons)
- Browser mein kholo:  `https://TUMHARA-BOT-LINK/panel`
- Token daalo -> **Commands** tab -> saari commands buttons hain. Click = command chal gayi.
- Search box + category chips (owner, group, tools, fun, ...). Neeche jawab dikhta hai (poora jawab WhatsApp ke "Apna chat" mein bhi aata hai).
- Jis command ko input chahiye (number / link / text) uske liye upar **Args** box mein likho, phir button dabao.
- Group commands ke liye **Groups load karo** -> group chuno -> button dabao.
- ⚠️ wale buttons (restart, kick, sfollow ...) pehle "pakka?" poochte hain. `eval2` panel se nahi chalta.
- Jin commands ko kisi message par *reply* karna padta hai (sticker, vv, preview) wo WhatsApp se hi chalengi.
- 8 galat token = us IP ke liye 15 minute band.

## 3) Follow commands ka password
- Jis ko password pata hai wo **private chat** mein: `.followlogin <password>` -> 30 minute ke liye `.sfollow` / `.sunfollow` / `.followstats` / `.sreacts ... follow` / `.svotes ... follow` chalte hain.
- `.followlogout` = wapas lock.
- Password badalna (sirf host): `.setfollowpass NayaPass123`  (purane saare logins khatam ho jate hain).
- Host (OWNER_NUMBER) aur owner panel ko password nahi poocha jata. Password set na ho to baqi sab ke liye band.
- 5 galat koshish = 15 minute ke liye us number ka login band.

## 4) `.pair`
Pehle kisi aur ke Heroku server se code mangta tha (band ho chuka) — ab bot ke apne `/code` se aata hai.
Doosre server ka pair site use karna ho to `PAIR_API_URL=https://...` daalo.

## 5) `.code`
Owner ko ab asal wajah dikhti hai (jaise `HTTP 402`). Free Pollinations agar key maangta ho to apna AI daalo:
`AI_API_URL` (koi bhi OpenAI-style `.../chat/completions`), `AI_API_KEY`, `AI_MODEL`.
Screenshot preview ke liye server par Chromium chahiye (Dockerfile mein hai). Warna sirf `index.html` file aati hai.
