// One self-contained, cacheable download serves each independent 3D canvas.
// Select a handler once so a globe never initializes the other scenes.
import { createObservatoryHandler } from './observatory-worker.js';
import { createSceneHandler } from './scene-worker.js';

let handle;
self.addEventListener('message', event => {
  if (!handle) {
    if (event.data.type !== 'init') return;
    if (!event.data.kind) handle = createObservatoryHandler();
    else if (['molecules', 'orbital'].includes(event.data.kind)) handle = createSceneHandler();
    else { self.postMessage({ type: 'unavailable' }); return; }
  }
  handle(event);
});
