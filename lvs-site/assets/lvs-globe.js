// lvs-globe.js – детализированный глобус без облаков + искорки жизни

(function () {
    const canvas = document.getElementById("lvs-globe-canvas");
    if (!canvas || !window.THREE) return;

    // ---------- БАЗА THREE ----------
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const camera = new THREE.PerspectiveCamera(
        35,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        100
    );
    camera.position.set(0, 0, 3.2);
    scene.add(camera);

    function resize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight || width;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    // ---------- СВЕТ ----------
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 2, 1.5);
    scene.add(ambient, dir);

    // ---------- ГЛОБУС ----------
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const loader = new THREE.TextureLoader();

    // ВАЖНО: закинь текстуру Земли без облаков в /img и назови earth_noclouds_4k.jpg
    // путь относительно index.html → ../img/earth_noclouds_4k.jpg
    const earthTexture = loader.load("../img/earth_noclouds_4k.jpg");

    const earthGeometry = new THREE.SphereGeometry(1, 96, 96);
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 6
    });

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);

    // ---------- ИСКОРКИ ЖИЗНИ ----------
    const sparklesCount = 900;
    const sparklesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(sparklesCount * 3);
    const colors = new Float32Array(sparklesCount * 3);

    for (let i = 0; i < sparklesCount; i++) {
        // равномерно по сфере
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        const r = 1.03; // чуть выше поверхности Земли
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        positions[3 * i] = x;
        positions[3 * i + 1] = y;
        positions[3 * i + 2] = z;

        // цвет: тёплый голубовато-зеленый, лёгкий рандом по яркости
        const intensity = 0.6 + 0.4 * Math.random();
        colors[3 * i] = 0.3 * intensity;       // R
        colors[3 * i + 1] = 0.9 * intensity;   // G
        colors[3 * i + 2] = 1.0 * intensity;   // B
    }

    sparklesGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );
    sparklesGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3)
    );

    const sparklesMaterial = new THREE.PointsMaterial({
        size: 0.015,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const sparkles = new THREE.Points(sparklesGeometry, sparklesMaterial);
    globeGroup.add(sparkles);

    // ---------- УПРАВЛЕНИЕ МЫШКОЙ ----------
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let targetRotY = 0;
    let targetRotX = 0;

    canvas.addEventListener("mousedown", (e) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;

        targetRotY += dx * 0.005;
        targetRotX += dy * 0.005;

        // ограничиваем наклон по вертикали
        const maxTilt = Math.PI / 3;
        targetRotX = Math.max(-maxTilt, Math.min(maxTilt, targetRotX));
    });

    // для тач-устройств
    canvas.addEventListener("touchstart", (e) => {
        if (!e.touches.length) return;
        isDragging = true;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
    });

    window.addEventListener("touchend", () => {
        isDragging = false;
    });

    window.addEventListener("touchmove", (e) => {
        if (!isDragging || !e.touches.length) return;
        const touch = e.touches[0];
        const dx = touch.clientX - prevX;
        const dy = touch.clientY - prevY;
        prevX = touch.clientX;
        prevY = touch.clientY;

        targetRotY += dx * 0.005;
        targetRotX += dy * 0.005;

        const maxTilt = Math.PI / 3;
        targetRotX = Math.max(-maxTilt, Math.min(maxTilt, targetRotX));
    });

    // ---------- АНИМАЦИЯ ----------
    let autoSpin = 0.002;

    function animate() {
        requestAnimationFrame(animate);

        // лёгкое автокручение
        targetRotY += autoSpin;

        // плавно тянем глобус к целевому вращению
        globeGroup.rotation.y += (targetRotY - globeGroup.rotation.y) * 0.08;
        globeGroup.rotation.x += (targetRotX - globeGroup.rotation.x) * 0.08;

        // дыхание искорок (размер)
        const t = performance.now() * 0.001;
        sparklesMaterial.size = 0.012 + Math.sin(t * 2.0) * 0.004;

        renderer.render(scene, camera);
    }

    animate();
})();
