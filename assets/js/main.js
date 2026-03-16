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

// ── Video popup (kart videolari icin) ───────────────────────────────────────
const videoModal = document.getElementById('videoModal');
const videoModalPlayer = document.getElementById('videoModalPlayer');
const videoModalClose = document.getElementById('videoModalClose');
const videoModalCaption = document.getElementById('videoModalCaption');

if (videoModal && videoModalPlayer && videoModalClose && videoModalCaption) {
  const videoCards = Array.from(document.querySelectorAll('.video-card, .insight-card'));
  const isHoverDevice = window.matchMedia('(hover: hover)').matches;
  const videoModalDialog = videoModal.querySelector('.video-modal__dialog');
  let openedByHover = false;

  const openVideoModal = (sourceVideo, captionText, openMode = 'click') => {
    if (!sourceVideo) {
      return;
    }

    const source = sourceVideo.currentSrc || sourceVideo.getAttribute('src') || sourceVideo.querySelector('source')?.getAttribute('src');
    if (!source) {
      return;
    }

    videoModalPlayer.src = source;
    videoModalPlayer.currentTime = 0;
    videoModalPlayer.loop = true;
    videoModalPlayer.muted = false;
    videoModalCaption.textContent = captionText || 'Video oynatiliyor';
    openedByHover = openMode === 'hover';

    videoModal.classList.add('is-open');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    const playAttempt = videoModalPlayer.play();
    if (playAttempt !== undefined) {
      playAttempt.catch(() => {
        // Kullanici etkileşimi gerekirse controls aktif oldugu icin manuel baslatilir.
      });
    }
  };

  const closeVideoModal = () => {
    videoModal.classList.remove('is-open');
    videoModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    videoModalPlayer.pause();
    videoModalPlayer.removeAttribute('src');
    videoModalPlayer.load();
    videoModalCaption.textContent = '';
    openedByHover = false;
  };

  for (const card of videoCards) {
    const cardVideo = card.querySelector('video');
    if (!cardVideo) {
      continue;
    }

    const caption = card.querySelector('h4, figcaption')?.textContent?.trim() || 'Video oynatiliyor';
    let hoverTimer = null;

    card.classList.add('video-popup-trigger');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${caption} videosunu popup olarak ac`);

    card.addEventListener('click', () => {
      openVideoModal(cardVideo, caption, 'click');
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openVideoModal(cardVideo, caption, 'click');
      }
    });

    if (isHoverDevice) {
      card.addEventListener('mouseenter', () => {
        hoverTimer = window.setTimeout(() => {
          openVideoModal(cardVideo, caption, 'hover');
        }, 450);
      });

      card.addEventListener('mouseleave', () => {
        if (hoverTimer) {
          window.clearTimeout(hoverTimer);
          hoverTimer = null;
        }
      });
    }
  }

  videoModalClose.addEventListener('click', closeVideoModal);

  if (isHoverDevice && videoModalDialog) {
    videoModalDialog.addEventListener('mouseleave', () => {
      if (openedByHover && videoModal.classList.contains('is-open')) {
        closeVideoModal();
      }
    });
  }

  videoModal.addEventListener('click', (event) => {
    if (event.target === videoModal) {
      closeVideoModal();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && videoModal.classList.contains('is-open')) {
      closeVideoModal();
    }
  });
}

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
