const fs = require("node:fs");
const path = require("node:path");
const { dataDir } = require("../config");
const { STORE_SCHEMA_VERSION, validateStoreSnapshot } = require("../schema");

const storePath = path.join(dataDir, "store.json");

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readStoreSnapshot() {
  if (!fs.existsSync(storePath)) {
    return validateStoreSnapshot(null);
  }

  try {
    const raw = fs.readFileSync(storePath, "utf8");
    return validateStoreSnapshot(JSON.parse(raw));
  } catch (error) {
    console.error(`PERSISTENCE READ ERROR path=${storePath} error=${JSON.stringify(error.message)}`);
    return validateStoreSnapshot(null);
  }
}

function writeStoreSnapshot(snapshot) {
  ensureDataDir();

  const normalized = {
    version: STORE_SCHEMA_VERSION,
    ...snapshot,
  };
  const tempPath = `${storePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, storePath);
}

module.exports = {
  readStoreSnapshot,
  writeStoreSnapshot,
  storePath,
};
