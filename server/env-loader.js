const fs = require("node:fs");
const path = require("node:path");

function loadEnvFiles(cwd = process.cwd(), target = process.env) {
  for (const filename of [".env", ".env.local"]) {
    loadEnvFile(path.join(cwd, filename), target);
  }
  return target;
}

function loadEnvFile(filename, target) {
  if (!fs.existsSync(filename)) {
    return;
  }

  const content = fs.readFileSync(filename, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }
    const [key, value] = parsed;
    if (target[key] === undefined) {
      target[key] = value;
    }
  }
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const eq = trimmed.indexOf("=");
  if (eq <= 0) {
    return null;
  }

  const key = trimmed.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  return [key, unquoteEnvValue(trimmed.slice(eq + 1).trim())];
}

function unquoteEnvValue(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

module.exports = { loadEnvFiles, parseEnvLine };
