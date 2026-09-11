import * as THREE from './assets/vendor/three.module.min.js';
import { createStage } from './observatory-stage.js?v=3';
import { createStudents } from './globe-students.js?v=3';

export async function mountObservatory(host, reduced, signal) {
  // Decoded, pre-baked textures avoid parsing geography and painting canvases during startup.
  const loadImage = async name => {
    const response = await fetch(new URL(name, host.assetBase || new URL('./assets/models/', import.meta.url)), { signal });
    if (!response.ok) throw new Error('Globe texture unavailable');
    const blob = await response.blob();
    return createImageBitmap(blob, { imageOrientation: 'flipY' });
  };
  const images = await Promise.allSettled([loadImage('earth-color.webp'), loadImage('earth-relief.webp')]);
  if (signal.aborted || !host.isConnected || images.some(image => image.status === 'rejected')) {
    images.forEach(image => { if (image.status === 'fulfilled') image.value.close(); });
    return;
  }
  const stage = createStage(host, 'observatory-canvas', reduced);
  if (!stage) { images.forEach(image => image.value.close()); return; }
  const { scene, camera, renderer } = stage;
  // One CSS pixel per drawing pixel is ample here; avoid a multi-megapixel retina canvas.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  scene.add(new THREE.HemisphereLight(0xfff4dd, 0x766954, 1.25));
  const keyLight = new THREE.DirectionalLight(0xfff3d9, 1.55);
  keyLight.position.set(-4, 6, 7); scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xfff5e4, .65);
  fillLight.position.set(4, -1, 5); scene.add(fillLight);
  const textures = [];
  const texture = (image, color = true) => {
    const map = image instanceof ImageBitmap ? new THREE.Texture(image) : new THREE.CanvasTexture(image);
    map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.anisotropy = 2; map.needsUpdate = true;
    textures.push(map); return map;
  };

  const model = new THREE.Group(); scene.add(model);
  const material = (color, metalness = 0, roughness = .55) => new THREE.MeshPhongMaterial({ color, specular: new THREE.Color(color).lerp(new THREE.Color(0xffffff), .45), shininess: 8 + (1 - roughness) * 48 });
  const ivory = material(0xeee0c5, .08, .6);
  const red = material(0x8a251c, .55, .4);
  const gold = material(0xd1ba8d, .7, .4);
  const green = material(0x008f4b, .15, .34);
  const nodeRed = material(0xb71016, .28, .28);
  const panel = material(0x172e25, .4, .48);
  const mesh = (geometry, surface, parent = model, position) => {
    const object = new THREE.Mesh(geometry, surface);
    if (position) object.position.set(...position);
    parent.add(object); return object;
  };
  function cylinder(radiusTop, radiusBottom, height, surface, y) {
    return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 64), surface, model, [0, y, 0]);
  }
  // Low, layered ivory plinth and a deep red meridian, proportioned to the concept image.
  cylinder(1.08, 1.09, .10, red, -2.07);
  cylinder(1.055, 1.075, .055, ivory, -1.992);
  cylinder(1.025, 1.025, .085, ivory, -1.925);
  cylinder(.96, .99, .075, ivory, -1.845);
  [1.052, 1.022, .965].forEach((radius, index) => {
    const ring = mesh(new THREE.TorusGeometry(radius, .008, 5, 64), gold, model, [0, -1.97 + index * .075, 0]); ring.rotation.x = Math.PI / 2;
  });
  cylinder(.16, .2, .12, gold, -1.745);
  cylinder(.12, .15, .22, red, -1.60);

  const cradle = new THREE.Group(); cradle.position.set(.06, .35, 0); cradle.rotation.z = .20; model.add(cradle);
  const annulus = (inner, outer, depth, half = false) => {
    const shape = new THREE.Shape();
    if (half) {
      shape.absarc(0, 0, outer, Math.PI / 2, Math.PI * 1.5, false);
      shape.absarc(0, 0, inner, Math.PI * 1.5, Math.PI / 2, true);
      shape.closePath();
    } else {
      shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
      const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, bevelSize: .006, bevelThickness: .006, steps: 1, curveSegments: 48 });
    geometry.translate(0, 0, -depth / 2); return geometry;
  };
  const meridian = mesh(annulus(1.76, 1.91, .105, true), red, cradle);
  meridian.rotation.y = .55;
  const meridianTrim = mesh(annulus(1.76, 1.772, .111, true), gold, cradle); meridianTrim.rotation.y = .55;
  [-1, 1].forEach(sign => {
    mesh(new THREE.CylinderGeometry(.13, .13, .18, 20), red, cradle, [0, sign * 1.75, 0]);
    mesh(new THREE.CylinderGeometry(.105, .105, .04, 20), gold, cradle, [0, sign * 1.86, 0]);
    mesh(new THREE.SphereGeometry(.075, 14, 10), gold, cradle, [0, sign * 1.96, 0]);
  });
  const equator = mesh(annulus(1.77, 1.96, .048), gold, cradle, [0, -.10, 0]);
  equator.rotation.x = Math.PI / 2;
  const ticks = [];
  for (let i = 0; i < 144; i++) {
    const angle = i / 144 * Math.PI * 2;
    [i % 4 ? 1.923 : 1.867, 1.949].forEach(radius => ticks.push(new THREE.Vector3(Math.cos(angle) * radius, -.07, Math.sin(angle) * radius)));
  }
  cradle.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: 0x6d4f2c, transparent: true, opacity: .62 })));

  const earthSystem = new THREE.Group(); cradle.add(earthSystem);
  const earthMaterial = material(0xffffff, 0, .95);
  earthMaterial.specular.setHex(0x242019);
  earthMaterial.map = texture(images[0].value);
  earthMaterial.bumpMap = texture(images[1].value, false);
  earthMaterial.bumpScale = .012;
  mesh(new THREE.SphereGeometry(1.63, 64, 40), earthMaterial, earthSystem);
  const coordinate = (latitude, longitude, radius = 1.65) => {
    const lat = THREE.MathUtils.degToRad(latitude), lon = THREE.MathUtils.degToRad(longitude);
    return new THREE.Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon));
  };
  // Illustrative learning connections; these do not represent claimed chapter locations.
  const locations = [[40.7,-74], [51.5,-.12], [28.6,77.2], [-1.3,36.8], [-23.5,-46.6], [35.7,139.7], [-33.9,151.2]];
  const points = locations.map((location, index) => {
    const point = coordinate(...location);
    const node = mesh(new THREE.SphereGeometry(.037, 10, 8), index % 2 ? green : nodeRed, earthSystem); node.position.copy(point);
    return point;
  });
  const animateStudents = createStudents(earthSystem, locations, coordinate);
  [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6]].forEach(([a,b]) => {
    const angle = points[a].angleTo(points[b]);
    const arc = Array.from({length:33}, (_, i) => {
      const t = i / 32;
      const point = points[a].clone().multiplyScalar(Math.sin((1-t)*angle)).addScaledVector(points[b],Math.sin(t*angle)).normalize();
      return point.multiplyScalar(1.65 + Math.sin(t*Math.PI)*.25);
    });
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc),32,.006,4,false),gold,earthSystem);
  });

  const orbital = new THREE.Group(); orbital.rotation.set(.25,.45,-.25); cradle.add(orbital);
  const orbitRadius = 2.16;
  mesh(new THREE.TorusGeometry(orbitRadius,.005,4,96),gold,orbital);
  const satellite = new THREE.Group(); satellite.scale.setScalar(1.18); orbital.add(satellite);
  mesh(new THREE.BoxGeometry(.15,.19,.13),ivory,satellite);
  const shell = mesh(new THREE.CylinderGeometry(.077,.077,.17,20),gold,satellite); shell.rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(.64,.018,.018),gold,satellite,[0,0,-.035]);
  [-1,1].forEach(sign => {
    mesh(new THREE.BoxGeometry(.23,.15,.018),panel,satellite,[sign*.24,0,-.035]);
    const cellLines=[];
    for(let i=0;i<=3;i++){
      const x=sign*.24-.115+i*.23/3;
      cellLines.push(new THREE.Vector3(x,-.075,-.021),new THREE.Vector3(x,.075,-.021));
    }
    for(let i=0;i<=2;i++){
      const y=-.075+i*.075;
      cellLines.push(new THREE.Vector3(sign*.24-.115,y,-.021),new THREE.Vector3(sign*.24+.115,y,-.021));
    }
    satellite.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cellLines),new THREE.LineBasicMaterial({color:0xd6af61})));
  });
  const dish = mesh(new THREE.ConeGeometry(.075,.04,24,1,true),gold,satellite,[0,.15,0]); dish.rotation.x = .45;

  // Soft contact shadow generated procedurally; no image downloads or live services.
  const shadowCanvas = new OffscreenCanvas(256, 256);
  const shadowContext=shadowCanvas.getContext('2d');
  const shade=shadowContext.createRadialGradient(128,128,14,128,128,128);
  shade.addColorStop(0,'rgba(63,35,17,.24)'); shade.addColorStop(.5,'rgba(63,35,17,.09)'); shade.addColorStop(1,'rgba(63,35,17,0)');
  shadowContext.fillStyle=shade; shadowContext.fillRect(0,0,256,256);
  const shadow=mesh(new THREE.PlaneGeometry(4.7,3.5),new THREE.MeshBasicMaterial({map:texture(shadowCanvas),transparent:true,depthWrite:false}),model,[0,-2.127,0]);
  shadow.rotation.x=-Math.PI/2;

  let dragging=false,lastX=0,lastY=0,yaw=0,pitch=0,aimX=0,aimY=0,focused=false;
  const initialYaw=THREE.MathUtils.degToRad(-67);
  const setInput=event=>{
    const bounds=host.getBoundingClientRect();
    aimX=(event.clientX-bounds.left)/bounds.width*2-1;
    aimY=(event.clientY-bounds.top)/bounds.height*2-1;
    if(dragging){yaw+=(event.clientX-lastX)*.005;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-lastY)*.002,-.2,.2);}
    lastX=event.clientX;lastY=event.clientY;
    if(reduced.matches) renderStill();
  };
  const down=event=>{if(event.button!==0)return;dragging=true;lastX=event.clientX;lastY=event.clientY;host.setPointerCapture(event.pointerId);};
  const up=()=>{dragging=false;};
  const leave=()=>{if(!dragging)aimX=aimY=0;};
  const focus=()=>{focused=true;}; const blur=()=>{focused=false;};
  const key=event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home')yaw=pitch=0;
    else if(event.key==='ArrowLeft')yaw-=.12;
    else if(event.key==='ArrowRight')yaw+=.12;
    else pitch=THREE.MathUtils.clamp(pitch+(event.key==='ArrowUp'?-.04:.04),-.2,.2);
    if(reduced.matches)renderStill();
  };
  const listeners={pointerdown:down,pointermove:setInput,pointerup:up,pointercancel:up,pointerleave:leave,focus,blur,keydown:key};
  Object.entries(listeners).forEach(([event,fn])=>host.addEventListener(event,fn));
  let spin=0;
  stage.draw=({elapsed,dt})=>{
    if(!dragging&&!focused&&!reduced.matches)spin+=dt*.021;
    animateStudents(reduced.matches ? 0 : elapsed);
    earthSystem.rotation.y=initialYaw+yaw+spin;
    model.rotation.y+=(aimX*.07-model.rotation.y)*.08;
    cradle.rotation.x=pitch-aimY*.025;
    const angle=.82+(reduced.matches?0:Math.sin(elapsed*.075)*.16);
    satellite.position.set(Math.cos(angle)*orbitRadius,Math.sin(angle)*orbitRadius,0);
    satellite.rotation.z=angle-.4;
    // A small scroll response keeps the stationary instrument grounded in its existing space.
    model.rotation.z=THREE.MathUtils.clamp(host.scrollY*.000035,0,.035);
  };
  function renderStill(){stage.draw({elapsed:0,dt:0});stage.renderOnce();}
  stage.resize=()=>{
    const distance=Math.max(2.7,2.8/camera.aspect)/Math.tan(THREE.MathUtils.degToRad(18));
    camera.fov=36;camera.position.set(0,.8,distance);camera.lookAt(0,.02,0);camera.updateProjectionMatrix();
    renderStill();
  };
  stage.resize();
  stage.onDispose(()=>{
    Object.entries(listeners).forEach(([event,fn])=>host.removeEventListener(event,fn));
    earthSystem.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
    textures.forEach(map=>map.dispose());
    images.forEach(image=>image.value.close());
  });
  await stage.start();
  if (signal.aborted || !host.isConnected) { stage.dispose(); return; }
  return stage.dispose;
}
