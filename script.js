const menu = document.getElementById("menu");
const nav = document.getElementById("nav");
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menu && nav) {
  menu.addEventListener("click", () => {
    nav.classList.toggle("open");
  });

  nav.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) {
      nav.classList.remove("open");
    }
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const href = anchor.getAttribute("href");
    if (!href) return;
    const section = document.querySelector(href);
    if (!section) return;
    event.preventDefault();
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
