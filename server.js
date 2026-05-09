// Bible Adventure — server.
// Express app: serves the static SPA from /public, gates everything behind
// Google OAuth, and proxies Groq AI calls so the API key never leaves the
// server. Sessions and a shared AI-summary cache live in Neon Postgres.

require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const { Pool } = require("pg");

const {
  PORT = "3000",
  SESSION_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GROQ_API_KEY,
  DATABASE_URL,
  NODE_ENV = "development",
} = process.env;

// ---- env validation ----
const missing = [];
if (!SESSION_SECRET || SESSION_SECRET.length < 16) missing.push("SESSION_SECRET");
if (!GOOGLE_CLIENT_ID)     missing.push("GOOGLE_CLIENT_ID");
if (!GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
if (!GOOGLE_REDIRECT_URI)  missing.push("GOOGLE_REDIRECT_URI");
if (!GROQ_API_KEY)         missing.push("GROQ_API_KEY");
if (!DATABASE_URL)         missing.push("DATABASE_URL");
if (missing.length) {
  console.error(
    "[bible-adventure] missing required env vars: " + missing.join(", ") +
    "\nCopy .env.example to .env and fill them in."
  );
  process.exit(1);
}

// ---- database ----
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 8,
});

async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          BIGSERIAL PRIMARY KEY,
        google_sub  TEXT UNIQUE NOT NULL,
        email       TEXT,
        name        TEXT,
        picture     TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_login  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id          TEXT PRIMARY KEY,
        user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
      CREATE TABLE IF NOT EXISTS ai_summaries (
        chapter_id  TEXT PRIMARY KEY,
        summary     TEXT NOT NULL,
        model       TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  } finally {
    client.release();
  }
}

// ---- session helpers ----
const SESSION_COOKIE = "ba_sess";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function sign(value) {
  const mac = crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
  return `${value}.${mac}`;
}
function unsign(signed) {
  if (!signed || typeof signed !== "string") return null;
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const mac   = signed.slice(i + 1);
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function setSessionCookie(res, sessionId) {
  const value = sign(sessionId);
  const attrs = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (NODE_ENV === "production") attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}
function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

async function loadSession(req) {
  const cookies = parseCookies(req);
  const signed = cookies[SESSION_COOKIE];
  if (!signed) return null;
  const sid = unsign(signed);
  if (!sid) return null;
  const { rows } = await pool.query(
    `SELECT s.id, s.expires_at, u.id AS user_id, u.email, u.name, u.picture
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1`,
    [sid]
  );
  if (!rows.length) return null;
  const row = rows[0];
  if (new Date(row.expires_at) < new Date()) {
    await pool.query(`DELETE FROM sessions WHERE id = $1`, [sid]);
    return null;
  }
  return {
    sessionId: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    picture: row.picture,
  };
}

async function requireAuth(req, res, next) {
  try {
    const sess = await loadSession(req);
    if (!sess) {
      // For API requests, return JSON 401; for HTML, redirect to /login.
      if (req.path.startsWith("/api/")) {
        return res.status(401).json({ error: "unauthenticated" });
      }
      return res.redirect("/login");
    }
    req.session = sess;
    next();
  } catch (err) {
    console.error("[auth] session error:", err);
    res.status(500).send("server error");
  }
}

// ---- OAuth state cache (short-lived, in-memory is fine) ----
const oauthStates = new Map(); // state -> { createdAt }
function newOauthState() {
  const s = crypto.randomBytes(24).toString("base64url");
  oauthStates.set(s, { createdAt: Date.now() });
  // sweep
  for (const [k, v] of oauthStates) {
    if (Date.now() - v.createdAt > 10 * 60 * 1000) oauthStates.delete(k);
  }
  return s;
}
function consumeOauthState(s) {
  if (!s || !oauthStates.has(s)) return false;
  oauthStates.delete(s);
  return true;
}

// ---- app ----
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));

// ---- routes: login + OAuth ----
app.get("/login", async (req, res) => {
  // already signed in? bounce home.
  const sess = await loadSession(req).catch(() => null);
  if (sess) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/auth/google", (req, res) => {
  const state = newOauthState();
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect(`/login?error=${encodeURIComponent(String(error))}`);
    if (!code || !state || !consumeOauthState(String(state))) {
      return res.redirect("/login?error=bad_state");
    }
    // exchange code -> tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text().catch(() => "");
      console.error("[oauth] token exchange failed:", tokenRes.status, t);
      return res.redirect("/login?error=token_exchange");
    }
    const tokens = await tokenRes.json();
    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) return res.redirect("/login?error=userinfo");
    const profile = await userRes.json();
    if (!profile.sub) return res.redirect("/login?error=no_sub");

    // upsert user
    const { rows } = await pool.query(
      `INSERT INTO users (google_sub, email, name, picture, last_login)
            VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (google_sub)
       DO UPDATE SET email = EXCLUDED.email,
                     name = EXCLUDED.name,
                     picture = EXCLUDED.picture,
                     last_login = now()
       RETURNING id`,
      [profile.sub, profile.email || null, profile.name || null, profile.picture || null]
    );
    const userId = rows[0].id;

    // create session
    const sid = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
      [sid, userId, expiresAt]
    );
    setSessionCookie(res, sid);
    res.redirect("/");
  } catch (err) {
    console.error("[oauth] callback error:", err);
    res.redirect("/login?error=server");
  }
});

