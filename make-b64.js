const fs = require("fs");

const json = fs.readFileSync("gcp.json", "utf8");
const b64 = Buffer.from(json).toString("base64");

fs.writeFileSync("gcp_clean.b64", b64);
console.log("DONE -> gcp_clean.b64");
