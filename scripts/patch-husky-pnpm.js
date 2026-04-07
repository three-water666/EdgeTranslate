const fs = require("fs");
const path = require("path");

const huskyLocalPath = path.join(process.cwd(), ".git", "hooks", "husky.local.sh");

if (!fs.existsSync(huskyLocalPath)) {
    process.exit(0);
}

const content = fs.readFileSync(huskyLocalPath, "utf8");

if (!content.includes("packageManager=pnpm")) {
    process.exit(0);
}

const patched = content.replace("packageManager=pnpm", "packageManager=npm");

fs.writeFileSync(huskyLocalPath, patched);
console.log("Patched Husky v4 local hook runner for pnpm compatibility.");
