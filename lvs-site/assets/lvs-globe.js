// assets/lvs-globe.js

(function () {
    const canvas = document.getElementById("lvs-globe-canvas");
    if (!canvas) return;

    // --- Базовая сцена ---
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,         // фон берём из CSS, не из WebGL
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    function resizeRenderer() {
        const { clientWidth, clientHeight } = canvas;
        if (clientWidth === 0 || clientHeight === 0) return;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
    }

    const camera = new THREE.PerspectiveCamera(
        32,
        canvas.clientWidth / canvas.clientHeight || 1,
        0.1,
        100
    );
    camera.position.set(0, 0, 2.4);

    // --- Свет ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(2, 1, 1.5);
    scene.add(dirLight);

    // --- Земля с текстурой ---
    const earthRadius = 1.0;
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 80, 80);
    const earthMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.0,
    });

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);

    // грузим текстуру карты Земли (ПУТЬ — ОТНОСИТЕЛЬНО index.html)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        "assets/space/earth-map.png",          // <--- тут твой файл
        function (texture) {
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            earthMaterial.map = texture;
            earthMaterial.needsUpdate = true;
        },
        undefined,
        function (err) {
            console.warn("Failed to load earth texture", err);
        }
    );

    // --- "Искорки жизни" по поверхности Земли ---
    const sparksCount = 450;
    const sparksGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(sparksCount * 3);

    for (let i = 0; i < sparksCount; i++) {
        // случайная точка на сфере чуть выше поверхности
        const u = Math.random();
        const v = Math.random();

        const theta = 2 * Math.PI * u;           // долгота
        const phi   = Math.acos(2 * v - 1);      // широта

        const r = earthRadius * 1.01;            // чуть над поверхностью

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }

    sparksGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    const sparksMaterial = new THREE.PointsMaterial({
        color: 0x65f0ff,
        size: 0.015,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
    });

    const sparks = new THREE.Points(sparksGeometry, sparksMaterial);
    scene.add(sparks);

    // --- лёгкая аура вокруг шара (чисто визуал) ---
    const auraGeometry = new THREE.SphereGeometry(earthRadius * 1.03, 60, 60);
    const auraMaterial = new THREE.MeshBasicMaterial({
        color: 0x1fb5ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    scene.add(aura);

    // --- простое вращение + drag мышью ---
    let autoRotateSpeed = 0.003;
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    function onPointerDown(e) {
        isDragging = true;
        const p = e.touches ? e.touches[0] : e;
        prevX = p.clientX;
        prevY = p.clientY;
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const p = e.touches ? e.touches[0] : e;
        const dx = p.clientX - prevX;
        const dy = p.clientY - prevY;
        prevX = p.clientX;
        prevY = p.clientY;

        const rotSpeed = 0.005;
        earthMesh.rotation.y += dx * rotSpeed;
        earthMesh.rotation.x += dy * rotSpeed * 0.6;
        sparks.rotation.copy(earthMesh.rotation);
        aura.rotation.copy(earthMesh.rotation);
    }

    function onPointerUp() {
        isDragging = false;
    }

    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    canvas.addEventListener("touchstart", onPointerDown, { passive: true });
    canvas.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    // resize
    window.addEventListener("resize", resizeRenderer);
    resizeRenderer();

    // --- рендер-цикл ---
    function animate() {
        requestAnimationFrame(animate);

        if (!isDragging) {
            earthMesh.rotation.y += autoRotateSpeed;
            sparks.rotation.y += autoRotateSpeed;
            aura.rotation.y += autoRotateSpeed;
        }

        renderer.render(scene, camera);
    }

    animate();
})();
