// Only needed if your private key leaks or is lost. Run: node make-keypair.js
// It writes NEW-ADMIN-PRIVATE-KEY.json (keep secret) and prints the PUBLIC key to paste into app/index.html (TC_PUBLIC_KEY_B64).
const {webcrypto:c}=require("crypto"),fs=require("fs");
(async()=>{const k=await c.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
fs.writeFileSync("NEW-ADMIN-PRIVATE-KEY.json",JSON.stringify(await c.subtle.exportKey("jwk",k.privateKey)));
console.log("TC_PUBLIC_KEY_B64 =",Buffer.from(await c.subtle.exportKey("raw",k.publicKey)).toString("base64"));})();