app.post("/auth/logout", async (req, res) => {
  try {
    const sess = await loadSession(req);
    if (sess) {
      await pool.query(`DELETE FROM sessions WHERE id = $1`, [sess.sessionId]);
    }
  } catch (err) {
    console.error("[auth] logout error:", err);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ---- routes: API (auth required) ----
app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    userId: String(req.session.userId),
    email: req.session.email,
    name: req.session.name,
    picture: req.session.picture,
  });
});

const CHAPTER_ID_RE = /^(?:[1-3] )?[A-Za-z]+ \d{1,3}$/;

async function callGroq(messages, opts = {}) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 200,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`groq ${res.status}`);
    err.status = res.status;
    err.body = text.slice(0, 400);
    throw err;
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || "").trim();
}

app.post("/api/ai/summary", requireAuth, async (req, res) => {
  try {
    const { chapterId, book, chapter, theme, overview, notable } = req.body || {};
    if (!chapterId || !CHAPTER_ID_RE.test(String(chapterId))) {
      return res.status(400).json({ error: "bad chapterId" });
    }
    if (!book || !chapter) {
      return res.status(400).json({ error: "missing book/chapter" });
    }

    // shared cache across all users
    const cached = await pool.query(
      `SELECT summary FROM ai_summaries WHERE chapter_id = $1`,
      [chapterId]
    );
    if (cached.rows.length) {
      return res.json({ text: cached.rows[0].summary, cached: true });
    }

    const sys =
      "You write short, honest summaries of Bible chapters for a non-linear reading app. " +
      "Output exactly two sentences, ~40 words total. Plain English. " +
      "Paraphrase rather than quoting verses. Don't take sides on contested theological interpretations. " +
      "No headings, no preface, no closing — just the two sentences.";
    const usrParts = [
      `Chapter: ${book} ${chapter}.`,
      theme || overview ? `Book context: ${[theme, overview].filter(Boolean).join(" ")}` : "",
      notable ? `This chapter is known for: "${notable}".` : "",
      `Write 2 sentences summarizing what happens in ${book} ${chapter}.`,
    ].filter(Boolean);

    const text = await callGroq(
      [
        { role: "system", content: sys },
        { role: "user",   content: usrParts.join("\n") },
      ],
      { maxTokens: 160, temperature: 0.4 }
    );
    const cleaned = text.replace(/^["'`]|["'`]$/g, "").trim();

    await pool.query(
      `INSERT INTO ai_summaries (chapter_id, summary, model)
            VALUES ($1, $2, 'llama-3.1-8b-instant')
       ON CONFLICT (chapter_id) DO NOTHING`,
      [chapterId, cleaned]
    );

    res.json({ text: cleaned, cached: false });
  } catch (err) {
    console.error("[ai/summary]", err.status || "", err.body || err.message);
    res.status(502).json({ error: "ai_failed" });
  }
});

app.post("/api/ai/reflection", requireAuth, async (req, res) => {
  try {
    const { chapterId, book, chapter, category, notable, recent } = req.body || {};
    if (!chapterId || !CHAPTER_ID_RE.test(String(chapterId))) {
      return res.status(400).json({ error: "bad chapterId" });
    }
    if (!book || !chapter) {
      return res.status(400).json({ error: "missing book/chapter" });
    }
    const recentClean = Array.isArray(recent)
      ? recent.filter(s => typeof s === "string" && CHAPTER_ID_RE.test(s)).slice(0, 3)
      : [];

    const sys =
      "You write ONE short reflection question for a reader about to open a Bible chapter. " +
      "Output ONLY the question — no preface, no quotes, no answer, no extra lines. " +
      "Maximum 18 words. Concrete, personal, gentle. Do not quote scripture verbatim.";
    const usrParts = [
      `Chapter to read next: ${book} ${chapter}${category ? ` (${category})` : ""}.`,
      notable ? `Known for: "${notable}".` : "",
      recentClean.length
        ? `Recently read: ${recentClean.join(", ")}. If natural, let the question quietly connect to what they just read.`
        : "This is one of their first chapters in the app.",
      `Write one reflection question for someone about to read ${book} ${chapter}.`,
    ].filter(Boolean);

    const text = await callGroq(
      [
        { role: "system", content: sys },
        { role: "user",   content: usrParts.join("\n") },
      ],
      { maxTokens: 80, temperature: 0.85 }
    );
    let t = text.split(/\n/)[0].trim().replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!/[?]$/.test(t)) t = t.replace(/[.!]+$/, "") + "?";
    res.json({ text: t });
  } catch (err) {
    console.error("[ai/reflection]", err.status || "", err.body || err.message);
    res.status(502).json({ error: "ai_failed" });
  }
});

// ---- routes: static SPA (auth required) ----
// Serve known assets explicitly so we don't expose anything outside /public.
const publicDir = path.join(__dirname, "public");
app.get(["/", "/index.html"], requireAuth, (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});
app.use(
  requireAuth,
  express.static(publicDir, {
    index: false,
    extensions: false,
    fallthrough: true,
  })
);

// ---- 404 ----
app.use((req, res) => {
  res.status(404).send("not found");
});

// ---- start ----
initSchema()
  .then(() => {
    app.listen(Number(PORT), () => {
      console.log(`[bible-adventure] listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("[bible-adventure] failed to init schema:", err);
    process.exit(1);
  });
