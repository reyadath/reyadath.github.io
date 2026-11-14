/* Firebase backend for window.Store: Firebase Auth (email/password) and Firestore.
   Used when config.js has backend: "firebase". Same functions and return shapes as the mock in store.js.

   Firestore records (access is enforced by firestore.rules, not by this file):
     annotators/{uid}            username, name, role ("annotator" | "admin"), active, must_change_password
                                 (no passwords: Firebase Auth keeps those, hashed, and never returns them)
     assignments/{uid}__{ep}     uid, episode_id, assigned_at                        (admins write)
     submissions/{uid}__{ep}     uid, annotator, username, episode_id, status ("draft" | "final"),
                                 uploaded_at, submitted_at, row_count, minutes_done          (owner writes)
     submission_rows/{uid}__{ep} uid, episode_id, rows: [row, ...]                            (owner writes)
     episodes/{ep}               id, channel, broadcast_start, broadcast_start_pacific, program_title (read only here)
     clips/{ep}_{seconds}        id, episode_id, start_seconds, end_seconds, url, caption_text (read only here)
   The draft/final status lives only on the submission, so annotators never need to write assignments.
   Rows are kept apart from the summary so lists and progress never download them; they are read
   only to restore work or export CSVs. Both records are written together in one batch.

   The Firebase SDK is loaded from Google's CDN on first use. Serve the pages over http(s)
   (python3 -m http.server) rather than opening them as files. */
