# Google par bot ki site live search mein lana

Site mein pehle se: title/description, Open Graph, JSON-LD (WebApplication), canonical, /robots.txt, /sitemap.xml.
(Naya style pair.html mein bhi yahi sab shamil hai.)

1. Railway Variables: `SITE_URL=https://rizo-mini-bot-production-f3d7.up.railway.app`  (apna asli link)
2. https://search.google.com/search-console  > Add property > URL prefix > apni site ka link.
3. Verification: "HTML tag" chunein, `content="..."` wali value copy karein, Railway Variables mein
   `GOOGLE_SITE_VERIFICATION=<wo value>` daal kar redeploy, phir Verify dabayein.
4. Search Console > Sitemaps > `sitemap.xml` submit karein.
5. URL Inspection mein apna link daal kar "Request indexing" dabayein.

Note: Google kitni jaldi aur kis rank par dikhaye, yeh Google tay karta hai (din se hafton lag sakte hain).
Custom domain (jaise rizomd.com) lene se naam search karne par aana aasan hota hai.
