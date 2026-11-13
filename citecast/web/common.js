/* Shared by index.html (annotator) and admin.html: the episode list, CSV export, toasts and the sign-in screens.
   Loaded as a plain script before store.js and the page script. */

// [episode_id, program, air_date_pacific, air_start_pacific, length_seconds], from annotation/episode_links.xlsx;
// length_seconds is the archive.org video length, filled in by update_episode_lengths.py
const EPISODES = [["CNNW_20200314_030000_CNN_Tonight_With_Don_Lemon", "CNN Tonight With Don Lemon", "2020-03-13", "08:00 PM PDT", 3660.69], ["CNNW_20200314_040000_Anderson_Cooper_360", "Anderson Cooper 360", "2020-03-13", "09:00 PM PDT", 3661.46], ["CNNW_20200314_050000_Cuomo_Prime_Time", "Cuomo Prime Time", "2020-03-13", "10:00 PM PDT", 3661.14], ["CNNW_20210110_050000_CNN_Newsroom_Live", "CNN Newsroom Live", "2021-01-09", "09:00 PM PST", 3660.94], ["CNNW_20210110_060000_CNN_Newsroom_Live", "CNN Newsroom Live", "2021-01-09", "10:00 PM PST", 3660.92], ["CNNW_20220425_050000_CNN_Newsroom_Live", "CNN Newsroom Live", "2022-04-24", "10:00 PM PDT", 3660.92], ["CNNW_20240201_040000_Laura_Coates_Live", "Laura Coates Live", "2024-01-31", "08:00 PM PST", 3662.24], ["CNNW_20240201_050000_Anderson_Cooper_360", "Anderson Cooper 360", "2024-01-31", "09:00 PM PST", 3662.13], ["CNNW_20240201_060000_The_Source_With_Kaitlan_Collins", "The Source With Kaitlan Collins", "2024-01-31", "10:00 PM PST", 3662.69], ["FOXNEWSW_20200314_030000_Fox_News_at_Night_With_Shannon_Bream", "Fox News at Night With Shannon Bream", "2020-03-13", "08:00 PM PDT", 3660.94], ["FOXNEWSW_20200314_040000_Tucker_Carlson_Tonight", "Tucker Carlson Tonight", "2020-03-13", "09:00 PM PDT", 3661.89], ["FOXNEWSW_20200314_050000_Hannity", "Hannity", "2020-03-13", "10:00 PM PDT", 3661.01], ["FOXNEWSW_20210110_040000_Watters_World", "Watters World", "2021-01-09", "08:00 PM PST", 3661.11], ["FOXNEWSW_20210110_050000_Justice_With_Judge_Jeanine", "Justice With Judge Jeanine", "2021-01-09", "09:00 PM PST", 3660.97], ["FOXNEWSW_20210110_060000_The_Greg_Gutfeld_Show", "The Greg Gutfeld Show", "2021-01-09", "10:00 PM PST", 3661.06], ["FOXNEWSW_20220425_030000_Life_Liberty__Levin", "Life Liberty Levin", "2022-04-24", "08:00 PM PDT", 3661.66], ["FOXNEWSW_20220425_040000_The_Next_Revolution_With_Steve_Hilton", "The Next Revolution With Steve Hilton", "2022-04-24", "09:00 PM PDT", 3660.97], ["FOXNEWSW_20220425_050000_Sunday_Night_in_America_With_Trey_Gowdy", "Sunday Night in America With Trey Gowdy", "2022-04-24", "10:00 PM PDT", 3661.06], ["FOXNEWSW_20230122_040000_One_Nation_With_Brian_Kilmeade", "One Nation With Brian Kilmeade", "2023-01-21", "08:00 PM PST", 3660.94], ["FOXNEWSW_20230122_050000_Unfiltered_With_Dan_Bongino", "Unfiltered With Dan Bongino", "2023-01-21", "09:00 PM PST", 3661.14], ["FOXNEWSW_20230122_060000_Lawrence_Jones_Cross_Country", "Lawrence Jones Cross Country", "2023-01-21", "10:00 PM PST", 3660.94], ["FOXNEWSW_20240201_040000_Fox_News_at_Night", "Fox News at Night", "2024-01-31", "08:00 PM PST", 3662.19], ["FOXNEWSW_20240201_050000_The_Five", "The Five", "2024-01-31", "09:00 PM PST", 3662.21], ["FOXNEWSW_20240201_060000_Jesse_Watters_Primetime", "Jesse Watters Primetime", "2024-01-31", "10:00 PM PST", 3662.33], ["MSNBCW_20200314_030000_The_11th_Hour_With_Brian_Williams", "The 11th Hour With Brian Williams", "2020-03-13", "08:00 PM PDT", 3660.77], ["MSNBCW_20200314_040000_The_Rachel_Maddow_Show", "The Rachel Maddow Show", "2020-03-13", "09:00 PM PDT", 3661.71], ["MSNBCW_20200314_050000_The_Last_Word_With_Lawrence_ODonnell", "The Last Word With Lawrence ODonnell", "2020-03-13", "10:00 PM PDT", 3661.14], ["MSNBCW_20210110_040000_The_Week_With_Joshua_Johnson", "The Week With Joshua Johnson", "2021-01-09", "08:00 PM PST", 3660.82], ["MSNBCW_20210110_050000_The_Week_With_Joshua_Johnson", "The Week With Joshua Johnson", "2021-01-09", "09:00 PM PST", 3660.92], ["MSNBCW_20220425_030000_The_Mehdi_Hasan_Show", "The Mehdi Hasan Show", "2022-04-24", "08:00 PM PDT", 3660.99], ["MSNBCW_20220425_040000_Ayman", "Ayman", "2022-04-24", "09:00 PM PDT", 3660.94], ["MSNBCW_20230122_040600_American_Voices_With_Alicia_Menendez", "American Voices With Alicia Menendez", "2023-01-21", "08:06 PM PST", 3302.43], ["MSNBCW_20230122_050000_Ayman", "Ayman", "2023-01-21", "09:00 PM PST", 3662.78], ["MSNBCW_20240201_040000_The_11th_Hour_With_Stephanie_Ruhle", "The 11th Hour With Stephanie Ruhle", "2024-01-31", "08:00 PM PST", 3662.26], ["MSNBCW_20240201_050000_Alex_Wagner_Tonight", "Alex Wagner Tonight", "2024-01-31", "09:00 PM PST", 3662.34], ["MSNBCW_20240201_060000_The_Last_Word_With_Lawrence_ODonnell", "The Last Word With Lawrence ODonnell", "2024-01-31", "10:00 PM PST", 3662.78]];

const FIELDS = ["is_web_ref","start","end","source","type","web_reference","is_social","social_platform","notes"];
const CSV_COLS = ["annotator","episode_id","minute",...FIELDS,"bbox"];

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const episodeInfo = id => EPISODES.find(x => x[0] === id) || [id, id, "", ""];
const network = id => id.split("_")[0].replace(/W$/, "");
// One block per full minute of video (a 3662 s recording has minutes 00-60; the last 2 s are left out).
// Without a stored length, assume the episode runs to the top of the next hour (a 04:06:00 start has 54 blocks).
const minuteCount = id => {
  const len = +(episodeInfo(id)[4] || 0);
  if (len >= 60) return Math.floor(len / 60);
  const m = id.match(/_\d{8}_\d{2}(\d{2})\d{2}_/); return 60 - (m ? +m[1] : 0);
};
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