(function () {
  const CFG = window.CITECAST_CONFIG || {};
  if (CFG.backend !== "firebase") return;

  const SDK = "https://www.gstatic.com/firebasejs/13.1.0/";   // released 2026-10-21
  const ROW_KEYS = ["annotator","episode_id","minute","clip_id","is_web_ref","start","end","source","type",
                    "web_reference","is_social","social_platform","notes","boxes","hl"];
  const aid = (uid, ep) => `${uid}__${ep}`;
  const now = () => new Date().toISOString();
  const toEmail = u => { u = String(u).trim().toLowerCase(); return u.includes("@") ? u : `${u}@${CFG.emailDomain}`; };
  const cleanRow = r => Object.fromEntries(ROW_KEYS.map(k => [k, r[k] ?? (k === "boxes" || k === "hl" ? [] : "")]));

  // ---- SDK start (begins when this script runs; a failed start is retried on the next call) ----
  let started = null;
  function fb() {
    return started ||= (async () => {
      const [appM, authM, fsM] = await Promise.all([
        import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")]);
      const app = appM.initializeApp(CFG.firebase);
      const auth = authM.getAuth(app), db = fsM.getFirestore(app);
      // sign-in lasts for this tab only: closing it signs out (shared lab computers), and two people
      // in two tabs of the same browser cannot end up uploading under each other's account
      await authM.setPersistence(auth, authM.browserSessionPersistence);
      await new Promise(res => { const off = authM.onAuthStateChanged(auth, () => { off(); res(); }); });   // restored session known
      // if the account changes underneath this page, stop it from acting under the wrong user
      authM.onAuthStateChanged(auth, u => {
        if (SIGNED && (!u || u.uid !== SIGNED)) { SIGNED = null; ME = null; window.dispatchEvent(new Event("citecast-auth-changed")); }
      });
      return { appM, authM, fsM, app, auth, db };
    })().catch(e => { started = null; throw e; });
  }
  fb().catch(() => {});

  // readable messages for the Firebase errors people actually hit
  function friendly(e) {
    const code = e && e.code || "";
    const m = {
      "auth/invalid-credential": "Wrong username or password.", "auth/wrong-password": "Wrong username or password.",
      "auth/user-not-found": "Wrong username or password.", "auth/invalid-email": "Wrong username or password.",
      "auth/user-disabled": "This account is disabled. Contact the admin.",
      "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
      "auth/network-request-failed": "No connection to the server. Check the internet connection.",
      "auth/requires-recent-login": "For security, sign out and sign in again, then change your password.",
      "auth/weak-password": "Choose a stronger password (at least 8 characters).",
      "permission-denied": "The server refused this action (permission denied). Reload the page and try again.",
      "unavailable": "The server cannot be reached. Check the internet connection.",
    }[code];
    return new Error(m || (e && e.message) || "Something went wrong.");
  }
  const guard = fn => async (...args) => { try { return await fn(...args); } catch (e) { throw e.code ? friendly(e) : e; } };

  async function profile(uid) {
    const { fsM, db } = await fb();
    const s = await fsM.getDoc(fsM.doc(db, "annotators", uid));
    return s.exists() ? { uid, ...s.data() } : null;
  }
  // The signed-in profile is read once per session and kept here; the rules still check it on every write.
  // SIGNED is the uid this page signed in as; every call checks the current login still matches it.
  let ME = null, SIGNED = null;
  async function me() {
    const { auth } = await fb();
    if (!auth.currentUser) throw new Error("You are signed out. Reload the page and sign in.");
    if (SIGNED && auth.currentUser.uid !== SIGNED) throw new Error("The account changed in another tab. Reload this page.");
    if (ME && ME.uid === auth.currentUser.uid) return ME;
    const p = await profile(auth.currentUser.uid);
    if (!p || !p.active) throw new Error("This account is not active.");
    return ME = p;
  }
  const publicUser = p => ({ uid: p.uid, username: p.username, name: p.name, role: p.role, active: p.active, must_change_password: !!p.must_change_password });
  // assignment + its submission, in the shape the pages use. Upload fields are written by annotators,
  // so they are forced to plain types here as well as in the rules before any page displays them.
  const num = v => Number.isFinite(+v) ? Math.max(0, Math.floor(+v)) : 0;
  const str = v => typeof v === "string" ? v.slice(0, 40) : null;
  const joined = (a, s) => ({
    uid: a.uid, episode_id: a.episode_id, assigned_at: str(a.assigned_at),
    status: s && (s.status === "draft" || s.status === "final") ? s.status : "assigned",
    uploaded_at: s ? str(s.uploaded_at) : null, submitted_at: s ? str(s.submitted_at) : null,
    row_count: s ? num(s.row_count) : 0, minutes_done: s ? num(s.minutes_done) : 0 });
  async function all(q) { const { fsM } = await fb(); return (await fsM.getDocs(q)).docs.map(d => d.data()); }
  // episode record with the timestamp turned into milliseconds, for sorting
  const episodeOut = (id, x) => ({ ...x, id, broadcast_start_ms: x.broadcast_start?.toMillis ? x.broadcast_start.toMillis() : 0, broadcast_start: undefined });

  window.Store = {
    backend: "firebase",
    can: { resetPassword: false, createAccounts: false },   // accounts are made in the Firebase console

    // ---- session ----
    signIn: guard(async (username, password) => {
      const { authM, auth } = await fb();
      const cred = await authM.signInWithEmailAndPassword(auth, toEmail(username), password);
      const p = await profile(cred.user.uid);
      if (!p) { await authM.signOut(auth); throw new Error("This account has no CiteCast profile yet. Contact the admin."); }
      if (!p.active) { await authM.signOut(auth); throw new Error("This account is deactivated. Contact the admin."); }
      ME = p; SIGNED = p.uid;
      return publicUser(p);
    }),
    signOut: guard(async () => { const { authM, auth } = await fb(); ME = null; SIGNED = null; await authM.signOut(auth); }),
    currentUser: guard(async () => {
      const { authM, auth } = await fb();
      if (!auth.currentUser) return null;
      const p = await profile(auth.currentUser.uid);
      if (!p || !p.active) { await authM.signOut(auth); return null; }
      ME = p; SIGNED = p.uid;
      return publicUser(p);
    }),
    changePassword: guard(async newPassword => {
      if (typeof newPassword !== "string" || newPassword.length < 8) throw new Error("Use at least 8 characters.");
      const { authM, fsM, auth, db } = await fb();
      const p = await me();
      await authM.updatePassword(auth.currentUser, newPassword);
      await fsM.updateDoc(fsM.doc(db, "annotators", p.uid), { must_change_password: false });
      ME = { ...p, must_change_password: false };
      return publicUser(ME);
    }),

    // ---- episodes and clips (read only) ----
    // Every episode; the admin page uses this for the assignment table.
    listEpisodes: guard(async () => {
      const { fsM, db } = await fb();
      return (await fsM.getDocs(fsM.collection(db, "episodes"))).docs.map(d => episodeOut(d.id, d.data()));
    }),
    // Only the given episodes (one read each); missing ids are left out.
    getEpisodes: guard(async ids => {
      const { fsM, db } = await fb();
      const snaps = await Promise.all(ids.map(id => fsM.getDoc(fsM.doc(db, "episodes", id))));
      return snaps.filter(s => s.exists()).map(s => episodeOut(s.id, s.data()));
    }),
    // All clips of one episode, in time order (sorted here, so no composite index is needed).
    getClips: guard(async episodeId => {
      const { fsM, db } = await fb();
      const q = fsM.query(fsM.collection(db, "clips"), fsM.where("episode_id", "==", episodeId));
      return (await fsM.getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (+a.start_seconds || 0) - (+b.start_seconds || 0));
    }),
    // {episode_id: number of clips}, using count queries (about one read per episode).
    clipCounts: guard(async ids => {
      const { fsM, db } = await fb();
      const counts = await Promise.all(ids.map(async id => {
        const q = fsM.query(fsM.collection(db, "clips"), fsM.where("episode_id", "==", id));
        return [id, (await fsM.getCountFromServer(q)).data().count];
      }));
      return Object.fromEntries(counts);
    }),

    // ---- annotator ----
    myAssignments: guard(async () => {
      const { fsM, db } = await fb(), p = await me();
      const byMe = name => fsM.query(fsM.collection(db, name), fsM.where("uid", "==", p.uid));
      const [as, ss] = await Promise.all([all(byMe("assignments")), all(byMe("submissions"))]);
      return as.map(a => joined(a, ss.find(s => s.episode_id === a.episode_id)));
    }),
    getMySubmission: guard(async episodeId => {
      const { fsM, db } = await fb(), p = await me(), id = aid(p.uid, episodeId);
      const [s, r] = await Promise.all([fsM.getDoc(fsM.doc(db, "submissions", id)), fsM.getDoc(fsM.doc(db, "submission_rows", id))]);
      if (!s.exists()) return null;
      const rows = r.exists() ? r.data().rows : (s.data().rows || []);   // older uploads kept rows inline
      return { ...s.data(), rows: rows.map(x => ({ ...x, episode_id: episodeId, annotator: p.name })) };
    }),
    // Uploads all of the annotator's rows for one episode, replacing the previous upload.
    // One atomic write; the rules refuse it if the episode is not assigned to this user or already final.
    // If refused, the profile is read again and the upload retried once, in case the admin changed the
    // annotator's name or ID since this page cached it.
    saveSubmission: async (episodeId, rows, final) => {
      const attempt = async () => {
        const { fsM, db } = await fb(), p = await me(), id = aid(p.uid, episodeId);
        const clean = rows.filter(r => r.episode_id === episodeId).map(cleanRow)
                          .map(r => ({ ...r, annotator: p.name, episode_id: episodeId })), t = now();
        const sub = { uid: p.uid, annotator: p.name, username: p.username, episode_id: episodeId,
                      status: final ? "final" : "draft", uploaded_at: t, submitted_at: final ? t : null,
                      row_count: clean.length, minutes_done: new Set(clean.map(r => +r.minute)).size };
        const batch = fsM.writeBatch(db);
        batch.set(fsM.doc(db, "submissions", id), sub);
        batch.set(fsM.doc(db, "submission_rows", id), { uid: p.uid, episode_id: episodeId, rows: clean });
        await batch.commit();
        return joined({ uid: p.uid, episode_id: episodeId }, sub);
      };
      try { return await attempt(); }
      catch (e) {
        if (e.code !== "permission-denied") throw e.code ? friendly(e) : e;
        ME = null;
        try { return await attempt(); }
        catch (e2) {
          if (e2.code === "permission-denied")
            throw new Error("Upload refused: this episode is submitted already or no longer assigned to you. Go back to My episodes to see its current state.");
          throw e2.code ? friendly(e2) : e2;
        }
      }
    },

    // ---- admin ----
    adminOverview: guard(async () => {
      const { fsM, db } = await fb();
      const [ps, as, ss] = await Promise.all([
        fsM.getDocs(fsM.collection(db, "annotators")), all(fsM.collection(db, "assignments")), all(fsM.collection(db, "submissions"))]);
      return {
        annotators: ps.docs.map(d => publicUser({ uid: d.id, ...d.data() })),
        assignments: as.map(a => joined(a, ss.find(s => s.uid === a.uid && s.episode_id === a.episode_id))),
      };
    }),
    adminSubmissions: guard(async (filter = {}) => {
      const { fsM, db } = await fb();
      const conds = [];
      if (filter.uid) conds.push(fsM.where("uid", "==", filter.uid));
      if (filter.episodeId) conds.push(fsM.where("episode_id", "==", filter.episodeId));
      if (filter.finalOnly) conds.push(fsM.where("status", "==", "final"));
      const subs = await all(fsM.query(fsM.collection(db, "submissions"), ...conds));
      const rows = await Promise.all(subs.map(s => fsM.getDoc(fsM.doc(db, "submission_rows", aid(s.uid, s.episode_id)))));
      return subs.map((s, i) => ({ ...s, rows: rows[i].exists() ? rows[i].data().rows : (s.rows || []) }));
    }),
    // Returns the new assignment, joined with any earlier upload, so the page can update without reloading.
    adminAssign: guard(async (uid, episodeId) => {
      const { fsM, db } = await fb(), id = aid(uid, episodeId), a = { uid, episode_id: episodeId, assigned_at: now() };
      const [, s] = await Promise.all([fsM.setDoc(fsM.doc(db, "assignments", id), a), fsM.getDoc(fsM.doc(db, "submissions", id))]);
      return joined(a, s.exists() ? s.data() : null);
    }),
    // Removes the assignment. The submission is kept and shows up again if the episode is reassigned.
    adminUnassign: guard(async (uid, episodeId) => {
      const { fsM, db } = await fb();
      await fsM.deleteDoc(fsM.doc(db, "assignments", aid(uid, episodeId)));
    }),
    adminReopen: guard(async (uid, episodeId) => {
      const { fsM, db } = await fb();
      await fsM.updateDoc(fsM.doc(db, "submissions", aid(uid, episodeId)), { status: "draft", submitted_at: null });
    }),
    // Accounts are created only in the Firebase console (sign-up is turned off). This adds the CiteCast
    // profile for such an account; without a profile the account cannot read or write anything.
    adminCreateAnnotator: guard(async ({ name, username, uid }) => {
      const { fsM, db } = await fb();
      username = String(username || "").trim().toLowerCase(); name = String(name || "").trim(); uid = String(uid || "").trim();
      if (!name) throw new Error("Enter a name.");
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("IDs are 3 to 32 characters: letters, digits, dot, dash or underscore.");
      if (!/^[A-Za-z0-9]{20,128}$/.test(uid)) throw new Error("Paste the user's UID from Firebase console > Authentication > Users.");
      const p = { username, name, role: "annotator", active: true, must_change_password: true };
      await fsM.setDoc(fsM.doc(db, "annotators", uid), p);
      return publicUser({ uid, ...p });
    }),
    adminSetActive: guard(async (uid, active) => {
      const { fsM, db, auth } = await fb();
      if (uid === auth.currentUser?.uid) throw new Error("You cannot deactivate your own account.");
      await fsM.updateDoc(fsM.doc(db, "annotators", uid), { active: !!active });
    }),
    // The Firebase web SDK cannot set another user's password; the admin page hides this button.
    // Use annotation/admin_tools/set_password.py instead (keeps the same account and UID).
    adminResetPassword: guard(async () => {
      throw new Error("Passwords cannot be reset from this page. Use annotation/admin_tools/set_password.py.");
    }),
  };
})();
