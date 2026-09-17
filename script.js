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

// Section reveal on scroll (lightweight IntersectionObserver)
const revealSections = document.querySelectorAll(".content-area > section");

if ("IntersectionObserver" in window && revealSections.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target); // fire once, then stop watching
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  revealSections.forEach((section) => observer.observe(section));
} else {
  // Fallback: show everything immediately
  revealSections.forEach((section) => section.classList.add("revealed"));
}

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
