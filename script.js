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

// Lightbox logic
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const closeLightbox = document.querySelector('.lightbox-close');

  document.querySelectorAll('.pub-image').forEach(img => {
    img.addEventListener('click', function() {
      lightbox.style.display = "flex";
      lightboxImg.src = this.src;
      lightboxCaption.innerHTML = this.alt;
    });
  });

  closeLightbox.addEventListener('click', () => {
    lightbox.style.display = "none";
  });

  lightbox.addEventListener('click', (e) => {
    if(e.target !== lightboxImg) {
      lightbox.style.display = "none";
    }
  });
}
