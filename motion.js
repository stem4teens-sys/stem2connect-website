/* Shared progressive-enhancement layer. No layout wrappers or content rewrites. */
(() => {
  'use strict';
  const scriptURL = document.currentScript.src;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const hackathon = document.body.classList.contains('hackathon-page');
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const hero = document.querySelector('.hero');
  const machine = document.querySelector('.machine');
  const moleculeHost = document.querySelector('.hero-logo-wrap');
  const surfaces = [...document.querySelectorAll('main article, .hero-card, .highlight-card, .mission-card, .join-card, .social-card, .collab-link, .resources-hero-card, .mentor-panel, .sidebar-card')];
  const animations = new Set();
  const cleanups = [];
  let observer;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let activeSurface = null;
  let activeButton = null;
  let surfacePoint = { x: 0, y: 0 };
  let buttonPoint = { x: 0, y: 0 };

  const animate = (element, keyframes, options) => {
    if (reduced.matches || !element.animate) return;
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => {
      animations.delete(animation);
      animation.cancel();
    });
  };

  // Preserve every text node, space, existing <br>, and emphasis element.
  document.querySelectorAll('main h1, main h2, main h3, main h4').forEach(heading => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(token => {
        if (!token) return;
        if (/^\s+$/.test(token)) fragment.append(document.createTextNode(token));
        else {
          const word = document.createElement('span');
          word.className = 'motion-word';
          word.textContent = token;
          fragment.append(word);
        }
      });
      node.replaceWith(fragment);
    });
    if (heading.matches('h1, h2')) {
      const words = [...heading.querySelectorAll('.motion-word')];
      const emphasized = heading.querySelectorAll('em .motion-word, h2 > span:not(.motion-word) .motion-word');
      const phrases = ['STEM Opportunities', 'every student.', 'one community.', 'upcoming activities.',
        'students', 'STEM2Connect community.', 'connected', 'Resources', 'Newsletter Archive',
        'Journal', 'Organic Chemistry', 'on the way.', 'Make it real.', 'your project.'];
      const text = words.map(word => word.textContent).join(' ');
      const phrase = phrases.find(phrase => text.includes(phrase));
      if (emphasized.length) [...emphasized].forEach(word => word.classList.add('ink-gradient'));
      else if (phrase) {
        const terms = phrase.split(' ');
        const start = words.findIndex((word, index) => terms.every((term, offset) => words[index + offset]?.textContent === term));
        if (start >= 0) words.slice(start, start + terms.length).forEach(word => word.classList.add('ink-gradient'));
      }
    }
  });

  surfaces.forEach(element => element.classList.add('motion-surface'));

  // Stack only pre-existing vertical groups. Preserve their natural flow height.
  const stackGroups = [...document.querySelectorAll('.timeline, .upcoming-timeline')];
  const configureStacks = () => stackGroups.forEach(group => {
    const children = [...group.children].filter(child => child.matches('li, article'));
    const fits = children.every(child => child.offsetHeight < innerHeight * .55);
    group.classList.toggle('stack-enabled', fits && !reduced.matches);
    children.forEach((child, index) => {
      child.classList.add('stack-card');
      child.style.setProperty('--stack-index', index);
    });
  });

  // Decorative paths fit inside the existing track cards.
  const motifs = [
    '<path d="M43 70V39M43 39L18 20M43 39L67 20M43 54L18 46M43 54L67 46"/><circle cx="18" cy="20" r="5"/><circle cx="67" cy="20" r="5"/><circle cx="18" cy="46" r="5"/><circle cx="67" cy="46" r="5"/>',
    '<path d="M4 43H21L29 27L38 63L49 14L57 43H82"/><circle cx="43" cy="43" r="36"/>',
    '<path d="M15 69C12 18 40 11 72 14C76 50 59 73 15 69ZM15 69L60 26M32 51V30M45 40H63"/>',
    '<ellipse cx="43" cy="43" rx="37" ry="14"/><ellipse cx="43" cy="43" rx="37" ry="14" transform="rotate(60 43 43)"/><ellipse cx="43" cy="43" rx="37" ry="14" transform="rotate(120 43 43)"/><circle cx="43" cy="43" r="4"/>',
    '<circle cx="43" cy="43" r="9"/><circle cx="43" cy="12" r="5"/><circle cx="15" cy="62" r="5"/><circle cx="71" cy="62" r="5"/><path d="M43 17V34M22 59L36 48M50 48L65 59M39 14L18 56M48 14L69 56M22 65H64"/>'
  ];
  document.querySelectorAll('.track-grid article').forEach((card, index) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 86 86');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'track-motif');
    svg.innerHTML = motifs[index % motifs.length];
    card.append(svg);
  });

  // Replace decorative emoji artwork within its existing box with consistent drawn STEM symbols.
  const iconPaths = {
    microphone: '<rect x="19" y="6" width="10" height="23" rx="5"/><path class="icon-draw" d="M13 22v3a11 11 0 0 0 22 0v-3M24 36v7M16 43h16M5 17v10M43 17v10"/>',
    flask: '<path d="M18 5h12M20 5v14L10 35q-4 8 5 8h18q9 0 5-8L28 19V5"/><path class="icon-draw" d="M14 31h20M19 35h2M28 38h3"/><circle class="icon-lift" cx="25" cy="24" r="2"/>',
    network: '<path class="icon-draw" d="M24 12v12M12 31l12-7 12 7M12 31v8M36 31v8"/><circle cx="24" cy="8" r="5"/><circle cx="10" cy="32" r="5"/><circle cx="38" cy="32" r="5"/><circle class="icon-orbit" cx="24" cy="24" r="18"/>',
    plant: '<path d="M24 43V23M17 43h14"/><path class="icon-draw" d="M24 30C8 30 7 19 7 14c13 0 17 8 17 16ZM24 24C40 24 41 13 41 8c-13 0-17 8-17 16Z"/>',
    compass: '<circle cx="24" cy="24" r="18"/><path class="icon-orbit" d="M30 13l-3 14-14 8 8-14 9-8ZM21 21l6 6"/><path d="M24 3v5M24 40v5M3 24h5M40 24h5"/>',
    target: '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="11"/><circle cx="24" cy="24" r="4"/><path class="icon-draw" d="M24 24L42 6M35 6h7v7"/>',
    book: '<path class="icon-draw" d="M24 12C19 7 11 7 5 9v29c7-2 14-1 19 3 5-4 12-5 19-3V9c-6-2-14-2-19 3v29M11 17h7M11 23h7M30 17h7M30 23h7"/>',
    microscope: '<path d="M9 42h32M15 42v-6h19M22 9l8 5-9 15-8-5 9-15ZM24 5l9 6M13 27l5 3M28 20a11 11 0 0 1 1 21"/><path class="icon-draw" d="M7 34h17"/>'
  };
  document.querySelectorAll('.activity-icon, .highlight-icon').forEach(icon => {
    let name;
    if (icon.matches('.highlight-icon')) name = ['network', 'compass', 'plant'][[...document.querySelectorAll('.highlight-icon')].indexOf(icon)];
    else name = ({ '🎙️': 'microphone', '🧪': 'flask', '💬': 'network', '🌱': 'plant', '🎯': 'target', '📚': 'book', '🔬': 'microscope' })[icon.textContent.trim()];
    if (!name) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'stem-icon');
    svg.innerHTML = iconPaths[name]; icon.append(svg); icon.classList.add('has-stem-icon');
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const toggle = document.querySelector('#navToggle[aria-expanded="true"]');
    if (toggle) { toggle.click(); toggle.focus({ preventScroll: true }); }
  });
  const navigation = [...document.querySelectorAll('header nav a')];
  navigation.forEach((link, index) => link.style.setProperty('--nav-index', index));
  const sectionLinks = navigation.map(link => {
    const url = new URL(link.href);
    return { link, section: url.pathname === location.pathname && url.hash ? document.getElementById(url.hash.slice(1)) : null };
  }).filter(item => item.section);

  const revealTargets = [...new Set([
    ...document.querySelectorAll('main h1, main h2, main h3, main h4, main p, main a, main img, main button, main li, main .tag, main .value-number, main .activity-icon, main .highlight-icon, main .value-card > span, main .node, main .section-kicker, main .panel-label, main .track-id, main .principles b, main .deliverable-grid article > span, main .social-card > span, main .social-card > strong, main .collab-link > span, main .video-wrap, main .poster-embed-wrap, main .testimonial-embed-wrap, main .wordle-board, main .game-status, main .resource-icon, header .brand, header nav a, header .nav-toggle, footer p, footer a, footer > span'),
    ...surfaces
  ])];

  const reveal = element => {
    element.classList.remove('motion-pending');
    element.dataset.motion = 'revealed';
    if (reduced.matches) return;
    const rect = element.getBoundingClientRect();
    const delay = clamp(rect.left / innerWidth, 0, 1) * 110;
    const options = { duration: 780, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' };
    if (/^H[12]$/.test(element.tagName)) {
      element.querySelectorAll('.motion-word').forEach((word, index) => {
        animate(word, [
          { opacity: 0, transform: 'translateY(.65em) rotate(2deg)', clipPath: 'inset(0 0 100% 0)' },
          { opacity: 1, transform: 'translateY(0) rotate(0)', clipPath: 'inset(-20% -10% -20% -10%)' }
        ], { ...options, duration: 1000, delay: delay + Math.min(index * 40, 340) });
      });
    } else if (element.classList.contains('motion-surface')) {
      const nested = element.parentElement.closest('.motion-surface') || element.querySelector('.motion-surface');
      animate(element, [{ opacity: .2, translate: nested ? '0 0' : '0 16px' }, { opacity: 1, translate: '0 0' }], options);
    } else if (element.matches('.section-label, .section-kicker, .track-id, .panel-label, .value-card > span')) {
      animate(element, [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { ...options, duration: 900 });
    } else if (element.tagName === 'IMG' || element.matches('.activity-icon, .highlight-icon, .node')) {
      animate(element, [{ opacity: 0, scale: '.9', rotate: '-6deg' }, { opacity: 1, scale: '1', rotate: '0deg' }], options);
    } else {
      animate(element, [{ opacity: 0, translate: element.closest('.motion-surface') ? '0 0' : '0 9px' }, { opacity: 1, translate: '0 0' }], options);
    }
  };

  if (!reduced.matches && 'IntersectionObserver' in window && Element.prototype.animate) {
    try {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: .025, rootMargin: '0px 0px -20px 0px' });
      revealTargets.forEach(element => {
        element.dataset.motion = 'pending';
        element.classList.add('motion-pending');
        observer.observe(element);
      });
    } catch {
      revealTargets.forEach(element => element.classList.remove('motion-pending'));
    }
  }
  // Keyboard navigation and browser history must never land on hidden content.
  document.addEventListener('focusin', event => {
    const section = event.target.closest('section, header, footer');
    section?.querySelectorAll('.motion-pending').forEach(element => {
      element.classList.remove('motion-pending');
      element.dataset.motion = 'revealed';
      observer?.unobserve(element);
    });
    event.target.getAnimations?.().forEach(animation => animation.finish());
  });
  addEventListener('pageshow', event => {
    if (event.persisted) revealTargets.forEach(element => element.classList.remove('motion-pending'));
    requestUpdate();
  });

  const inkSections = [...document.querySelectorAll('main > section')];
  const bgLayers = [...document.querySelectorAll('.hero-bg-shape')];
  const heroCard = document.querySelector('.hero-card');
  const heroLogo = document.querySelector('.hero-logo');
  const heroCopy = document.querySelector('.hero-content, .hero-copy');
  const grid = document.querySelector('.grid-field');
  const timelineRows = [...document.querySelectorAll('.timeline > li')];
  const update = () => {
    frame = 0;
    if (document.hidden) return;
    const progress = scrollY / Math.max(1, root.scrollHeight - innerHeight);
    root.style.setProperty('--scroll-progress', clamp(progress).toFixed(4));
    let current = sectionLinks[0];
    sectionLinks.forEach(item => { if (item.section.getBoundingClientRect().top <= innerHeight * .35) current = item; });
    navigation.forEach(link => {
      if (link === current?.link) link.setAttribute('aria-current', 'location');
      else if (!current && new URL(link.href).pathname === location.pathname && !new URL(link.href).hash) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (reduced.matches) return;
    stackGroups.forEach(group => {
      if (!group.classList.contains('stack-enabled')) return;
      const cards = [...group.children];
      cards.forEach((card, index) => {
        const next = cards[index + 1];
        const rect = card.getBoundingClientRect();
        const cover = next ? clamp((rect.bottom - next.getBoundingClientRect().top) / Math.max(1, rect.height)) : 0;
        card.style.setProperty('--stack-scale', (1 - cover * .026).toFixed(4));
        card.style.setProperty('--stack-light', (1 - cover * .035).toFixed(4));
      });
    });
    inkSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight) {
        section.style.setProperty('--ink-position', `${clamp((innerHeight - rect.top) / (innerHeight + rect.height)) * 100}%`);
      }
    });
    if (hero) {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom > -100 && rect.top < innerHeight) {
        const travel = clamp(-rect.top, -100, rect.height);
        const mobileFactor = finePointer.matches ? 1 : .45;
        bgLayers.forEach((layer, index) => {
          layer.style.setProperty('--layer-y', `${travel * (.14 + index * .06)}px`);
          layer.style.setProperty('--layer-rotate', `${travel * .025 * (index ? -1 : 1)}deg`);
        });
        if (heroCard) {
          heroCard.style.setProperty('--depth-x', `${pointerX * 6}px`);
          heroCard.style.setProperty('--depth-y', `${travel * .045 * mobileFactor + pointerY * 5}px`);
        }
        if (heroLogo) {
          heroLogo.style.setProperty('--depth-x', `${pointerX * 8}px`);
          heroLogo.style.setProperty('--depth-y', `${pointerY * 8}px`);
          heroLogo.style.setProperty('--logo-angle', `${pointerX * 2 + travel * .006}deg`);
        }
        if (heroCopy) heroCopy.style.setProperty('--depth-y', `${-travel * .018 * mobileFactor}px`);
        if (machine) {
          machine.style.setProperty('--orbit-angle', `${travel * .22 - 28}deg`);
          machine.style.setProperty('--core-angle', `${travel * .035}deg`);
          machine.style.setProperty('--depth-y', `${travel * .07 * mobileFactor}px`);
          machine.style.setProperty('--node-x', `${pointerX * 10}px`);
          machine.style.setProperty('--node-y', `${pointerY * 10}px`);
          machine.dispatchEvent(new CustomEvent('orbital-input', { detail: { scroll: travel, x: pointerX, y: pointerY } }));
        }
        moleculeHost?.dispatchEvent(new CustomEvent('orbital-input', { detail: { scroll: travel, x: pointerX, y: pointerY } }));
        if (grid) {
          grid.style.setProperty('--grid-y', `${travel * .16}px`);
          grid.style.setProperty('--field-x', `${50 + pointerX * 40}%`);
          grid.style.setProperty('--field-y', `${50 + pointerY * 40}%`);
        }
      }
    }
    timelineRows.forEach(row => {
      const rect = row.getBoundingClientRect();
      row.classList.toggle('is-current', rect.top > 85 && rect.top < innerHeight * .62);
    });
    if (activeSurface) {
      activeSurface.style.setProperty('--pointer-x', `${surfacePoint.x}px`);
      activeSurface.style.setProperty('--pointer-y', `${surfacePoint.y}px`);
      if (!activeSurface.classList.contains('stack-card')) {
        const x = surfacePoint.x / activeSurface.offsetWidth - .5;
        const y = surfacePoint.y / activeSurface.offsetHeight - .5;
        activeSurface.style.transform = `perspective(1200px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg) translateY(-2px)`;
      }
    }
    if (activeButton) activeButton.style.transform = `translate(${buttonPoint.x * .12}px, ${buttonPoint.y * .16}px)`;
  };
  function requestUpdate() { if (!frame) frame = requestAnimationFrame(update); }
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', () => { configureStacks(); requestUpdate(); }, { passive: true });
  document.fonts?.ready.then(() => { configureStacks(); requestUpdate(); });
  document.addEventListener('visibilitychange', requestUpdate);
  configureStacks();
  requestUpdate();

  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || reduced.matches || event.pointerType === 'touch') return;
    pointerX = event.clientX / innerWidth * 2 - 1;
    pointerY = event.clientY / innerHeight * 2 - 1;
    const surface = event.target.closest('.motion-surface');
    const button = event.target.closest('.button, .nav-cta');
    if (activeSurface && activeSurface !== surface) activeSurface.style.removeProperty('transform');
    if (activeButton && activeButton !== button) activeButton.style.removeProperty('transform');
    activeSurface = surface;
    activeButton = button;
    if (surface) {
      const rect = surface.getBoundingClientRect();
      surfacePoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    if (button) {
      const rect = button.getBoundingClientRect();
      buttonPoint = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
    }
    requestUpdate();
  }, { passive: true });
  document.addEventListener('pointerleave', () => {
    pointerX = pointerY = 0;
    activeSurface?.style.removeProperty('transform');
    activeButton?.style.removeProperty('transform');
    activeSurface = activeButton = null;
    requestUpdate();
  });

  let touchTimer, releaseTimer;
  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || reduced.matches) return;
    const surface = event.target.closest('.motion-surface');
    document.querySelectorAll('.touch-active').forEach(item => item.classList.remove('touch-active'));
    surface?.classList.add('touch-active');
    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => surface?.classList.remove('touch-active'), 1600);
    clearTimeout(releaseTimer);
    if (event.target.closest('.machine, .hero-logo-wrap')) {
      const rect = event.target.closest('.machine, .hero-logo-wrap').getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width * 2 - 1;
      pointerY = (event.clientY - rect.top) / rect.height * 2 - 1;
      requestUpdate();
    }
  }, { passive: true });
  document.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch') releaseTimer = setTimeout(() => { pointerX = pointerY = 0; requestUpdate(); }, 550);
  }, { passive: true });
  let sceneGeneration = 0;
  function mountScenes() {
    if (reduced.matches) return;
    const generation = ++sceneGeneration;
    const file = machine ? 'orbital.js?v=2' : moleculeHost ? 'sculptures.js?v=2' : null;
    if (!file) return;
    import(new URL(file, scriptURL).href).then(module => {
      if (reduced.matches || generation !== sceneGeneration) return;
      const cleanup = machine ? module.mountOrbital(machine, hero, reduced) : module.mountMolecules(moleculeHost, reduced);
      if (cleanup) cleanups.push(cleanup);
      requestUpdate();
    }).catch(() => { /* Original artwork remains available without WebGL. */ });
  }
  mountScenes();
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      observer?.disconnect();
      revealTargets.forEach(element => element.classList.remove('motion-pending'));
      animations.forEach(animation => animation.cancel());
      surfaces.forEach(element => element.style.removeProperty('transform'));
      activeButton?.style.removeProperty('transform');
      activeSurface = activeButton = null;
      sceneGeneration++;
      cleanups.splice(0).forEach(cleanup => cleanup());
    } else mountScenes();
    configureStacks(); requestUpdate();
  });
})();
