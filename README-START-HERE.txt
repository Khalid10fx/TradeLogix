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

4-DIGIT CODE IN THE EMAIL (current way)
Every request email you get already contains the customer's 4-digit code between "=== CODE FOR THIS CUSTOMER ===" lines.
1) Check Buy Me a Coffee for the payment.
2) Press Reply (it goes to the customer) and send just the 4 digits. Done.
The code works once, only for that email and only on the device that made the request, for 14 days.
After 5 wrong tries the app waits 30 minutes. A new request makes a new code, so renewing is the same steps again (the days left are kept, journal data is never deleted).

IMPORTANT (your choice): the 4-digit secret is inside the app so it can put the code in the email. A technical person who reads the app code could work out codes. 4 digits is also short, so a script could guess it. If you want it safer, change TC_CODE_DIGITS to 6 in app/index.html (run ./sync-versions.sh).

CODE MAKER (backup, code-maker.html)
For special cases (for example a customer who lost their phone and needs a code for a NEW device) the Code Maker still makes long signed codes with your private key file.
NEW private key file: ADMIN-PRIVATE-KEY.json in this download. The OLD private key file is no longer valid - delete it. Never upload the key to GitHub.
