import * as THREE from './assets/vendor/three.module.min.js';
import { createStage, lighting } from './three-stage.js';

export async function mountObservatory(host, reduced, signal) {
  const response = await fetch(new URL('./assets/models/earth-land.json', import.meta.url), { signal });
  if (!response.ok) throw new Error('Globe map unavailable');
  const data = await response.json();
  if (signal.aborted || !host.isConnected) return;
  const stage = createStage(host, 'observatory-canvas', reduced);
  if (!stage) return;
  const { scene, camera, renderer } = stage;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  lighting(scene);
  const textures = [];
  const texture = canvas => {
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    textures.push(map); return map;
  };

  // A small studio environment gives the satin metals broad, soft reflections.
  const studio = document.createElement('canvas'); studio.width = 512; studio.height = 256;
  const studioContext = studio.getContext('2d');
  const gradient = studioContext.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#fffdf5'); gradient.addColorStop(.42, '#eeebe0');
  gradient.addColorStop(.58, '#aba697'); gradient.addColorStop(1, '#f4e9d3');
  studioContext.fillStyle = gradient; studioContext.fillRect(0, 0, 512, 256);
  studioContext.fillStyle = '#ffffff'; studioContext.fillRect(55, 24, 92, 170);
  studioContext.fillStyle = '#8a8276'; studioContext.fillRect(335, 90, 46, 118);
  scene.environment = texture(studio);
  scene.environment.mapping = THREE.EquirectangularReflectionMapping;
  scene.environmentIntensity = .6;

  const model = new THREE.Group(); scene.add(model);
  const material = (color, metalness = 0, roughness = .55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const ivory = material(0xfff3da, .08, .42);
  const red = material(0x940d13, .55, .32);
  const gold = material(0xd6af61, .7, .33);
  const green = material(0x008f4b, .15, .34);
  const nodeRed = material(0xb71016, .28, .28);
  const panel = material(0x172e25, .4, .48);
  const mesh = (geometry, surface, parent = model, position) => {
    const object = new THREE.Mesh(geometry, surface);
    if (position) object.position.set(...position);
    parent.add(object); return object;
  };
  function cylinder(radiusTop, radiusBottom, height, surface, y) {
    return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 96), surface, model, [0, y, 0]);
  }
  // Turned pedestal with concentric grooves and a red lower edge.
  cylinder(1.1, 1.15, .15, red, -2.16);
  cylinder(1.13, 1.13, .08, ivory, -2.05);
  cylinder(1.06, 1.1, .1, ivory, -1.96);
  cylinder(.97, 1.04, .15, ivory, -1.84);
  [1.105, 1.045, .975].forEach((radius, index) => {
    const ring = mesh(new THREE.TorusGeometry(radius, .009, 6, 96), gold, model, [0, -2.025 + index * .1, 0]); ring.rotation.x = Math.PI / 2;
  });
  cylinder(.17, .2, .21, gold, -1.68);
  cylinder(.115, .14, .21, red, -1.49);

  const cradle = new THREE.Group(); cradle.position.y = .35; cradle.rotation.z = -.26; model.add(cradle);
  // A solid annular band, including its narrow edge, instead of a wireframe circle.
  const annulus = (inner, outer, depth) => {
    const shape = new THREE.Shape(); shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: .008, bevelThickness: .008, steps: 1, curveSegments: 96 });
    geometry.translate(0, 0, -depth / 2); return geometry;
  };
  const meridian = mesh(annulus(1.76, 1.86, .085), red, cradle);
  meridian.rotation.y = -.22;
  [-1, 1].forEach(sign => {
    mesh(new THREE.CylinderGeometry(.12, .12, .17, 32), gold, cradle, [0, sign * 1.74, 0]);
    mesh(new THREE.SphereGeometry(.08, 20, 12), gold, cradle, [0, sign * 1.94, 0]);
  });
  const equator = mesh(annulus(1.96, 2.015, .035), gold, cradle);
  equator.rotation.x = Math.PI / 2;
  const ticks = [];
  for (let i = 0; i < 180; i++) {
    const angle = i / 180 * Math.PI * 2;
    [i % 5 ? 1.991 : 1.972, 2.007].forEach(radius => ticks.push(new THREE.Vector3(Math.cos(angle) * radius, .024, Math.sin(angle) * radius)));
  }
  cradle.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: 0x775326, transparent: true, opacity: .7 })));

  // Equirectangular geography and raised coastline shading are generated from public-domain land polygons.
  const mapCanvas = document.createElement('canvas'); mapCanvas.width = 2048; mapCanvas.height = 1024;
  const mapContext = mapCanvas.getContext('2d');
  mapContext.fillStyle = '#fff3da'; mapContext.fillRect(0, 0, 2048, 1024);
  const reliefCanvas = document.createElement('canvas'); reliefCanvas.width = 2048; reliefCanvas.height = 1024;
  const relief = reliefCanvas.getContext('2d'); relief.fillStyle = '#777777'; relief.fillRect(0, 0, 2048, 1024);
  function landPath(context, polygon) {
    context.beginPath();
    polygon.forEach(ring => {
      ring.forEach(([longitude, latitude], index) => {
        const x = (longitude + 180) / 360 * 2048, y = (90 - latitude) / 180 * 1024;
        if (index) context.lineTo(x, y); else context.moveTo(x, y);
      });
      context.closePath();
    });
  }
  data.polygons.forEach(polygon => {
    landPath(mapContext, polygon); mapContext.fillStyle = '#649568'; mapContext.fill('evenodd');
    mapContext.strokeStyle = '#4f7951'; mapContext.lineWidth = 1.1; mapContext.stroke();
    landPath(relief, polygon); relief.fillStyle = '#a7a7a7'; relief.fill('evenodd');
  });
  mapContext.strokeStyle = 'rgba(124,103,66,.25)'; mapContext.lineWidth = .65;
  for (let longitude = -180; longitude < 180; longitude += 15) {
    const x = (longitude + 180) / 360 * 2048;
    mapContext.beginPath(); mapContext.moveTo(x, 0); mapContext.lineTo(x, 1024); mapContext.stroke();
  }
  for (let latitude = -75; latitude <= 75; latitude += 15) {
    const y = (90 - latitude) / 180 * 1024;
    mapContext.beginPath(); mapContext.moveTo(0, y); mapContext.lineTo(2048, y); mapContext.stroke();
  }
  const earthSystem = new THREE.Group(); cradle.add(earthSystem);
  const earthMaterial = material(0xffffff, .03, .68);
  earthMaterial.map = texture(mapCanvas);
  earthMaterial.bumpMap = texture(reliefCanvas); earthMaterial.bumpMap.colorSpace = THREE.NoColorSpace;
  earthMaterial.bumpScale = .032;
  mesh(new THREE.SphereGeometry(1.63, 96, 64), earthMaterial, earthSystem);
  const coordinate = (latitude, longitude, radius = 1.65) => {
    const lat = THREE.MathUtils.degToRad(latitude), lon = THREE.MathUtils.degToRad(longitude);
    return new THREE.Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon));
  };
  // Illustrative learning connections; these do not represent claimed chapter locations.
  const locations = [[40.7,-74], [51.5,-.12], [28.6,77.2], [-1.3,36.8], [-23.5,-46.6], [35.7,139.7], [-33.9,151.2]];
  const points = locations.map((location, index) => {
    const point = coordinate(...location);
    const node = mesh(new THREE.SphereGeometry(.048, 18, 12), index % 2 ? green : nodeRed, earthSystem); node.position.copy(point);
    return point;
  });
  [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6]].forEach(([a,b]) => {
    const angle = points[a].angleTo(points[b]);
    const arc = Array.from({length:49}, (_, i) => {
      const t = i / 48;
      const point = points[a].clone().multiplyScalar(Math.sin((1-t)*angle)).addScaledVector(points[b],Math.sin(t*angle)).normalize();
      return point.multiplyScalar(1.65 + Math.sin(t*Math.PI)*.25);
    });
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc),48,.008,5,false),gold,earthSystem);
  });

  const orbital = new THREE.Group(); orbital.rotation.set(.8,.1,-.35); cradle.add(orbital);
  const orbitRadius = 2.18;
  mesh(new THREE.TorusGeometry(orbitRadius,.007,5,160),gold,orbital);
  const satellite = new THREE.Group(); orbital.add(satellite);
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
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width=256; shadowCanvas.height=256;
  const shadowContext=shadowCanvas.getContext('2d');
  const shade=shadowContext.createRadialGradient(128,128,14,128,128,128);
  shade.addColorStop(0,'rgba(63,35,17,.24)'); shade.addColorStop(.5,'rgba(63,35,17,.09)'); shade.addColorStop(1,'rgba(63,35,17,0)');
  shadowContext.fillStyle=shade; shadowContext.fillRect(0,0,256,256);
  const shadow=mesh(new THREE.PlaneGeometry(4.7,3.5),new THREE.MeshBasicMaterial({map:texture(shadowCanvas),transparent:true,depthWrite:false}),model,[0,-2.247,0]);
  shadow.rotation.x=-Math.PI/2;

  let dragging=false,lastX=0,lastY=0,yaw=0,pitch=0,aimX=0,aimY=0,focused=false;
  const initialYaw=THREE.MathUtils.degToRad(-66);
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
    if(!dragging&&!focused&&!reduced.matches)spin+=dt*.032;
    earthSystem.rotation.y=initialYaw+yaw+spin;
    model.rotation.y+=(aimX*.07-model.rotation.y)*.08;
    cradle.rotation.x=pitch-aimY*.025;
    const angle=.72+(reduced.matches?0:elapsed*.055);
    satellite.position.set(Math.cos(angle)*orbitRadius,Math.sin(angle)*orbitRadius,0);
    satellite.rotation.z=angle-.4;
    // A small scroll response keeps the stationary instrument grounded in its existing space.
    model.rotation.z=THREE.MathUtils.clamp(window.scrollY*.000035,0,.035);
  };
  function renderStill(){stage.draw({elapsed:0,dt:0});renderer.render(scene,camera);}
  stage.resize=()=>{
    const distance=Math.max(2.85,2.66/camera.aspect)/Math.tan(THREE.MathUtils.degToRad(18));
    camera.fov=36;camera.position.set(0,.9,distance);camera.lookAt(0,-.08,0);camera.updateProjectionMatrix();
    renderStill();
  };
  stage.resize();
  stage.onDispose(()=>{
    Object.entries(listeners).forEach(([event,fn])=>host.removeEventListener(event,fn));
    textures.forEach(map=>map.dispose());
  });
  return stage.dispose;
}
