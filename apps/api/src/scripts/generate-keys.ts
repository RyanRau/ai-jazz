import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;

console.log("Set this as JWT_PRIVATE_KEY:\n");
console.log(Buffer.from(pem).toString("base64"));
