// No-op replacement for es6-shim (required by node-wordnet).
const fs = require("fs");
const path = require("path");

const markerFile = path.resolve(__dirname, "es6-shim-stub-loaded.txt");
try {
	fs.writeFileSync(markerFile, `es6-shim stub loaded at ${new Date().toISOString()}\n`);
} catch {
	// Fail silently in restricted environments.
}
