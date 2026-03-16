// ── Tüm videoları sayfa açılır açılmaz yükle ve oynat ─────────────────────
// .reveal ile opacity:0 olan section'lar içindeki videolar tarayıcı tarafından
// görünmez sayılır ve preload yapılmaz. Bu fonksiyon bunu zorlar.
(function eagerLoadVideos() {
  const startAll = () => {
    document.querySelectorAll('video').forEach(vid => {
      vid.preload = 'auto';
      vid.load();
      const promise = vid.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Tarayıcı politikası engellerse sessizce geç; autoplay zaten tekrar dener
        });
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAll);
  } else {
    startAll();
  }
})();

// ── Scroll reveal animasyonları ────────────────────────────────────────────
const revealTargets = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  },
  {
    threshold: 0.12,
    rootMargin: '0px 0px -6% 0px'
  }
);

for (const node of revealTargets) {
  observer.observe(node);
}

// ── Mobil nav toggle ───────────────────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const sectionNav = document.getElementById('sectionNav');

if (navToggle && sectionNav) {
  navToggle.addEventListener('click', () => {
    const nextState = !sectionNav.classList.contains('is-open');
    sectionNav.classList.toggle('is-open', nextState);
    navToggle.setAttribute('aria-expanded', String(nextState));
  });

  sectionNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      sectionNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Aktif nav linki vurgulama ──────────────────────────────────────────────
const sections = document.querySelectorAll('main section[id]');
const navLinks = Array.from(document.querySelectorAll('.section-nav a'));

const setActiveLink = () => {
  let activeId = '';

  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 180 && rect.bottom >= 180) {
      activeId = section.id;
      break;
    }
  }

  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('active', isActive);
  });
};

window.addEventListener('scroll', setActiveLink, { passive: true });
window.addEventListener('load', setActiveLink);
