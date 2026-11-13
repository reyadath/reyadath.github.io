/* Settings for index.html and admin.html.

   backend: "mock"     fake database in this browser with the hardcoded accounts in store.js (development)
            "firebase" Firebase Auth (email/password) and Firestore, using the settings below

   The firebase object is the web app config from Firebase console > Project settings > Your apps.
   It is not a secret: it only identifies the project. Access is controlled by firestore.rules. */
window.CITECAST_CONFIG = {
  backend: "firebase",

  // Annotators type a username; it signs in to Firebase as <username>@<emailDomain>.
  // The address does not have to exist. Use the same domain when adding users in the console.
  emailDomain: "citecast.app",

  // Annotation guide (Google Doc shared as "anyone with the link can view"). The Guide button shows it
  // in a side panel through the doc's /preview address, with a link to open it in a new tab.
  guideUrl: "https://docs.google.com/document/d/14uxHsFWYtWEALu5Mx1d4Jj0lwRGl13MJYJuXdy7WJaA/edit?usp=sharing",

  firebase: {
    apiKey: "AIzaSyA_uax_OrAdLG84MV7PC3IxbngWA4U2OxU",
    authDomain: "citecast-annotator.firebaseapp.com",
    projectId: "citecast-annotator",
    storageBucket: "citecast-annotator.firebasestorage.app",
    messagingSenderId: "310012482743",
    appId: "1:310012482743:web:b6d1d3c41f8a7efce1e932",
  },
};
