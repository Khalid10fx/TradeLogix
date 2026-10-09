# Premium system (no server, no Netlify functions)

Plans: 1 month $4.99 (30 days), 3 months $12.99 (90), 6 months $24.99 (180), 1 year $44.99 (365).
Change prices/names in `TC_PLANS` inside app/index.html (and the same table inside the Code Maker). Run ./sync-versions.sh after.

## Flow
1. Customer picks a plan, pays on Buy Me a Coffee, enters their email and taps "I've Paid - Request My Code".
2. The app sends the request to YOUR inbox through Web3Forms (email, plan, Device ID, request number). Replying to that email goes to the customer.
3. The request email already contains a 4-digit code. You check Buy Me a Coffee, press Reply and send the digits. (Code Maker is a backup tool for long signed codes.)
4. The customer gets the code. They paste it in the app (Menu > Get Premium > I already have a code).
5. Premium turns on. When it ends the ads/locks come back, but journal data is NEVER deleted. Renewing adds the new days on top of any days left.

## Rules the app enforces
- A code works ONCE per device (used codes are remembered on that device).
- A code is tied to the buyer's email and to the Device ID in the request (so forwarding it does not help). Leave Device ID empty in the Code Maker to make an any-device code (for restores).
- A code must be used within 90 days of being made. Codes are digitally signed. OWNER CHOICE: a short-code secret is inside the app (so the email can contain a 4-digit code), so a technical person who reads the app code could work out codes. Long signed codes (Code Maker) still need your private key file, which is NOT in the app.

## Honest limits (no server = no central list)
- A code is "one time" per device, not across the whole world. Device binding is what stops sharing.
- If someone clears the app's data/reinstalls, the used-codes list resets, so an old unexpired code could work again on that device. Journal data is lost in that case anyway.
- Changing the phone/PC clock backwards can extend Premium. Acceptable for this kind of app.
- Keep ADMIN-PRIVATE-KEY.json secret and backed up. If it leaks or is lost you must make a new key pair (see below); all old codes then stop working.

## New key pair (only if the private key leaks)
Run `node make-keypair.js`, paste the printed public key into TC_PUBLIC_KEY_B64 in app/index.html AND into the Code Maker's key (it uses the private file only), run ./sync-versions.sh, then rebuild.
