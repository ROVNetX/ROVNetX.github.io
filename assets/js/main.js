// ── Performans: sadece gorunen videolari oynat ───────────────────────────
(function optimizeVideoPlayback() {
  const deckVideos = Array.from(document.querySelectorAll('main video'));
  if (!deckVideos.length) {
    return;
  }

  const tryPlay = (video) => {
    video.preload = 'auto';
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Otomatik oynatma engellenirse sessizce devam et.
      });
    }
  };

  const pauseVideo = (video) => {
    if (!video.paused) {
      video.pause();
    }
  };

  deckVideos.forEach((video) => {
    video.preload = 'metadata';
  });

  const videoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          tryPlay(video);
        } else {
          pauseVideo(video);
        }
      }
    },
    {
      threshold: [0, 0.35, 0.6],
      rootMargin: '12% 0px 12% 0px'
    }
  );

  deckVideos.forEach((video) => videoObserver.observe(video));
})();

// ── Video popup (kart videolari icin) ───────────────────────────────────────
const videoModal = document.getElementById('videoModal');
const videoModalPlayer = document.getElementById('videoModalPlayer');
const videoModalClose = document.getElementById('videoModalClose');
const videoModalCaption = document.getElementById('videoModalCaption');

if (videoModal && videoModalPlayer && videoModalClose && videoModalCaption) {
  const videoCards = Array.from(document.querySelectorAll('.video-card, .insight-card'));

  const openVideoModal = (sourceVideo, captionText) => {
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
  };

  for (const card of videoCards) {
    const cardVideo = card.querySelector('video');
    if (!cardVideo) {
      continue;
    }

    const caption = card.querySelector('h4, figcaption')?.textContent?.trim() || 'Video oynatiliyor';

    card.classList.add('video-popup-trigger');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${caption} videosunu popup olarak ac`);

    card.addEventListener('click', () => {
      openVideoModal(cardVideo, caption);
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openVideoModal(cardVideo, caption);
      }
    });
  }

  videoModalClose.addEventListener('click', closeVideoModal);

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
const deck = document.getElementById('mainDeck');
const prevSlideButton = document.getElementById('prevSlide');
const nextSlideButton = document.getElementById('nextSlide');
const swipeHint = document.getElementById('swipeHint');

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
const topLevelSections = Array.from(document.querySelectorAll('main > section[id]'));
const sharedSlide = document.getElementById('slideShared');
const sharedSections = Array.from(document.querySelectorAll('#slideShared .stack-section[id]'));
const navLinks = Array.from(document.querySelectorAll('.section-nav a[href^="#"]'));
const platformNavLinks = Array.from(document.querySelectorAll('.platform-nav a[href^="#"]'));
const deckLinks = Array.from(document.querySelectorAll('a[href^="#"]'));

const mapToTopLevelSectionId = (targetId) => {
  const targetSection = document.getElementById(targetId);
  if (!targetSection) {
    return '';
  }

  const topLevel = targetSection.closest('main > section[id]');
  return topLevel ? topLevel.id : targetSection.id;
};

const getActiveTopLevelSectionId = () => {
  if (deck) {
    const viewCenter = deck.scrollLeft + deck.clientWidth / 2;
    let closestSection = topLevelSections[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const section of topLevelSections) {
      const sectionCenter = section.offsetLeft + section.offsetWidth / 2;
      const distance = Math.abs(sectionCenter - viewCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSection = section;
      }
    }

    return closestSection?.id || '';
  }

  for (const section of topLevelSections) {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 180 && rect.bottom >= 180) {
      return section.id;
    }
  }

  return '';
};

const getActiveSharedSectionId = () => {
  if (!sharedSlide || sharedSections.length === 0) {
    return '';
  }

  const viewAnchor = sharedSlide.scrollTop + sharedSlide.clientHeight * 0.3;
  let closestSection = sharedSections[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const section of sharedSections) {
    const sectionCenter = section.offsetTop + section.offsetHeight / 2;
    const distance = Math.abs(sectionCenter - viewAnchor);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestSection = section;
    }
  }

  return closestSection?.id || '';
};

const scrollToSection = (targetId) => {
  const targetSection = document.getElementById(targetId);
  if (!targetSection) {
    return;
  }

  const isSharedChild = Boolean(sharedSlide && targetSection.closest('#slideShared') && targetSection !== sharedSlide);

  if (isSharedChild && sharedSlide) {
    if (deck) {
      const deckRect = deck.getBoundingClientRect();
      const slideRect = sharedSlide.getBoundingClientRect();
      deck.scrollTo({ left: deck.scrollLeft + (slideRect.left - deckRect.left), behavior: 'smooth' });
    } else {
      sharedSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }

    sharedSlide.scrollTo({
      top: Math.max(0, targetSection.offsetTop - 12),
      behavior: 'smooth'
    });
    return;
  }

  if (deck) {
    const deckRect = deck.getBoundingClientRect();
    const sectionRect = targetSection.getBoundingClientRect();
    deck.scrollTo({ left: deck.scrollLeft + (sectionRect.left - deckRect.left), behavior: 'smooth' });
  } else {
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }

  if (targetSection === sharedSlide && sharedSlide) {
    sharedSlide.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
};

deckLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      return;
    }

    const targetId = href.slice(1);
    const targetSection = document.getElementById(targetId);
    if (!targetSection) {
      return;
    }

    event.preventDefault();
    scrollToSection(targetId);
    history.replaceState(null, '', `#${targetId}`);
  });
});

