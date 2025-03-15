function generateSignature() {
    const kid = "36ccfe00-78fc-4cab-9c5b-5460b0c78513";
    const algorithm = "sha256";
    const timestamp = Math.floor(Date.now() / 1000);
    const validity = 90;
    const userId = "";

    const data = kid + timestamp + validity + userId;
    const hash = CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
    return `kid=${kid}&algorithm=${algorithm}&timestamp=${timestamp}&validity=${validity}&userId=${userId}&value=${hash}`;
}