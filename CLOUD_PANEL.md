# RIZO Cloud Panel (Firebase se judi admin website)

## Kya hai
- Har bot (ek ya kai deployments) khud ko Firebase mein register karta hai (naam, image, prefix, kitne
  numbers connected, online/offline).
- `owner-panel.html` ek alag, standalone website hai jo seedhi Firebase se judi hai. Isay koi bhi server
  par rakhne ki zaroorat nahi — seedha browser mein khol lo, ya GitHub Pages / Vercel par daal do.
- Wahan se: naam, image, prefix badlo, command renames (`.panelalias`) aur courses add karo — bot khud
  20 second mein utha leta hai, restart ki zaroorat nahi.
- Bot ke andar: `.login <secret-code>` se panel session khulta hai (15 minute), phir `.panel`, `.panelset`,
  `.panelalias`, `.course` commands kaam karte hain.

## Setup (zaroori)
1. Railway Variables mein `PANEL_SECRET=apna-secret-code` daalein (yeh `.login` ka code hai).
2. `FIREBASE_DB_URL` already aap ke diye hue project se set hai. Alag Firebase project use karna ho to
   Variables mein `FIREBASE_DB_URL=https://xxx-default-rtdb.firebaseio.com` daal dein.
3. `owner-panel.html` ko browser mein kholein. Pehli dafa koi bhi password likhein — wahi set ho jayega
   (Firebase mein save hota hai). Agli baar wahi password daalna hoga.

## ⚠️ Security — zaroor parhein
- Jo Firebase `apiKey` aap ne diya, woh Firebase ke design mein "secret" nahi hota (client-side key hai),
  asli hifazat **Firebase Realtime Database Rules** se aati hai. Agar aap ka database abhi "test mode"
  (`.read: true, .write: true`) mein hai, to jis kisi ke paas yeh link ho woh sab data dekh/badal sakta hai.
- Firebase Console > Realtime Database > Rules mein kam az kam itna zaroor karein:
  ```json
  { "rules": { ".read": false, ".write": false,
      "instances": { ".read": true, ".write": true } } }
  ```
  Behtar hifazat ke liye Firebase Authentication laga kar rules ko `auth != null` par le jayein — yeh is
  update mein shamil nahi hai, kyunke aap ne sirf client config diya tha.
- `owner-panel.html` ka password-gate sirf casual dekhne walon ko rokta hai; yeh asli (server-side) login
  nahi hai. Is file ka link kisi ke saath share na karein.
- `.login` ka code kisi ko na batayein. Ghalat code baar baar try karne par bot abhi khud block nahi karta.

## Commands (WhatsApp, sirf owner)
- `.login <code>` — panel session kholo (15 min)
- `.panel` — abhi ki settings + courses dekho
- `.panelset name|image|prefix <value>` — turant badlo
- `.panelalias <naya> <asli>` / `.panelunalias <naya>` — command ka naya naam
- `.course add Title | Price | Link` / `.course list` / `.course del <number>`

## V2: pair site branding + global banner + restart (is update mein naya)
- Owner panel se naam/image badalne par ab **bot ka naam + pair site ka title/avatar dono** badalte hain
  (20-25 second mein, koi redeploy nahi chahiye).
- `📣 Global Banner` button se ek message sab connected bots ke pair site ke upar bhej sakte ho (rang bhi chun sakte ho).
- Har bot card mein `♻️ Bot Restart karo` — Railway jaisi host khud dobara chala deti hai (crash nahi, normal exit).
- Image har jagah default: `https://files.catbox.moe/58675i.png` (config.js ka IMAGE_PATH, pair.html ka avatar, owner panel ka logo).

owner-panel.html is chat mein **alag file** ke taur par bhi diya gaya hai — kahin bhi (GitHub Pages, Vercel,
apni site) akela host kar sakte ho, sirf Firebase se juda hona kaafi hai.
