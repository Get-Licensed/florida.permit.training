const fs = require("fs");

const input = "gcp.json";
const output = "gcp.b64";

try {
  const bytes = fs.readFileSync(input);
  const base64 = bytes.toString("base64");
  fs.writeFileSync(output, base64);
  console.log("SUCCESS: Base64 written to gcp.b64");
} catch (err) {
  console.error("ERROR:", err);
}
