import { SignJWT } from "jose";

// service_role secret (the NEW secret)
const secretString = "sb_secret_92rO9nadMqJV2zBtM1Hz3w_ELYWAqsx";

// convert secret → Uint8Array for jose
const secret = new TextEncoder().encode(secretString);

const jwt = await new SignJWT({ role: "service_role" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(secret);

console.log("\n==== NEW SERVICE_ROLE JWT ====\n");
console.log(jwt);
console.log("\n==============================\n");
