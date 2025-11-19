// Simple front-end logic for LVS landing

// --- Smooth scroll for links with [data-scroll] ---

document.querySelectorAll('[data-scroll]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();
    const offset = 72; // header height
    const top =
      target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top,
      behavior: 'smooth'
    });

    closeMobileNav();
  });
});

// --- Mobile nav toggle ---

const navToggle = document.querySelector('.nav-toggle');
const navList = document.querySelector('.nav-list');

function closeMobileNav() {
  if (!navList) return;
  navList.classList.remove('nav-open');
}

if (navToggle && navList) {
  navToggle.addEventListener('click', () => {
    navList.classList.toggle('nav-open');
  });
}

// Close menu on scroll
window.addEventListener('scroll', closeMobileNav);

// --- Open live MVP ---
// Путь к реальному демо поправь под себя.
// Сейчас стоит пример: папка "mvp-demo" в корне репо.

const MVP_DEMO_URL = 'mvp-demo/lvs_demo_full.html';

function openMVP() {
  window.open(MVP_DEMO_URL, '_blank');
}

const btn1 = document.getElementById('btn-open-mvp');
const btn2 = document.getElementById('btn-open-mvp-2');

if (btn1) btn1.addEventListener('click', openMVP);
if (btn2) btn2.addEventListener('click', openMVP);
