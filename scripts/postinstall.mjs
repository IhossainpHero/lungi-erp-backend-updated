import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

const chromiumPackage = path.join(
  projectRoot,
  "node_modules",
  "@sparticuz",
  "chromium",
);

const chromiumBin = path.join(chromiumPackage, "bin");

const publicDir = path.join(projectRoot, "public");

if (!fs.existsSync(chromiumBin)) {
  console.log("Chromium bin directory not found.");
  process.exit(0);
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputFile = path.join(publicDir, "chromium-pack.tar");

console.log("Creating Chromium package...");

execSync(`tar -cf "${outputFile}" -C "${chromiumBin}" .`, {
  stdio: "inherit",
});

console.log("Chromium package created:");
console.log(outputFile);
