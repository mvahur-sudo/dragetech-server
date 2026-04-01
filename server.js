const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const rootDir = __dirname;
const configPath = path.join(rootDir, 'config.ini');
const dataDir = path.join(rootDir, 'data');
const contentPath = path.join(dataDir, 'site-content.js');
const bundledDefaultContentPath = path.join(rootDir, 'defaults', 'site-content.js');

function parseIni(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    result[key] = value;
  }
  return result;
}

function loadConfig() {
  const defaults = {
    PORT: '3001',
    USER: '',
    PASSWORD: ''
  };

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, 'PORT=3001\nUSER=\nPASSWORD=\n', 'utf8');
    return defaults;
  }

  return { ...defaults, ...parseIni(fs.readFileSync(configPath, 'utf8')) };
}

const config = loadConfig();
const PORT = Number(process.env.PORT || config.PORT || 3001);
const authEnabled = Boolean(config.USER && config.PASSWORD);

function ensureDataFiles() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(contentPath) && fs.existsSync(bundledDefaultContentPath)) {
    fs.copyFileSync(bundledDefaultContentPath, contentPath);
  }
}

ensureDataFiles();

app.use(express.json({ limit: '2mb' }));

function requireAuth(req, res, next) {
  if (!authEnabled) return next();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Dragetech Admin"');
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  const user = sep >= 0 ? decoded.slice(0, sep) : decoded;
  const password = sep >= 0 ? decoded.slice(sep + 1) : '';

  if (user !== config.USER || password !== config.PASSWORD) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Dragetech Admin"');
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  next();
}

function objectToJsFile(content) {
  return `window.siteContent = ${JSON.stringify(content, null, 2)};\n`;
}

function parseSiteContentFile(raw) {
  const match = raw.match(/window\.siteContent\s*=\s*([\s\S]*);\s*$/);
  if (!match) {
    throw new Error('Could not parse site-content.js');
  }

  return Function(`"use strict"; return (${match[1]});`)();
}

app.get('/api/admin/content', requireAuth, (_req, res) => {
  try {
    const raw = fs.readFileSync(contentPath, 'utf8');
    const parsed = parseSiteContentFile(raw);
    return res.json({ ok: true, content: parsed });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/admin/content', requireAuth, (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ ok: false, error: 'Invalid content payload' });
    }

    fs.writeFileSync(contentPath, objectToJsFile(content), 'utf8');
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.use(express.static(rootDir));

app.get('/site-admin', (_req, res) => {
  res.sendFile(path.join(rootDir, 'site-admin.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dragetech site listening on http://localhost:${PORT}`);
  if (authEnabled) {
    console.log(`Admin auth enabled for user: ${config.USER}`);
  } else {
    console.log('Admin auth disabled (set USER and PASSWORD in config.ini to enable it)');
  }
});
