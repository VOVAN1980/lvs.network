// lvs-globe.js — простой 3D-глобус Земли

(function () {
    const canvas = document.getElementById("lvs-globe-canvas");
    if (!canvas || typeof THREE === "undefined") return;

    // ---------- БАЗА СЦЕНЫ ----------
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const camera = new THREE.PerspectiveCamera(
        35,
        1,          // временно, дальше пересчитаем
        0.1,
        100
    );
    camera.position.set(0, 0, 3.2);

    // Мягкий свет
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(3, 2, 2);
    scene.add(dirLight);

    // ---------- ГЛОБУС ЗЕМЛИ ----------
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const radius = 1.0;
    const segments = 64;

    const sphereGeo = new THREE.SphereGeometry(radius, segments, segments);

    // Текстура Земли — КЛЮЧЕВОЕ МЕСТО
    // Положи картинку (например 2048x1024) в:
    //   lvs-site/assets/space/earth-map.jpg
    // и пути ниже трогать не надо.
    const texLoader = new THREE.TextureLoader();
    const earthTexture = texLoader.load("assets/space/earth-map.jpg");

    const earthMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 8,
        specular: new THREE.Color(0x333333),
    });

    const earthMesh = new THREE.Mesh(sphereGeo, earthMat);
    globeGroup.add(earthMesh);

    // ---------- МАЛЕНЬКИЕ "ИСКРЫ ЖИЗНИ" ----------
    const sparksGeo = new THREE.BufferGeometry();
    const sparksCount = 350;
    const positions = new Float32Array(sparksCount * 3);

    for (let i = 0; i < sparksCount; i++) {
        // случайная точка на сфере, чуть выше поверхности
        const u = Math.random() * 2 * Math.PI;
        const v = Math.random() * Math.PI;

        const r = radius * 1.01;
        const x = r * Math.cos(u) * Math.sin(v);
        const y = r * Math.sin(u) * Math.sin(v);
        const z = r * Math.cos(v);

        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }

    sparksGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const sparksMat = new THREE.PointsMaterial({
        color: 0x38e0ff,
        size: 0.012,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
    });

    const sparks = new THREE.Points(sparksGeo, sparksMat);
    globeGroup.add(sparks);

    // ---------- РОТАЦИЯ МЫШКОЙ ----------
    let isDragging = false;
    let prevX = 0;
    let rotationY = 0;
    let targetRotY = 0;

    function onPointerDown(e) {
        isDragging = true;
        prevX = e.clientX || e.touches?.[0]?.clientX || 0;
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const dx = clientX - prevX;
        prevX = clientX;

        const rotSpeed = 0.005;
        targetRotY += dx * rotSpeed;
    }

    function onPointerUp() {
        isDragging = false;
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    // ---------- РЕСАЙЗ ----------
    function resize() {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height || rect.width;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    // ---------- АНИМАЦИЯ ----------
    function animate() {
        requestAnimationFrame(animate);

        // авто-вращение + плавное довороты от мыши
        targetRotY += 0.0008; // лёгкое постоянное вращение
        rotationY += (targetRotY - rotationY) * 0.08;
        globeGroup.rotation.y = rotationY;

        // лёгкое "дыхание" искр
        const t = performance.now() * 0.001;
        sparksMat.opacity = 0.75 + Math.sin(t * 1.1) * 0.15;

        renderer.render(scene, camera);
    }

    animate();
})();
