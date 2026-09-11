/* Small, on-demand STEM illustrations. No textures, WebGL, or idle render loop. */
export function mountEdgeDecorations() {
  const wide = matchMedia('(min-width: 1480px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const definitions = [
    ['#about', 'atom', 'molecule'],
    ['#what-we-do', 'dna', 'circuit'],
    ['#events', 'circuit', 'atom'],
    ['#team', 'molecule', 'dna'],
    ['#contact', 'atom', 'circuit'],
    ['#newsletter-archive', 'atom', 'dna'],
    ['#journal', 'dna', 'molecule'],
    ['#games', 'molecule', 'atom'],
    ['.hackathon-page #program', 'circuit', 'atom'],
    ['.hackathon-page #tracks', 'atom', 'circuit'],
    ['.hackathon-page #mentors', 'circuit', 'molecule'],
    ['.hackathon-page #deliverables', 'molecule', 'circuit']
  ];
  const styles = document.createElement('style');
  styles.textContent = `
    .stem-edge-host { position: relative; }
    .stem-edge { position: absolute; display: block; margin: 0; padding: 0; border: 0;
      background: transparent; color: inherit; border-radius: 50%; cursor: grab;
      aspect-ratio: 1; line-height: 0; -webkit-tap-highlight-color: transparent;
      perspective: 700px; z-index: 1; contain: layout style; }
    .stem-edge[hidden] { display: none; }
    .stem-edge:active { cursor: grabbing; }
    .stem-edge:disabled { cursor: default; }
    .stem-edge:focus-visible { outline: 2px solid #cf9273; outline-offset: 6px; }
    .stem-edge__tilt, .stem-edge__turn { display: block; width: 100%; height: 100%; }
    .stem-edge__tilt { transform: rotateX(var(--edge-x,0deg)) rotateY(var(--edge-y,0deg));
      transition: transform 180ms ease-out; }
    .stem-edge svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .hackathon-page .stem-edge { opacity: .76; }
    @media (max-width: 1479px), (hover: none), (pointer: coarse) { .stem-edge { display: none; } }
    @media (prefers-reduced-motion: reduce) { .stem-edge__tilt { transition: none; } }
  `;
  document.head.append(styles);
  let uid = 0;
  const sphere = (x, y, r, color, id) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}-${color})"/>`;
  const art = (kind, id) => {
    const ball = (x,y,r,color) => sphere(x,y,r,color,id);
    const bond = (x1,y1,x2,y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="url(#${id}-bond)" stroke-width="13" stroke-linecap="round"/>`;
    let shapes = '';
    if (kind === 'atom') {
      const ring = angle => `<g transform="rotate(${angle} 180 170)"><ellipse cx="180" cy="170" rx="139" ry="49" fill="none" stroke="url(#${id}-ring)" stroke-width="7"/><ellipse cx="180" cy="169" rx="138" ry="48" fill="none" stroke="#fff3d9" stroke-opacity=".6" stroke-width="1.3"/></g>`;
      shapes = `${ring(-17)}${ring(53)}${ball(180,170,27,'gold')}${ring(113)}${ball(66,207,17,'coral')}${ball(282,116,13,'coral')}${ball(248,273,16,'cream')}`;
    } else if (kind === 'molecule') {
      shapes = `<ellipse cx="225" cy="170" rx="133" ry="150" transform="rotate(23 225 170)" fill="none" stroke="#d8b45e" stroke-width=".9" opacity=".55"/>${bond(175,173,119,82)}${bond(175,173,268,141)}${bond(175,173,139,276)}${ball(119,82,36,'sage')}${ball(268,141,26,'coral')}${ball(175,173,31,'cream')}${ball(139,276,33,'sage')}${ball(286,279,15,'gold')}${ball(304,83,12,'sage')}`;
    } else if (kind === 'dna') {
      const strand = sign => Array.from({length:49},(_,i)=>{const y=42+i*5;return `${i?'L':'M'}${180+sign*Math.sin(i/48*Math.PI*2)*66} ${y}`;}).join('');
      const rungs = Array.from({length:11},(_,i)=>{const y=52+i*22,x=Math.sin((y-42)/240*Math.PI*2)*66;return `${bond(180-x,y,180+x,y)}${ball(180-x,y,7,'sage')}${ball(180+x,y,7,'coral')}`;}).join('');
      shapes = `<g transform="rotate(19 180 170)">${rungs}<path d="${strand(-1)}" fill="none" stroke="url(#${id}-ring)" stroke-width="9" stroke-linecap="round"/><path d="${strand(1)}" fill="none" stroke="#a4b496" stroke-width="9" stroke-linecap="round"/></g>`;
    } else {
      const traces = `<path d="M124 141H72V83H40M124 181H50M151 113V68H201V37M236 147H286V100H320M238 190H291V260H320M177 229V282H112V320" fill="none" stroke="#b2bba4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      const pins = Array.from({length:5},(_,i)=>{const p=140+i*19;return `<path d="M${p} 110v-16M${p} 235v16M119 ${p-15}h-16M240 ${p-15}h16" stroke="url(#${id}-bond)" stroke-width="7" stroke-linecap="round"/>`;}).join('');
      shapes = `<g transform="rotate(-13 180 170)">${traces}${pins}<rect x="119" y="112" width="121" height="123" rx="20" fill="#b88865"/><rect x="119" y="105" width="121" height="123" rx="20" fill="url(#${id}-cream)"/><rect x="136" y="122" width="87" height="88" rx="12" fill="url(#${id}-sage)"/><path d="m163 151-13 14 13 14m34-28 13 14-13 14m-21 8 10-36" stroke="#fcf7e7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${ball(40,83,9,'coral')}${ball(50,181,7,'gold')}${ball(201,37,8,'gold')}${ball(320,100,9,'sage')}${ball(320,260,9,'coral')}${ball(112,320,8,'sage')}</g>`;
    }
    const svg = `<svg viewBox="0 0 360 360" aria-hidden="true" focusable="false"><defs>
      <radialGradient id="${id}-coral" cx="28%" cy="23%" r="78%"><stop stop-color="#ffd3ad"/><stop offset=".43" stop-color="#d98a68"/><stop offset=".82" stop-color="#b95035"/><stop offset="1" stop-color="#d88060"/></radialGradient>
      <radialGradient id="${id}-sage" cx="28%" cy="22%" r="80%"><stop stop-color="#e7ecd9"/><stop offset=".42" stop-color="#b3c09f"/><stop offset=".84" stop-color="#81916d"/><stop offset="1" stop-color="#a7b395"/></radialGradient>
      <radialGradient id="${id}-gold" cx="28%" cy="23%" r="78%"><stop stop-color="#fff7d0"/><stop offset=".45" stop-color="#f4da87"/><stop offset=".85" stop-color="#d5b85e"/><stop offset="1" stop-color="#e5cc83"/></radialGradient>
      <radialGradient id="${id}-cream" cx="27%" cy="20%" r="85%"><stop stop-color="#fffdf1"/><stop offset=".45" stop-color="#f0e9d5"/><stop offset=".83" stop-color="#c7b998"/><stop offset="1" stop-color="#e4d9bc"/></radialGradient>
      <linearGradient id="${id}-ring" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8d5ae"/><stop offset=".33" stop-color="#cf8661"/><stop offset=".58" stop-color="#b65439"/><stop offset=".8" stop-color="#edb087"/><stop offset="1" stop-color="#ffe1ba"/></linearGradient>
      <linearGradient id="${id}-bond" gradientUnits="userSpaceOnUse" x1="80" x2="280"><stop stop-color="#c7b99b"/><stop offset=".4" stop-color="#f9f3df"/><stop offset=".65" stop-color="#e9dec4"/><stop offset="1" stop-color="#b6aa8c"/></linearGradient>
    </defs>${shapes}</svg>`;
    // Keep the hackathon's existing cyan, acid and coral palette.
    if (!document.body.classList.contains('hackathon-page')) return svg;
    const colors = { '#b3c09f':'#4cf4dc', '#81916d':'#1e7d70', '#a7b395':'#60ad99',
      '#f4da87':'#d8ff37', '#d5b85e':'#8ca629', '#e5cc83':'#bdce70',
      '#d98a68':'#ff705c', '#b95035':'#a43e36', '#b2bba4':'#4cf4dc' };
    return svg.replace(/#[a-f0-9]{6}/g, color => colors[color] || color);
  };

  const items = [];
  const cancel = item => {
    if (item.frame) cancelAnimationFrame(item.frame);
    item.frame = 0;
    item.animation?.cancel();
    item.animation = null;
    item.button.style.removeProperty('--edge-x');
    item.button.style.removeProperty('--edge-y');
  };
  const layout = item => {
    const { section, button, side } = item;
    const rect = section.getBoundingClientRect();
    const content = [...section.children].filter(child => child.matches('.container'));
    const boxes = content.map(child => child.getBoundingClientRect());
    // Full-width pages use their existing container. Hackathon margins sit
    // outside its bounded sections. Never borrow space from the content itself.
    const left = boxes.length ? Math.min(...boxes.map(r => r.left)) : rect.left;
    const right = boxes.length ? Math.max(...boxes.map(r => r.right)) : rect.right;
    const viewport = document.documentElement.clientWidth;
    const space = side === 0 ? left : viewport - right;
    const size = Math.min(330, space - 64);
    button.hidden = !wide.matches || size < 150;
    if (button.hidden) { cancel(item); return; }
    const x = side === 0 ? (space - size) / 2 : right + (space - size) / 2;
    button.style.width = `${size}px`;
    button.style.left = `${x - rect.left}px`;
    button.style.top = `${Math.max(32,Math.min(side ? 210 : 115,rect.height-size-40))}px`;
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const item = items.find(item => item.button === entry.target);
      item.visible = entry.isIntersecting;
      if (entry.isIntersecting && !item.button.firstChild) {
        item.button.innerHTML = `<span class="stem-edge__tilt"><span class="stem-edge__turn">${art(item.kind,`stem-edge-${uid++}`)}</span></span>`;
      } else if (!entry.isIntersecting) cancel(item);
    }
  }, { rootMargin: '100px 0px' });
  for (const [selector,...kinds] of definitions) {
    const section = document.querySelector(selector);
    if (!section || section.matches('.hero') || section.querySelector('.world-observatory')) continue;
    section.classList.add('stem-edge-host');
    kinds.forEach((kind,side) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = reduced.matches;
      button.className = 'stem-edge';
      button.setAttribute('aria-label',`Rotate ${kind === 'dna' ? 'DNA helix' : kind} decoration`);
      const item = { section, button, kind, side, visible: false, frame: 0, animation: null };
      items.push(item);
      section.append(button);
      layout(item);
      observer.observe(button);
      button.addEventListener('pointermove', event => {
        if (reduced.matches || !item.visible || document.hidden) return;
        item.point = { x:event.clientX, y:event.clientY };
        // One update per input frame; no loop runs while the pointer is idle.
        if (!item.frame) item.frame = requestAnimationFrame(() => {
          item.frame = 0;
          const bounds = button.getBoundingClientRect();
          button.style.setProperty('--edge-x',`${-((item.point.y-bounds.top)/bounds.height-.5)*22}deg`);
          button.style.setProperty('--edge-y',`${((item.point.x-bounds.left)/bounds.width-.5)*26}deg`);
        });
      }, { passive:true });
      button.addEventListener('pointerleave', () => {
        if (item.frame) cancelAnimationFrame(item.frame);
        item.frame = 0;
        button.style.removeProperty('--edge-x'); button.style.removeProperty('--edge-y');
      });
      button.addEventListener('click', () => {
        const turn = button.querySelector('.stem-edge__turn');
        if (!turn || reduced.matches || !item.visible) return;
        item.animation?.cancel();
        const animation = item.animation = turn.animate([
          { transform:'rotate(0deg) scale(1)' },
          { transform:'rotate(180deg) scale(1.045)', offset:.5 },
          { transform:'rotate(360deg) scale(1)' }
        ], { duration:1400, easing:'cubic-bezier(.4,0,.2,1)' });
        animation.finished.catch(() => {}).finally(() => { if (item.animation === animation) item.animation = null; });
      });
    });
  }
  let resizeFrame = 0;
  addEventListener('resize', () => {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; items.forEach(layout); });
  }, { passive:true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) items.forEach(cancel); });
  reduced.addEventListener('change', () => {
    items.forEach(item => { item.button.disabled = reduced.matches; if (reduced.matches) cancel(item); });
  });
}