const setActiveLink = () => {
  const activeTopLevelId = getActiveTopLevelSectionId();
  const sharedActiveId = activeTopLevelId === 'slideShared' ? getActiveSharedSectionId() : '';

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    const isActive = href === `#${activeTopLevelId}`;
    link.classList.toggle('active', isActive);
  });

  platformNavLinks.forEach((link) => {
    const isActive = sharedActiveId !== '' && link.getAttribute('href') === `#${sharedActiveId}`;
    link.classList.toggle('active', isActive);
  });
};

if (deck && prevSlideButton && nextSlideButton) {
  let isDraggingDeck = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartScrollLeft = 0;
  let pointerMode = '';

  const moveDeckBy = (direction) => {
    const activeTopLevelId = getActiveTopLevelSectionId();
    const activeIndex = topLevelSections.findIndex((section) => section.id === activeTopLevelId);

    const hashTargetTopLevel = mapToTopLevelSectionId(window.location.hash.slice(1));
    const fallbackIndex = Math.max(0, topLevelSections.findIndex((section) => section.id === hashTargetTopLevel));

    const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
    const nextIndex = Math.min(topLevelSections.length - 1, Math.max(0, currentIndex + direction));
    const nextSection = topLevelSections[nextIndex];

    if (nextSection) {
      scrollToSection(nextSection.id);
      history.replaceState(null, '', `#${nextSection.id}`);
    }
  };

  prevSlideButton.addEventListener('click', () => moveDeckBy(-1));
  nextSlideButton.addEventListener('click', () => moveDeckBy(1));

  deck.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') {
      isDraggingDeck = true;
      pointerMode = 'mouse';
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartScrollLeft = deck.scrollLeft;
      deck.classList.add('is-dragging');
      return;
    }

    if (event.pointerType !== 'touch') {
      return;
    }

    if (event.target.closest('a, button, input, select, textarea, video, canvas, iframe, table')) {
      pointerMode = '';
      return;
    }

    isDraggingDeck = true;
    pointerMode = 'touch';
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartScrollLeft = deck.scrollLeft;
  });

  deck.addEventListener('pointermove', (event) => {
    if (!isDraggingDeck || pointerMode !== 'mouse') {
      return;
    }

    const deltaX = event.clientX - dragStartX;
    deck.scrollLeft = dragStartScrollLeft - deltaX;
  });

  deck.addEventListener('pointerup', (event) => {
    if (!isDraggingDeck) {
      return;
    }

    if (pointerMode === 'touch') {
      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;
      const horizontalSwipe = Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

      if (horizontalSwipe) {
        moveDeckBy(deltaX < 0 ? 1 : -1);
      }
    }

    isDraggingDeck = false;
    pointerMode = '';
    deck.classList.remove('is-dragging');
  });

  const stopDraggingDeck = () => {
    isDraggingDeck = false;
    pointerMode = '';
    deck.classList.remove('is-dragging');
  };

  deck.addEventListener('pointerleave', stopDraggingDeck);
  deck.addEventListener('pointercancel', stopDraggingDeck);
}

if (deck) {
  deck.addEventListener('scroll', setActiveLink, { passive: true });
} else {
  window.addEventListener('scroll', setActiveLink, { passive: true });
}

if (sharedSlide) {
  sharedSlide.addEventListener('scroll', setActiveLink, { passive: true });
}

const initSwipeHint = () => {
  if (!deck || !swipeHint) {
    return;
  }

  const isMobileViewport = window.matchMedia('(max-width: 760px)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  if (!isMobileViewport || !isCoarsePointer) {
    return;
  }

  if (window.localStorage.getItem('rovnetxSwipeHintSeen') === 'true') {
    return;
  }

  let hideTimer = null;

  const dismissSwipeHint = () => {
    swipeHint.classList.remove('is-visible');
    swipeHint.setAttribute('aria-hidden', 'true');
    window.localStorage.setItem('rovnetxSwipeHintSeen', 'true');

    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }

    deck.removeEventListener('pointerdown', dismissSwipeHint);
    deck.removeEventListener('scroll', dismissSwipeHint);
    prevSlideButton?.removeEventListener('click', dismissSwipeHint);
    nextSlideButton?.removeEventListener('click', dismissSwipeHint);
  };

  swipeHint.classList.add('is-visible');
  swipeHint.setAttribute('aria-hidden', 'false');

  hideTimer = window.setTimeout(dismissSwipeHint, 3600);

  deck.addEventListener('pointerdown', dismissSwipeHint, { once: true });
  deck.addEventListener('scroll', dismissSwipeHint, { once: true });
  prevSlideButton?.addEventListener('click', dismissSwipeHint, { once: true });
  nextSlideButton?.addEventListener('click', dismissSwipeHint, { once: true });
};

window.addEventListener('load', () => {
  if (window.location.hash) {
    const targetId = window.location.hash.slice(1);
    if (document.getElementById(targetId)) {
      scrollToSection(targetId);
    }
  }

  setActiveLink();
  initSwipeHint();
});
