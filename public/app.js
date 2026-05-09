(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STORAGE_KEY = "bible-adventure:v1";

  // ---------- state ----------
  const defaultState = {
    readChapters: {},      // id -> ISO date string
    lastChapter: null,     // most recent chapter id read
    startedOn: null,       // first day a chapter was read
    bestStreak: 0,
  };
  let state = loadState();
  let activeCategory = null; // legend filter, null = show all

  // ---------- AI (Groq) ----------
  // BYO-key: the user supplies their own Groq key, stored in localStorage on
  // their machine only. Never embed a key in this file.
  const AI_KEY_STORAGE   = "bible-adventure:groq-key";
  const AI_CACHE_STORAGE = "bible-adventure:ai-cache:v1";
  const AI_MODEL         = "llama-3.1-8b-instant";
  const AI_ENDPOINT      = "https://api.groq.com/openai/v1/chat/completions";

  function getAiKey() { try { return localStorage.getItem(AI_KEY_STORAGE) || ""; } catch { return ""; } }
  function setAiKey(k) {
    try {
      if (k) localStorage.setItem(AI_KEY_STORAGE, k);
      else localStorage.removeItem(AI_KEY_STORAGE);
    } catch {}
  }
  function aiEnabled() { return Boolean(getAiKey()); }

  let aiCache = (() => {
    try { return JSON.parse(localStorage.getItem(AI_CACHE_STORAGE)) || {}; }
    catch { return {}; }
  })();
  function saveAiCache() {
    try { localStorage.setItem(AI_CACHE_STORAGE, JSON.stringify(aiCache)); } catch {}
  }

  const aiInflight = new Map(); // cacheKey -> Promise<string>

  async function aiChat(systemPrompt, userPrompt, opts = {}) {
    const key = getAiKey();
    if (!key) throw new Error("missing-key");
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
        temperature: opts.temperature ?? 0.7,
        max_tokens:  opts.maxTokens   ?? 200,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`groq ${res.status}: ${text.slice(0, 240)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return content.trim();
  }

  function recentReadIds(excludeId, n = 3) {
    return Object.entries(state.readChapters)
      .filter(([id]) => id !== excludeId)
      .sort((a, b) => b[1].localeCompare(a[1]))
      .slice(0, n)
      .map(([id]) => id);
  }

  function aiSummary(ch) {
    const cacheKey = `s:${ch.id}`;
    if (aiCache[cacheKey]) return Promise.resolve(aiCache[cacheKey]);
    if (aiInflight.has(cacheKey)) return aiInflight.get(cacheKey);

    const info = (typeof BOOK_INFO !== "undefined") ? BOOK_INFO[ch.book] : null;
    const sys =
      "You write short, honest summaries of Bible chapters for a non-linear reading app. " +
      "Output exactly two sentences, ~40 words total. Plain English. " +
      "Paraphrase rather than quoting verses. Don't take sides on contested theological interpretations. " +
      "No headings, no preface, no closing — just the two sentences.";
    const usrParts = [
      `Chapter: ${ch.book} ${ch.chapter}.`,
      info ? `Book: ${info.theme} ${info.overview}` : "",
      ch.notable ? `This chapter is known for: "${ch.notable}".` : "",
      `Write 2 sentences summarizing what happens in ${ch.book} ${ch.chapter}.`,
    ].filter(Boolean);

    const p = aiChat(sys, usrParts.join("\n"), { maxTokens: 160, temperature: 0.4 })
      .then(text => {
        const cleaned = text.replace(/^["'`]|["'`]$/g, "").trim();
        aiCache[cacheKey] = cleaned;
        saveAiCache();
        return cleaned;
      })
      .finally(() => aiInflight.delete(cacheKey));
    aiInflight.set(cacheKey, p);
    return p;
  }

  function aiReflection(ch) {
    const cacheKey = `r:${ch.id}`;
    if (aiCache[cacheKey]) return Promise.resolve(aiCache[cacheKey]);
    if (aiInflight.has(cacheKey)) return aiInflight.get(cacheKey);

    const recent = recentReadIds(ch.id, 3);
    const cat = CATEGORIES[ch.category]?.label || ch.category;
    const sys =
      "You write ONE short reflection question for a reader about to open a Bible chapter. " +
      "Output ONLY the question — no preface, no quotes, no answer, no extra lines. " +
      "Maximum 18 words. Concrete, personal, gentle. Do not quote scripture verbatim.";
    const usrParts = [
      `Chapter to read next: ${ch.book} ${ch.chapter} (${cat}).`,
      ch.notable ? `Known for: "${ch.notable}".` : "",
      recent.length
        ? `Recently read: ${recent.join(", ")}. If natural, let the question quietly connect to what they just read.`
        : "This is one of their first chapters in the app.",
      `Write one reflection question for someone about to read ${ch.book} ${ch.chapter}.`,
    ].filter(Boolean);

    const p = aiChat(sys, usrParts.join("\n"), { maxTokens: 80, temperature: 0.85 })
      .then(text => {
        let t = text.split(/\n/)[0].trim();
        t = t.replace(/^["'`]+|["'`]+$/g, "").trim();
        if (!/[?]$/.test(t)) t = t.replace(/[.!]+$/, "") + "?";
        aiCache[cacheKey] = t;
        saveAiCache();
        return t;
      })
      .finally(() => aiInflight.delete(cacheKey));
    aiInflight.set(cacheKey, p);
    return p;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultState };
      return { ...defaultState, ...JSON.parse(raw) };
    } catch (e) {
      return { ...defaultState };
    }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(aISO, bISO) {
    const a = new Date(aISO + "T00:00:00");
    const b = new Date(bISO + "T00:00:00");
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  }

  function chapterIsRead(id) { return Boolean(state.readChapters[id]); }
  function readCount() { return Object.keys(state.readChapters).length; }
  function uniqueReadDays() {
    const set = new Set(Object.values(state.readChapters));
    return set.size;
  }
  function totalDaysSinceStart() {
    if (!state.startedOn) return 0;
    return Math.max(1, daysBetween(state.startedOn, todayISO()) + 1);
  }
  function currentStreak() {
    const days = new Set(Object.values(state.readChapters));
    if (days.size === 0) return 0;
    let streak = 0;
    let cursor = todayISO();
    if (!days.has(cursor)) {
      // allow yesterday so the streak doesn't break mid-day
      const y = new Date();
      y.setDate(y.getDate() - 1);
      cursor = y.toISOString().slice(0, 10);
      if (!days.has(cursor)) return 0;
    }
    while (days.has(cursor)) {
      streak++;
      const d = new Date(cursor + "T00:00:00");
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    }
    return streak;
  }

  // ---------- graph layout ----------
  // We arrange every chapter as a dot in a "starfield" — books are clustered
  // in canonical order along a soft S-curve, with chapter dots fanning out
  // around their book center. This gives a non-linear feel while still
  // grouping related chapters near each other.
  const VIEW_W = 1200;
  const VIEW_H = 560;

  function layoutNodes() {
    const positions = {};
    const bookCenters = {};

    const totalBooks = BOOKS.length;
    const padX = 80;
    const padY = 70;

    BOOKS.forEach((book, bi) => {
      const t = bi / (totalBooks - 1); // 0..1
      // S-curve along x
      const cx = padX + t * (VIEW_W - 2 * padX);
      const wave = Math.sin(t * Math.PI * 2.4) * 0.55
                 + Math.sin(t * Math.PI * 5.1) * 0.18;
      const cy = VIEW_H / 2 + wave * (VIEW_H / 2 - padY);
      bookCenters[bi] = { x: cx, y: cy, name: book.name };

      // chapter dots cluster around the book center
      const radius = 12 + Math.sqrt(book.chapters) * 5.6;
      for (let c = 1; c <= book.chapters; c++) {
        // deterministic-but-scattered: hash via book/chapter
        const seed = (bi * 131 + c * 17) % 360;
        const ang = (seed * Math.PI) / 180;
        const r = radius * (0.45 + ((c * 37 + bi * 13) % 100) / 130);
        const jx = Math.cos(ang) * r;
        const jy = Math.sin(ang) * r * 0.8;
        positions[`${book.abbr} ${c}`] = {
          x: cx + jx,
          y: cy + jy,
        };
      }
    });

    return { positions, bookCenters };
  }
  const LAYOUT = layoutNodes();

  // ---------- recommendations ----------
  function pickRecommendations(currentId) {
    const current = currentId ? CHAPTER_BY_ID[currentId] : null;
    const recs = [];
    const seen = new Set();
    const add = (id, reason) => {
      if (!id || seen.has(id) || chapterIsRead(id)) return;
      const ch = CHAPTER_BY_ID[id];
      if (!ch) return;
      seen.add(id);
      recs.push({ chapter: ch, reason });
    };

    // 1. continue current book if there's a next unread chapter
    if (current) {
      for (let c = current.chapter + 1; c <= BOOKS[current.bookIndex].chapters; c++) {
        const nextId = `${current.bookAbbr} ${c}`;
        if (!chapterIsRead(nextId)) { add(nextId, "continue " + current.book); break; }
      }
    }

    // 2. one notable chapter from each *other* category
    const targetCats = ["gospel", "law", "wisdom", "prophecy", "epistle", "poetry", "revelation", "history"];
    const currentCat = current?.category;
    for (const cat of targetCats) {
      if (recs.length >= 6) break;
      if (cat === currentCat) continue;
      const candidate = pickFromCategory(cat, seen);
      if (candidate) add(candidate.id, prettyCatReason(cat));
    }

    // 3. fill any remaining slots with random unread notable chapters
    if (recs.length < 6) {
      const notables = ALL_CHAPTERS.filter(c => c.notable && !chapterIsRead(c.id) && !seen.has(c.id));
      shuffle(notables);
      for (const n of notables) {
        if (recs.length >= 6) break;
        add(n.id, prettyCatReason(n.category));
      }
    }

    // 4. fall-back: any unread chapter
    if (recs.length < 6) {
      const remaining = ALL_CHAPTERS.filter(c => !chapterIsRead(c.id) && !seen.has(c.id));
      shuffle(remaining);
      for (const r of remaining) {
        if (recs.length >= 6) break;
        add(r.id, prettyCatReason(r.category));
      }
    }

    return recs.slice(0, 6);
  }

  function pickFromCategory(cat, exclude) {
    // prefer notable, unread; else any unread in category
    const notables = ALL_CHAPTERS.filter(c =>
      c.category === cat && c.notable && !chapterIsRead(c.id) && !exclude.has(c.id));
    if (notables.length) return notables[Math.floor(Math.random() * notables.length)];
    const any = ALL_CHAPTERS.filter(c =>
      c.category === cat && !chapterIsRead(c.id) && !exclude.has(c.id));
    if (any.length) return any[Math.floor(Math.random() * any.length)];
    return null;
  }

  function prettyCatReason(cat) {
    const labels = {
      law: "law", history: "history", wisdom: "wisdom", poetry: "poetry",
      prophecy: "prophecy", gospel: "gospel", epistle: "epistle", revelation: "revelation",
    };
    return labels[cat] || "explore";
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- rendering: graph ----------
  const graphEl = document.getElementById("graph");
  const tooltipEl = document.getElementById("graph-tooltip");

  function showTooltip(ch, e) {
    if (!tooltipEl) return;
    const cat = CATEGORIES[ch.category];
    const isRead = chapterIsRead(ch.id);
    tooltipEl.innerHTML = `
      <div class="tt-row">
        <span class="cat-dot" style="background:${cat.color}"></span>
        <strong>${ch.book} ${ch.chapter}</strong>
        <span class="tt-cat">${cat.label}</span>
      </div>
      ${ch.notable ? `<div class="tt-note">${ch.notable}</div>` : ""}
      <div class="tt-status">${isRead ? "✓ read" : "click to read"}</div>
    `;
    tooltipEl.hidden = false;
    moveTooltip(e);
  }
  function moveTooltip(e) {
    if (!tooltipEl || tooltipEl.hidden) return;
    const wrap = tooltipEl.parentElement.getBoundingClientRect();
    const x = e.clientX - wrap.left + 14;
    const y = e.clientY - wrap.top + 14;
    // keep tooltip within wrap bounds
    const maxX = wrap.width - tooltipEl.offsetWidth - 8;
    const maxY = wrap.height - tooltipEl.offsetHeight - 8;
    tooltipEl.style.left = Math.min(x, maxX) + "px";
    tooltipEl.style.top  = Math.min(y, maxY) + "px";
  }
  function hideTooltip() {
    if (tooltipEl) tooltipEl.hidden = true;
  }

  function renderGraph(recs) {
    graphEl.innerHTML = "";

    // links from current to recommendations
    const current = state.lastChapter ? CHAPTER_BY_ID[state.lastChapter] : null;
    if (current && recs.length) {
      const cp = LAYOUT.positions[current.id];
      recs.forEach(r => {
        const rp = LAYOUT.positions[r.chapter.id];
        const midX = (cp.x + rp.x) / 2;
        const midY = (cp.y + rp.y) / 2 - 30;
        const path = el("path", {
          d: `M ${cp.x} ${cp.y} Q ${midX} ${midY} ${rp.x} ${rp.y}`,
          class: "link",
        });
        if (activeCategory && r.chapter.category !== activeCategory && current.category !== activeCategory) {
          path.style.opacity = "0.08";
        }
        graphEl.appendChild(path);
      });
    }

    // chapter dots
    const recIds = new Set(recs.map(r => r.chapter.id));
    ALL_CHAPTERS.forEach(ch => {
      const p = LAYOUT.positions[ch.id];
      const isCurrent = current && current.id === ch.id;
      const isRead = chapterIsRead(ch.id);
      const isSuggested = recIds.has(ch.id);
      const isMatch = !activeCategory || ch.category === activeCategory;
      const color = CATEGORIES[ch.category].color;

      const baseR = isCurrent ? 9 : isSuggested ? 7 : isRead ? 5.5 : 4;
      const r = activeCategory
        ? (isMatch ? Math.max(baseR, 5.5) : 2.5)
        : baseR;
      let cls = "node node-base";
      if (isRead) cls = "node node-read";
      if (isSuggested) cls = "node node-suggested";
      if (isCurrent) cls = "node node-current";
      if (activeCategory) cls += isMatch ? " node-match" : " node-fade";

      // suggested ring (skip when filtered out so the highlight stays clean)
      if (isSuggested && isMatch) {
        const ring = el("circle", {
          cx: p.x, cy: p.y, r: 12,
          class: "node-suggested-ring",
        });
        graphEl.appendChild(ring);
      }

      const styleParts = [];
      if (isCurrent) styleParts.push(`color:${color}`);
      if (activeCategory && !isMatch) styleParts.push("opacity:0.1");
      const node = el("circle", {
        cx: p.x, cy: p.y, r,
        class: cls,
        "data-id": ch.id,
        fill: isRead || isCurrent ? color : (activeCategory && isMatch ? color : "#2a3658"),
        style: styleParts.join(";"),
      });
      node.addEventListener("click", () => openReader(ch.id));
      graphEl.appendChild(node);

      // generous transparent hit area on top so the click target is forgiving
      const hit = el("circle", {
        cx: p.x, cy: p.y, r: 11,
        fill: "transparent",
        class: "node-hit",
        "data-id": ch.id,
      });
      hit.addEventListener("click", () => openReader(ch.id));
      hit.addEventListener("mouseenter", e => showTooltip(ch, e));
      hit.addEventListener("mousemove", moveTooltip);
      hit.addEventListener("mouseleave", hideTooltip);
      // native title fallback for accessibility
      const title = el("title", {});
      title.textContent = ch.notable ? `${ch.id} — ${ch.notable}` : ch.id;
      hit.appendChild(title);
      graphEl.appendChild(hit);
    });

    // book abbreviation labels — horizontal text placed in lanes outside each
    // cluster envelope. Greedy lane assignment in canonical order: try the
    // lane closest to the cluster first, fall back outward only when the
    // previous label in that lane horizontally overlaps the current one.
    const LABEL_FONT_PX = 8.5;
    const LABEL_CHAR_W = 5.4;   // approximate per-char width at 8.5px monospace + tracking
    const LABEL_PAD = 5;        // horizontal gap required between labels in a lane
    const LANE_STEP = 11;       // vertical distance between lanes
    const MAX_LANES = 4;
    // lanes record the rightmost x consumed in that lane, separately above & below
    const aboveLanes = [];      // index = lane number (0 closest to cluster)
    const belowLanes = [];

    BOOKS.forEach((book, bi) => {
      const center = LAYOUT.bookCenters[bi];
      const clusterR = 12 + Math.sqrt(book.chapters) * 5.6;
      const above = center.y < VIEW_H / 2;
      const lanes = above ? aboveLanes : belowLanes;

      const text = book.abbr.toUpperCase();
      const estWidth = text.length * LABEL_CHAR_W + LABEL_PAD;
      const left  = center.x - estWidth / 2;
      const right = center.x + estWidth / 2;

      // pick the lowest lane whose previous occupant ends before this label starts
      let lane = 0;
      while (lane < MAX_LANES && lanes[lane] != null && left < lanes[lane]) lane++;
      if (lane >= MAX_LANES) {
        // no room within the allowed lanes — drop it; tooltip still surfaces it on hover
        return;
      }
      lanes[lane] = right;

      const offset = clusterR + 6 + lane * LANE_STEP;
      const ly = above
        ? center.y - offset
        : center.y + offset + LABEL_FONT_PX; // below: offset is to glyph top, add font height for baseline

      const lab = el("text", {
        x: center.x, y: ly,
        "text-anchor": "middle",
        class: "book-label",
        "data-book": book.abbr,
      });
      lab.textContent = text;
      if (activeCategory && book.category !== activeCategory) {
        lab.style.opacity = "0.18";
      }
      const t = el("title", {});
      t.textContent = book.name;
      lab.appendChild(t);
      lab.addEventListener("click", () => {
        for (let c = 1; c <= book.chapters; c++) {
          const id = `${book.abbr} ${c}`;
          if (!chapterIsRead(id)) { openReader(id); return; }
        }
        openReader(`${book.abbr} 1`);
      });
      graphEl.appendChild(lab);
    });

    // labels for suggestions and current — alternate above/below so dense
    // clusters don't stack labels on top of each other, push past the ring.
    if (current) {
      const cp = LAYOUT.positions[current.id];
      const lab = el("text", {
        x: cp.x, y: cp.y + 28,
        "text-anchor": "middle",
        class: "current-label",
      });
      lab.textContent = current.id;
      graphEl.appendChild(lab);
    }
    recs.forEach((r, i) => {
      const p = LAYOUT.positions[r.chapter.id];
      // alternate above (even i) / below (odd i) to reduce overlap
      const above = (i % 2 === 0);
      const dy = above ? -20 : 26;
      const lab = el("text", {
        x: p.x, y: p.y + dy,
        "text-anchor": "middle",
        class: "node-label",
      });
      lab.textContent = r.chapter.id;
      if (activeCategory && r.chapter.category !== activeCategory) {
        lab.style.opacity = "0.15";
      }
      graphEl.appendChild(lab);
    });
  }

  function el(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v != null && v !== "") node.setAttribute(k, v);
    }
    return node;
  }

  // ---------- rendering: panels ----------
  function renderHero() {
    const eyebrow = document.getElementById("finished-eyebrow");
    const title = document.getElementById("finished-title");
    const sub = document.getElementById("finished-sub");

    if (!state.lastChapter) {
      eyebrow.textContent = "BEGIN HERE";
      title.innerHTML = `Where will you <span class="accent">start?</span>`;
      sub.textContent = "Pick any chapter — there's no wrong order.";
      return;
    }
    const ch = CHAPTER_BY_ID[state.lastChapter];
    eyebrow.textContent = "YOU JUST FINISHED";
    const note = ch.notable ? `, <span class="accent">${ch.notable}</span>` : "";
    title.innerHTML = `${ch.book} ${ch.chapter}${note}`;

    // Pace messaging
    const total = totalDaysSinceStart();
    const read = readCount();
    const ahead = read - total; // 1 chapter/day pace
    let line;
    if (read < 5) {
      line = "You're getting started. One chapter at a time.";
    } else if (ahead >= 5) {
      line = `${ahead} chapters ahead of a chapter-a-day pace. Keep going.`;
    } else if (ahead <= -5) {
      line = `${Math.abs(ahead)} chapters behind a chapter-a-day pace. Worth reading one more today?`;
    } else {
      line = "Right on pace for a chapter a day.";
    }
    sub.textContent = line;
  }

  function renderStats() {
    document.getElementById("streak-days").textContent = currentStreak();
    document.getElementById("score-pill").textContent = readCount();
    document.getElementById("stat-days").textContent = uniqueReadDays();
    document.getElementById("stat-days-total").textContent = totalDaysSinceStart();
    document.getElementById("stat-chapters").textContent = readCount().toLocaleString();
    const pct = (readCount() / TOTAL_CHAPTERS) * 100;
    document.getElementById("stat-percent").textContent = pct < 1 && pct > 0
      ? pct.toFixed(1)
      : Math.round(pct);
    document.getElementById("stat-best").textContent = state.bestStreak;
  }

  function renderSuggestions(recs) {
    const wrap = document.getElementById("suggestions");
    wrap.innerHTML = "";
    if (!recs.length) {
      const done = document.createElement("div");
      done.className = "sugg-tag";
      done.style.padding = "16px 12px";
      done.textContent = "you've read everything. well done.";
      wrap.appendChild(done);
      return;
    }
    recs.forEach(r => {
      const ch = r.chapter;
      const div = document.createElement("div");
      div.className = "sugg";
      div.innerHTML = `
        <div class="sugg-id">
          <span class="cat-dot" style="background:${CATEGORIES[ch.category].color}"></span>
          ${ch.id}
        </div>
        ${ch.notable ? `<div class="sugg-note">${ch.notable}</div>` : ""}
        <div class="sugg-tag">${r.reason}</div>
      `;
      div.addEventListener("click", () => openReader(ch.id));
      wrap.appendChild(div);
    });
  }

  function renderLegend() {
    const wrap = document.getElementById("legend");
    wrap.innerHTML = "";
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const isActive = activeCategory === key;
      const btn = document.createElement("button");
      btn.className = "legend-item" + (isActive ? " active" : "");
      btn.dataset.cat = key;
      btn.title = isActive
        ? `clear ${cat.label} filter`
        : `show only ${cat.label}`;
      btn.innerHTML = `
        <span class="legend-dot" style="background:${cat.color}"></span>
        <span class="legend-label">${cat.label}</span>
        <span class="legend-x" aria-hidden="true">×</span>
      `;
      btn.addEventListener("click", () => {
        activeCategory = isActive ? null : key;
        renderAll();
      });
      wrap.appendChild(btn);
    });
  }

  function renderProgressView() {
    const wrap = document.getElementById("books");
    wrap.innerHTML = "";
    BOOKS.forEach((book, bi) => {
      const card = document.createElement("div");
      card.className = "book-card";
      const cat = CATEGORIES[book.category];
      const readInBook = countReadInBook(book);
      card.innerHTML = `
        <div class="book-name">
          <strong>${book.name}</strong>
          <span class="book-cat">
            <span class="cat-dot" style="background:${cat.color}"></span>${cat.label}
          </span>
        </div>
        <div class="chapter-grid"></div>
        <div class="book-progress"><div class="book-progress-fill" style="width:${(readInBook / book.chapters) * 100}%"></div></div>
      `;
      const grid = card.querySelector(".chapter-grid");
      for (let c = 1; c <= book.chapters; c++) {
        const id = `${book.abbr} ${c}`;
        const chip = document.createElement("button");
        chip.className = "chap" + (chapterIsRead(id) ? " read" : "");
        chip.textContent = c;
        chip.title = id + (CHAPTER_BY_ID[id].notable ? ` — ${CHAPTER_BY_ID[id].notable}` : "");
        chip.addEventListener("click", () => openReader(id));
        grid.appendChild(chip);
      }
      wrap.appendChild(card);
    });
  }

  function countReadInBook(book) {
    let n = 0;
    for (let c = 1; c <= book.chapters; c++) {
      if (chapterIsRead(`${book.abbr} ${c}`)) n++;
    }
    return n;
  }

  // ---------- reader modal ----------
  let openChapterId = null;
  const modal = document.getElementById("reader");

  function openReader(id) {
    const ch = CHAPTER_BY_ID[id];
    if (!ch) return;
    openChapterId = id;
    const cat = CATEGORIES[ch.category];
    document.getElementById("reader-cat").innerHTML =
      `<span class="cat-dot" style="background:${cat.color}"></span>${cat.label} · ${ch.testament}`;
    document.getElementById("reader-title").textContent = `${ch.book} ${ch.chapter}`;
    const sub = document.getElementById("reader-sub");
    sub.textContent = ch.notable ? `“${ch.notable}”` : "";

    const body = document.getElementById("reader-body");
    body.innerHTML = readerBody(ch);

    // Wire cross-reference chips inside the freshly rendered body
    body.querySelectorAll("[data-xref]").forEach(btn => {
      btn.addEventListener("click", () => openReader(btn.dataset.xref));
    });

    // Read-online link (BibleGateway, ESV by default)
    const onlineLink = document.getElementById("reader-online");
    onlineLink.href = bibleGatewayUrl(ch);

    const markBtn = document.getElementById("reader-mark");
    if (chapterIsRead(id)) {
      markBtn.textContent = "mark unread";
    } else {
      markBtn.textContent = "mark as read";
    }
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    // ---- Async AI fills ----
    // Only mutate the modal if the user is still on this same chapter when
    // the request resolves; otherwise drop the result silently.
    if (aiEnabled()) {
      const requestedId = id;

      const summarySlot = body.querySelector("[data-ai-summary] .reader-summary");
      if (summarySlot) {
        aiSummary(ch).then(text => {
          if (openChapterId !== requestedId) return;
          summarySlot.classList.remove("ai-loading");
          summarySlot.textContent = text;
        }).catch(err => {
          if (openChapterId !== requestedId) return;
          summarySlot.classList.remove("ai-loading");
          summarySlot.classList.add("ai-error");
          summarySlot.textContent = aiFriendlyError(err);
        });
      }

      const reflectSlot = body.querySelector("[data-ai-reflect] .reflect-prompt");
      if (reflectSlot) {
        aiReflection(ch).then(text => {
          if (openChapterId !== requestedId) return;
          reflectSlot.classList.remove("ai-loading");
          reflectSlot.textContent = text;
        }).catch(err => {
          if (openChapterId !== requestedId) return;
          reflectSlot.classList.remove("ai-loading");
          reflectSlot.classList.add("ai-error");
          // graceful fallback: show the static prompt instead of an error
          const fallback = (typeof pickReflection === "function")
            ? pickReflection(ch.id, ch.category) : null;
          reflectSlot.textContent = fallback || aiFriendlyError(err);
        });
      }
    }
  }

  function aiFriendlyError(err) {
    const msg = String(err?.message || err);
    if (msg.includes("401") || msg.includes("invalid_api_key")) return "AI key was rejected — open AI settings to fix.";
    if (msg.includes("429")) return "AI rate limit hit — try again in a moment.";
    if (msg.includes("missing-key")) return "Add a Groq key in AI settings to use this.";
    return "AI request failed. Check connection or AI settings.";
  }

  function bibleGatewayUrl(ch) {
    const search = encodeURIComponent(`${ch.book} ${ch.chapter}`);
    return `https://www.biblegateway.com/passage/?search=${search}&version=ESV`;
  }

  function readerBody(ch) {
    const detail = (typeof CHAPTER_DETAIL !== "undefined") ? CHAPTER_DETAIL[ch.id] : null;
    const info = (typeof BOOK_INFO !== "undefined") ? BOOK_INFO[ch.book] : null;
    const cat = CATEGORIES[ch.category];
    const minutes = (typeof readingMinutes === "function") ? readingMinutes(ch.book) : 4;
    const reflection = (typeof pickReflection === "function") ? pickReflection(ch.id, ch.category) : null;
    const totalChapters = BOOKS[ch.bookIndex].chapters;

    // ---- Book-context strip ----
    const bookStrip = info ? `
      <div class="book-strip" style="--accent:${cat.color}">
        <div class="book-strip-row">
          <div class="book-strip-name">${ch.book}</div>
          <div class="book-strip-pos">chapter ${ch.chapter} of ${totalChapters} · ~${minutes} min read</div>
        </div>
        <div class="book-strip-meta">${info.author} · ${info.era}</div>
        <div class="book-strip-overview">${info.overview}</div>
      </div>
    ` : `
      <div class="book-strip" style="--accent:${cat.color}">
        <div class="book-strip-row">
          <div class="book-strip-name">${ch.book}</div>
          <div class="book-strip-pos">chapter ${ch.chapter} of ${totalChapters} · ~${minutes} min read</div>
        </div>
      </div>
    `;

    // ---- In this chapter ----
    let summaryBlock = "";
    if (detail && detail.summary) {
      summaryBlock = `
        <section class="reader-section">
          <div class="reader-label">In this chapter</div>
          <p class="reader-summary">${detail.summary}</p>
        </section>
      `;
    } else if (aiEnabled()) {
      summaryBlock = `
        <section class="reader-section" data-ai-summary>
          <div class="reader-label">In this chapter <span class="ai-tag" title="AI-generated, llama-3.1-8b-instant">AI</span></div>
          <p class="reader-summary ai-loading">generating…</p>
        </section>
      `;
    }

    // ---- Verses to watch for ----
    let versesBlock = "";
    if (detail && detail.verses && detail.verses.length) {
      const items = detail.verses.map(v => `
        <li>
          <span class="verse-ref">${ch.book} ${ch.chapter}:${v.ref.replace(/^\d+:/, "")}</span>
          <span class="verse-text">${v.text}</span>
        </li>
      `).join("");
      versesBlock = `
        <section class="reader-section">
          <div class="reader-label">Verses to watch for</div>
          <ul class="verse-list">${items}</ul>
        </section>
      `;
    }

    // ---- Cross-references ----
    let xrefBlock = "";
    if (detail && detail.crossRefs && detail.crossRefs.length) {
      const chips = detail.crossRefs
        .filter(r => CHAPTER_BY_ID[r])
        .map(r => {
          const xc = CHAPTER_BY_ID[r];
          const xcat = CATEGORIES[xc.category];
          return `<button class="xref-chip" data-xref="${r}">
            <span class="cat-dot" style="background:${xcat.color}"></span>${r}
          </button>`;
        }).join("");
      if (chips) {
        xrefBlock = `
          <section class="reader-section">
            <div class="reader-label">If this stirs you, try</div>
            <div class="xref-list">${chips}</div>
          </section>
        `;
      }
    }

    // ---- Reflection prompt ----
    const aiOn = aiEnabled();
    const reflectBlock = (reflection || aiOn) ? `
      <section class="reflect" data-ai-reflect>
        <div class="reflect-label">While you read${aiOn ? ' <span class="ai-tag" title="AI-generated, personalized to your recent reading">AI</span>' : ""}</div>
        <div class="reflect-prompt${aiOn ? " ai-loading" : ""}">${aiOn ? "thinking of a question for you…" : reflection}</div>
      </section>
    ` : "";

    // ---- Closing nudge (only if no rich detail, to avoid being chatty) ----
    const closing = detail
      ? `<p class="muted small reader-foot-note">Read it slowly — out loud, if you can. Mark it read when you're done.</p>`
      : `<p class="muted small reader-foot-note">No notes for this one — just open it and read. Mark it read when you're done.</p>`;

    return bookStrip + summaryBlock + versesBlock + xrefBlock + reflectBlock + closing;
  }

  function closeReader() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    openChapterId = null;
  }

  function toggleRead() {
    if (!openChapterId) return;
    if (chapterIsRead(openChapterId)) {
      delete state.readChapters[openChapterId];
      // if it was the last chapter, find new most-recent
      if (state.lastChapter === openChapterId) {
        state.lastChapter = mostRecentRead();
      }
    } else {
      state.readChapters[openChapterId] = todayISO();
      state.lastChapter = openChapterId;
      if (!state.startedOn) state.startedOn = todayISO();
    }
    state.bestStreak = Math.max(state.bestStreak, currentStreak());
    saveState();
    closeReader();
    renderAll();
  }

  function mostRecentRead() {
    let best = null;
    let bestDate = "";
    for (const [id, dt] of Object.entries(state.readChapters)) {
      if (dt >= bestDate) { bestDate = dt; best = id; }
    }
    return best;
  }

  // ---------- search ----------
  const searchOverlay = document.getElementById("search-overlay");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  let searchActiveIndex = 0;

  function openSearch() {
    searchOverlay.classList.add("open");
    searchOverlay.setAttribute("aria-hidden", "false");
    searchInput.value = "";
    renderSearchResults("");
    setTimeout(() => searchInput.focus(), 0);
  }
  function closeSearch() {
    searchOverlay.classList.remove("open");
    searchOverlay.setAttribute("aria-hidden", "true");
    searchInput.blur();
  }

  function searchChapters(rawQuery) {
    const q = rawQuery.trim().toLowerCase();
    if (!q) {
      // default: a sampler of notable chapters across categories
      const out = [];
      const seenCat = new Set();
      for (const c of ALL_CHAPTERS) {
        if (!c.notable) continue;
        if (seenCat.has(c.category)) continue;
        seenCat.add(c.category);
        out.push({ chapter: c, hint: c.notable, score: 0 });
        if (out.length >= 8) break;
      }
      return out;
    }

    const results = [];
    const pushed = new Set();
    const push = (chapter, hint, score) => {
      if (pushed.has(chapter.id)) return;
      pushed.add(chapter.id);
      results.push({ chapter, hint, score });
    };

    // Exact id match (e.g. "ps 23", "1 cor 13")
    for (const c of ALL_CHAPTERS) {
      if (c.id.toLowerCase() === q) push(c, c.notable || "exact match", 1000);
    }
    // Id prefix (e.g. "john" → "John 1", "John 2"…)
    for (const c of ALL_CHAPTERS) {
      const idLow = c.id.toLowerCase();
      const bookLow = c.book.toLowerCase();
      if (idLow.startsWith(q) || bookLow.startsWith(q)) {
        push(c, c.notable || c.book, 500 - c.chapter);
      }
      if (results.length >= 60) break;
    }
    // Notable phrase / book / category contains
    for (const c of ALL_CHAPTERS) {
      const hay = `${c.id} ${c.book} ${c.notable || ""} ${CATEGORIES[c.category].label}`.toLowerCase();
      if (hay.includes(q)) {
        let score = 100;
        if (c.notable && c.notable.toLowerCase().includes(q)) score += 200;
        push(c, c.notable || c.book, score);
      }
      if (results.length >= 80) break;
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 14);
  }

  function renderSearchResults(query) {
    const results = searchChapters(query);
    searchActiveIndex = 0;
    searchResults.innerHTML = "";
    if (!results.length) {
      const empty = document.createElement("div");
      empty.className = "search-empty";
      empty.textContent = `no chapters match “${query}”`;
      searchResults.appendChild(empty);
      return;
    }
    results.forEach((r, idx) => {
      const ch = r.chapter;
      const cat = CATEGORIES[ch.category];
      const isRead = chapterIsRead(ch.id);
      const btn = document.createElement("button");
      btn.className = "search-result" + (idx === 0 ? " active" : "");
      btn.dataset.id = ch.id;
      btn.innerHTML = `
        <span class="cat-dot" style="background:${cat.color}"></span>
        <span class="search-result-id">${ch.id}</span>
        <span class="search-result-hint">${r.hint || ch.book}</span>
        <span class="search-result-cat">${cat.label}</span>
        <span class="search-result-status">${isRead ? "✓" : ""}</span>
      `;
      btn.addEventListener("click", () => {
        closeSearch();
        openReader(ch.id);
      });
      btn.addEventListener("mouseenter", () => setSearchActive(idx));
      searchResults.appendChild(btn);
    });
  }

  function setSearchActive(idx) {
    const items = searchResults.querySelectorAll(".search-result");
    if (!items.length) return;
    searchActiveIndex = (idx + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle("active", i === searchActiveIndex));
    items[searchActiveIndex].scrollIntoView({ block: "nearest" });
  }

  searchInput.addEventListener("input", e => renderSearchResults(e.target.value));
  searchInput.addEventListener("keydown", e => {
    const items = searchResults.querySelectorAll(".search-result");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchActive(searchActiveIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchActive(searchActiveIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const active = items[searchActiveIndex];
      if (active) active.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    }
  });
  document.getElementById("search-btn").addEventListener("click", openSearch);
  searchOverlay.querySelectorAll("[data-search-close]").forEach(b =>
    b.addEventListener("click", closeSearch)
  );
  document.addEventListener("keydown", e => {
    const tag = document.activeElement?.tagName;
    const inField = tag === "INPUT" || tag === "TEXTAREA";
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (searchOverlay.classList.contains("open")) closeSearch();
      else openSearch();
    } else if (e.key === "/" && !inField && !searchOverlay.classList.contains("open")) {
      e.preventDefault();
      openSearch();
    }
  });

  // ---------- view switching ----------
  function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = document.querySelector(`.view[data-view="${name}"]`);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav-link").forEach(a => {
      a.classList.toggle("active", a.dataset.view === name);
    });
    if (name === "progress") renderProgressView();
  }

  // ---------- master render ----------
  function renderAll() {
    const recs = pickRecommendations(state.lastChapter);
    renderHero();
    renderStats();
    renderLegend();
    renderGraph(recs);
    renderSuggestions(recs);
    if (document.querySelector('.view[data-view="progress"].active')) {
      renderProgressView();
    }
  }

  // ---------- wiring ----------
  document.querySelectorAll(".nav-link").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      showView(a.dataset.view);
    });
  });
  modal.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeReader));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeReader();
  });
  document.getElementById("reader-mark").addEventListener("click", toggleRead);
  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!confirm("Erase all reading progress? This cannot be undone.")) return;
    state = { ...defaultState };
    saveState();
    renderAll();
  });

  // ---------- AI settings popover ----------
  const aiBtn      = document.getElementById("ai-btn");
  const aiPop      = document.getElementById("ai-pop");
  const aiKeyInput = document.getElementById("ai-key-input");
  const aiSave     = document.getElementById("ai-save");
  const aiForget   = document.getElementById("ai-forget");
  const aiPopClose = document.getElementById("ai-pop-close");
  const aiStatus   = document.getElementById("ai-pop-status");
  const aiDot      = document.getElementById("ai-dot");

  function refreshAiButton() {
    const on = aiEnabled();
    aiBtn.classList.toggle("on", on);
    aiBtn.title = on ? "AI features on (click to manage)" : "AI features off — click to add a Groq key";
    aiDot.classList.toggle("on", on);
    aiForget.hidden = !on;
  }

  function openAiPop() {
    aiKeyInput.value = "";
    aiKeyInput.placeholder = aiEnabled() ? "key saved — paste a new one to replace" : "gsk_…";
    aiStatus.textContent = "";
    aiStatus.className = "ai-pop-status";
    aiPop.hidden = false;
    aiBtn.setAttribute("aria-expanded", "true");
    setTimeout(() => aiKeyInput.focus(), 0);
  }
  function closeAiPop() {
    aiPop.hidden = true;
    aiBtn.setAttribute("aria-expanded", "false");
  }
  aiBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (aiPop.hidden) openAiPop(); else closeAiPop();
  });
  aiPopClose.addEventListener("click", closeAiPop);
  aiPop.addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", e => {
    if (!aiPop.hidden && !aiPop.contains(e.target) && e.target !== aiBtn) closeAiPop();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !aiPop.hidden) closeAiPop();
  });

  aiSave.addEventListener("click", async () => {
    const key = aiKeyInput.value.trim();
    if (!key) {
      aiStatus.textContent = "paste a key first";
      aiStatus.className = "ai-pop-status err";
      return;
    }
    aiStatus.textContent = "checking key…";
    aiStatus.className = "ai-pop-status";
    // try a tiny request to validate
    setAiKey(key);
    try {
      await aiChat(
        "Reply with the single word: ok.",
        "ping",
        { maxTokens: 4, temperature: 0 }
      );
      aiStatus.textContent = "key saved — AI features are on.";
      aiStatus.className = "ai-pop-status ok";
      refreshAiButton();
      setTimeout(closeAiPop, 800);
    } catch (err) {
      setAiKey(""); // don't keep a bad key
      aiStatus.textContent = aiFriendlyError(err);
      aiStatus.className = "ai-pop-status err";
      refreshAiButton();
    }
  });
  aiForget.addEventListener("click", () => {
    setAiKey("");
    aiStatus.textContent = "key removed.";
    aiStatus.className = "ai-pop-status";
    refreshAiButton();
  });

  refreshAiButton();

  renderAll();
})();
