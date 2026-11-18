#!/usr/bin/env node
/**
 * Generates the RSA key pair Convex Auth uses to sign session JWTs and stores
 * it on the current Convex deployment (JWT_PRIVATE_KEY + JWKS).
 *
 *   node scripts/generate-auth-keys.mjs           # sets env on the dev deployment
 *   node scripts/generate-auth-keys.mjs --prod    # sets env on the prod deployment
 *   node scripts/generate-auth-keys.mjs --print   # only prints the values
 */
import { generateKeyPairSync } from "node:crypto";
import { execFileSync } from "node:child_process";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const jwk = publicKey.export({ format: "jwk" });
const JWT_PRIVATE_KEY = pem.trimEnd().replace(/\n/g, " ");
const JWKS = JSON.stringify({ keys: [{ use: "sig", alg: "RS256", ...jwk }] });

const args = process.argv.slice(2);
if (args.includes("--print")) {
  console.log(`JWT_PRIVATE_KEY="${JWT_PRIVATE_KEY}"`);
  console.log(`JWKS=${JWKS}`);
  process.exit(0);
}

const extra = args.includes("--prod") ? ["--prod"] : [];
for (const [name, value] of [
  ["JWT_PRIVATE_KEY", JWT_PRIVATE_KEY],
  ["JWKS", JWKS],
]) {
  execFileSync("npx", ["convex", "env", "set", ...extra, name, "--", value], { stdio: "inherit" });
}
console.log("✔ JWT_PRIVATE_KEY and JWKS set on the Convex deployment.");
