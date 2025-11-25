// assets/space/space.js — полноэкранная Земля: зум колесом, как в Google Earth

(function () {
    const canvas  = document.getElementById("lvs-space-canvas");
    const tooltip = document.getElementById("lvs-space-tooltip");
    const backBtn = document.getElementById("space-back-btn");

    if (!canvas || typeof THREE === "undefined") return;

    // ----- SCENE / RENDERER -----
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    if (THREE.sRGBEncoding) {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }

    const INIT_DIST = 3.2;
    const MIN_DIST  = 1.6;
    const MAX_DIST  = 7.0;

    const camera = new THREE.PerspectiveCamera(
        35,
        1,
        0.1,
        100
    );
    camera.position.set(0, 0, INIT_DIST);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(3, 2, 2);
    scene.add(dirLight);

    // ----- EARTH -----
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const RADIUS   = 1.0;
    const SEGMENTS = 128;

    const sphereGeo = new THREE.SphereGeometry(RADIUS, SEGMENTS, SEGMENTS);

    const texLoader = new THREE.TextureLoader();
    const earthTexture = texLoader.load(
        "https://raw.githubusercontent.com/jscastro76/threebox/master/docs/img/earthmap4k.jpg"
    );
    if (THREE.sRGBEncoding) {
        earthTexture.encoding = THREE.sRGBEncoding;
    }

    const earthMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 14,
        specular: new THREE.Color(0x444444),
    });

    const earthMesh = new THREE.Mesh(sphereGeo, earthMat);
    globeGroup.add(earthMesh);

    // atmosphere glow
    const atmGeo = new THREE.SphereGeometry(RADIUS * 1.03, SEGMENTS, SEGMENTS);
    const atmMat = new THREE.MeshBasicMaterial({
        color: 0x3ea6ff,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    globeGroup.add(atmosphere);

    // small lights on surface
    const sparksGeo = new THREE.BufferGeometry();
    const sparksCount = 500;
    const positions = new Float32Array(sparksCount * 3);

    for (let i = 0; i < sparksCount; i++) {
        const u = Math.random() * 2 * Math.PI;
        const v = Math.random() * Math.PI;

        const r = RADIUS * 1.02;
        const x = r * Math.cos(u) * Math.sin(v);
        const y = r * Math.sin(u) * Math.sin(v);
        const z = r * Math.c*
