// lvs-globe.js — вариант C: чёрный шар + бирюзовые искры

(() => {
  const canvas = document.getElementById("lvs-globe-canvas");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });

  function resizeRenderer() {
    const { clientWidth, clientHeight } = canvas;
    const size = Math.min(clientWidth, clientHeight || clientWidth);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size, false);
  }

  resizeRenderer();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6);
  scene.add(camera);

  // чёрный шар — сама "Земля"
  const globeGeom = new THREE.SphereGeometry(2, 64, 64);
  const globeMat = new THREE.MeshStandardMaterial({
    color: 0x020204,
    roughness: 0.4,
    metalness: 0.2
  });
  const globe = new THREE.Mesh(globeGeom, globeMat);
  scene.add(globe);

  // бирюзовый ореол (немного glow)
  const glowGeom = new THREE.SphereGeometry(2.05, 64, 64);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x2fd3ff,
    transparent: true,
    opacity: 0.18
  });
  const glow = new THREE.Mesh(glowGeom, glowMat);
  scene.add(glow);

  // точки-искорки жизни по поверхности
  const starCount = 600;
  const starGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // случайная точка на сфере радиуса ~2
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = 2.02;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  starGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const starMat = new THREE.PointsMaterial({
    color: 0x48e0b0,
    size: 0.035,
    transparent: true,
    opacity: 0.95
  });

  const stars = new THREE.Points(starGeom, starMat);
  scene.add(stars);

  // освещение
  const light1 = new THREE.DirectionalLight(0xffffff, 1.0);
  light1.position.set(3, 2, 4);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0x48e09b, 0.6);
  light2.position.set(-4, -3, -2);
  scene.add(light2);

  const ambient = new THREE.AmbientLight(0x404060, 0.4);
  scene.add(ambient);

  // анимация
  let lastTime = 0;

  function animate(time) {
    requestAnimationFrame(animate);

    const t = time * 0.00005;
    const dt = time - lastTime;
    lastTime = time;

    globe.rotation.y = t * 0.75;
    stars.rotation.y = t * 0.9;
    glow.rotation.y = t * 0.6;

    renderer.render(scene, camera);
  }

  animate(0);

  // ресайз
  window.addEventListener("resize", () => {
    resizeRenderer();
  });

})();
