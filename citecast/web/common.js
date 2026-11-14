/* Shared by index.html (annotator) and admin.html: episode labels, clip parsing, CSV export, toasts and
   the sign-in screens. Loaded as a plain script before store.js and the page script.

   Episodes and their one-minute clips come from Firestore (collections "episodes" and "clips").
   EPISODES caches the episode records this page has loaded, keyed by episode id. */
const EPISODES = new Map();

const FIELDS = ["is_web_ref","start","end","source","type","web_reference","is_social","social_platform","notes"];
const CSV_COLS = ["annotator","episode_id","minute","clip_id",...FIELDS,"bbox"];

// Episode record from Firestore -> the fields the pages use.
// broadcast_start_pacific looks like "2026-10-01T19:00:00-07:00".
function addEpisodes(list) {
  list.forEach(e => {
    const p = String(e.broadcast_start_pacific || "");
    EPISODES.set(e.id, { id: e.id, channel: e.channel || "", title: e.program_title || "",
      date: p.slice(0, 10), time: p.slice(11, 16), sortKey: e.broadcast_start_ms || Date.parse(p) || 0 });
  });
}
const episodeOrder = id => EPISODES.get(id)?.sortKey ?? Infinity;
const episodeLabel = id => {
  const e = EPISODES.get(id);
  return e ? `${e.channel} \u00B7 ${e.date} ${e.time} \u00B7 ${e.title}` : `${id} (episode not found)`;
};
const network = id => EPISODES.get(id)?.channel || id.split("_")[0];

