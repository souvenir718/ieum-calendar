const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const requiredFiles = ["index.html", "styles.css", "app.js", "vercel.json"];
const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length > 0) {
  console.error(`Missing static files: ${missing.join(", ")}`);
  process.exit(1);
}

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const assignmentCount = Array.from(app.matchAll(/\["(?:오전1|오전2|오후)",\s*"[^"]+"\]/g)).length;

if (assignmentCount !== 66) {
  console.error(`Expected 66 assignments, found ${assignmentCount}.`);
  process.exit(1);
}

console.log("Static calendar files verified.");
