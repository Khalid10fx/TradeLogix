TRADECYCLE - START HERE (simple steps)

WHAT CHANGED
- Premium now uses ONLY Web3Forms. No Netlify server needed. Netlify just shows the website.
- Plans: 1 month, 3 months, 6 months, 1 year. Renewing keeps all journal data.
- Codes are one-time and signed. You make them with TradeCycle-Code-Maker.html (private, NOT in this ZIP).

STEP 1 - Put the files on GitHub
Copy everything from this ZIP into your GitHub repo (replace files with the same name, keep folders).
Do NOT delete anything else. GitHub then rebuilds the APK and Windows app by itself (about 3 minutes):
repo > Actions > "Build APK and EXE". When finished, open repo > Releases > "Latest TradeCycle build".
There you download TradeCycle.apk and TradeCycle-Setup.exe.
(Optional: delete the two old failing workflows .github/workflows/build.yml and nt-fixed.yml.)

STEP 2 - Website
Netlify auto-publishes from GitHub. Open /app to check the journal opens. No settings needed.

STEP 3 - Test Premium (5 minutes)
a) In the app: Menu > Get Premium > choose plan > enter your own email > "I've Paid - Request My Code".
b) Check your inbox yayazhey@gmail.com (also Spam). Web3Forms may ask you to confirm the email the first time.
c) Open TradeCycle-Code-Maker.html, load ADMIN-PRIVATE-KEY.json once, paste the email, Make code.
d) Paste the code in the app > Unlock Premium. Try the same code again: it must say "already been used".
Do this on the website, the APK, and the Windows app.

KEEP SECRET: ADMIN-PRIVATE-KEY.json (never upload it to GitHub or send it to anyone).