// Clip record from Firestore. Its url names the archive.org recording and the seconds inside it
// (https://archive.org/details/<archive_id>/start/<s>/end/<e>); start_seconds counts from the episode
// start instead, which differs when an episode begins partway into a longer recording.
// Captions: "captions" (timed: [{s, e, txt}] in seconds within the clip) if present, else "caption_text"
// (the whole minute's text, no times).
function parseClip(c) {
  const m = String(c.url || "").match(/archive\.org\/details\/([^/?#]+)\/start\/(\d+)\/end\/(\d+)/);
  return { id: c.id, url: c.url || "", start_seconds: +c.start_seconds || 0, end_seconds: +c.end_seconds || 0,
           archive_id: m ? m[1] : "", a_start: m ? +m[2] : 0, a_end: m ? +m[3] : 0,
           captions: Array.isArray(c.captions) ? c.captions : null, caption_text: typeof c.caption_text === "string" ? c.caption_text : "" };
}

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtTime = iso => iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

// ---- CSV ----
// bbox column: "t:x,y,w,h" per box, ";" between boxes; x,y,w,h are fractions of the video frame
const bboxText = r => (r.boxes || []).map(b => `${b.t}:${[b.x, b.y, b.w, b.h].map(v => (+v).toFixed(3)).join(",")}`).join(";");
// Annotators type free text; a cell starting with = + or - (not a number), or @ followed by a call
// or pipe, would run as a formula when the CSV is opened in Excel or Sheets, so it gets a leading
// apostrophe. Plain handles such as "@SenLiu" are left alone.
const safeCell = v => /^[=+\t\r]|^-(?![\d.])|^@.*[(|]/.test(v) ? "'" + v : v;
function toCsv(rows) {
  const q = v => /[",\n\r]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
  const lines = [CSV_COLS.join(",")];
  rows.forEach(r => lines.push(CSV_COLS.map(c => q(safeCell(c === "bbox" ? bboxText(r) : String(r[c] ?? "")))).join(",")));
  return lines.join("\n");
}
// rows sorted the way a reader expects: annotator, episode, minute, start
const sortRows = rows => rows.slice().sort((a, b) =>
  String(a.annotator).localeCompare(b.annotator) || a.episode_id.localeCompare(b.episode_id) ||
  String(a.minute).localeCompare(b.minute) || (+a.start || 0) - (+b.start || 0));
function downloadText(name, text, type = "text/csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---- toasts ----
function toast(text, kind = "", action = null) {
  let box = $("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = "toast " + kind;
  t.innerHTML = `<span>${esc(text)}</span>`;
  let gone = false;
  const close = () => { if (gone) return; gone = true; t.classList.remove("in"); setTimeout(() => t.remove(), 300); };
  if (action) {
    const b = document.createElement("button");
    b.textContent = action.label;
    b.onclick = () => { action.run(); close(); };
    t.appendChild(b);
  }
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("in")));
  setTimeout(close, action ? 6000 : 3200);
}
const msg = (text, ok) => toast(text, ok ? "ok" : "err");

// ---- views and sign-in ----
// Each page has <div class="view"> blocks; exactly one is visible.
function show(viewId) { document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== viewId); }

const AUTH_HTML = `
<form id="loginForm" class="authbox">
  <div class="brand">CiteCast <span class="authSub"></span></div>
  <h1>Sign in</h1>
  <label class="fld">Username <input id="lgUser" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
  <label class="fld">Password <input id="lgPass" type="password" autocomplete="current-password" required></label>
  <div class="formerr" id="lgErr"></div>
  <button class="btn primary wide" id="lgBtn" type="submit">Sign in</button>
  <p class="fine" id="mockNote"></p>
</form>
<form id="pwForm" class="authbox" hidden>
  <div class="brand">CiteCast <span class="authSub"></span></div>
  <h1>Choose a new password</h1>
  <p>You signed in with a temporary password. Choose your own to continue.</p>
  <label class="fld">New password (8 characters or more) <input id="pwNew" type="password" autocomplete="new-password" required></label>
  <label class="fld">Repeat the new password <input id="pwConfirm" type="password" autocomplete="new-password" required></label>
  <div class="formerr" id="pwErr"></div>
  <button class="btn primary wide" id="pwBtn" type="submit">Save password</button>
</form>`;

// The store fires this when the signed-in account changes underneath the page (another tab, expiry).
window.addEventListener("citecast-auth-changed", () => {
  if (confirm("Your sign-in changed in another tab or ended. Reload this page now? Nothing can be uploaded until you do."))
    location.href = location.pathname;
});

// Shows sign-in and the first-login password change as needed, then calls onUser(user).
// beforeSignOut, if given, runs first and can cancel the sign-out by returning false.
async function startAuth({ admin = false, onUser, beforeSignOut = null }) {
  const view = $("authView");
  view.innerHTML = AUTH_HTML;
  view.querySelectorAll(".authSub").forEach(s => s.textContent = admin ? "admin" : "annotator");
  $("mockNote").textContent = Store.backend === "mock"
    ? "Development mode: accounts are hardcoded in store.js and all data stays in this browser." : "";

  const askLogin = (err = "") => {
    show("authView"); $("loginForm").hidden = false; $("pwForm").hidden = true;
    $("lgErr").textContent = err; $("lgPass").value = "";
    setTimeout(() => $("lgUser").focus(), 0);
  };
  const proceed = async u => {
    if (!u) return askLogin();
    if (admin && u.role !== "admin") { await Store.signOut(); return askLogin("This page is for admins only."); }
    if (u.must_change_password) {
      show("authView"); $("loginForm").hidden = true; $("pwForm").hidden = false;
      setTimeout(() => $("pwNew").focus(), 0);
      return;
    }
    onUser(u);
  };
  const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = label; };

  $("loginForm").onsubmit = async e => {
    e.preventDefault(); $("lgErr").textContent = "";
    busy($("lgBtn"), true, "Signing in...");
    try { await proceed(await Store.signIn($("lgUser").value, $("lgPass").value)); }
    catch (err) { $("lgErr").textContent = err.message; }
    finally { busy($("lgBtn"), false, "Sign in"); }
  };
  $("pwForm").onsubmit = async e => {
    e.preventDefault();
    const a = $("pwNew").value, b = $("pwConfirm").value;
    if (a.length < 8) return $("pwErr").textContent = "Use at least 8 characters.";
    if (a !== b) return $("pwErr").textContent = "The two passwords do not match.";
    $("pwErr").textContent = "";
    busy($("pwBtn"), true, "Saving...");
    try { await proceed(await Store.changePassword(a)); }
    catch (err) { $("pwErr").textContent = err.message; }
    finally { busy($("pwBtn"), false, "Save password"); }
  };
  document.querySelectorAll(".signout").forEach(b => b.onclick = async () => {
    if (beforeSignOut && !(await beforeSignOut())) return;
    await Store.signOut();
    location.href = location.pathname;   // drop the hash and all page state
  });

  proceed(await Store.currentUser());
}
