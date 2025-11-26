// assets/lvs-globe.js — простой глобус в хиро, без зума, клик → космос

(function () {
    const canvas = document.getElementById("lvs-globe-canvas");
    if (!canvas || typeof THREE === "undefined") return;

    // ---------- СЦЕНА ----------
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    // Новые версии three.js: используем outputColorSpace, если есть
    if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 3.0);

    // Свет
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 2, 2);
    scene.add(dirLight);

    // ---------- ГЛОБУС ----------
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const radius = 1.0;
    const segments = 96;

    const sphereGeo = new THREE.SphereGeometry(radius, segments, segments);

    // Стильный тёмный шар без текстур, чтобы не было 404
    const earthMat = new THREE.MeshStandardMaterial({
        color: 0x070810,
        roughness: 0.65,
        metalness: 0.05
    });

    const earthMesh = new THREE.Mesh(sphereGeo, earthMat);
    globeGroup.add(earthMesh);

    // Лёгкое "свечение" по краю
    const rimGeo = new THREE.SphereGeometry(radius * 1.02, 64, 64);
    const rimMat = new THREE.MeshBasicMaterial({
        color: 0x3ea6ff,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    globeGroup.add(rim);

    // ---------- ИСКРЫ ВОКРУГ ГЛОБУСА ----------
    const sparksGeo = new THREE.BufferGeometry();
    const sparksCount = 260;
    const positions = new Float32Array(sparksCount * 3);

    for (let i = 0; i < sparksCount; i++) {
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
        opacity: 0.85,
    });

    const sparks = new THREE.Points(sparksGeo, sparksMat);
    globeGroup.add(sparks);

    // ---------- УПРАВЛЕНИЕ ПОВОРОТОМ ----------
    let rotationY = 0;
    let targetRotY = 0;
    let isDragging = false;
    let prevX = 0;

    function getX(e) {
        if (e.touches && e.touches.length) return e.touches[0].clientX;
        return e.clientX;
    }

    function onPointerDown(e) {
        if (e.button === 2) return; // правую кнопку игнорим
        isDragging = true;
        prevX = getX(e) || 0;
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const clientX = getX(e) || 0;
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

    // клик по глобусу → страница космоса (Cesium)
    canvas.addEventListener("click", function () {
        window.location.href = "space.html";
    });

    // ---------- РЕСАЙЗ ----------
    function resize() {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 400;
        const height = rect.height || width;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    // ---------- АНИМАЦИЯ ----------
    function animate() {
        requestAnimationFrame(animate);

        // Авто-вращение + плавный доворот
        targetRotY += 0.0008;
        rotationY += (targetRotY - rotationY) * 0.08;
        globeGroup.rotation.y = rotationY;

        // "дыхание" искр
        const t = performance.now() * 0.001;
        sparksMat.opacity = 0.75 + Math.sin(t * 1.1) * 0.15;

        renderer.render(scene, camera);
    }

    animate();
})();
