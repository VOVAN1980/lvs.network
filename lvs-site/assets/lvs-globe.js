// lvs-globe.js — 3D-глобус с дневной/ночной картой и фокус-режимом

(function () {
    const canvas = document.getElementById("lvs-globe-canvas");
    const wrapper = canvas ? canvas.closest(".lvs-globe-wrapper") : null;
    const tooltip = document.getElementById("lvs-globe-tooltip");

    if (!canvas || typeof THREE === "undefined") return;

    // ---------- СЦЕНА ----------
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    let currentCameraZ = 3.2;
    let targetCameraZ = 3.2;
    camera.position.set(0, 0, currentCameraZ);

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(3, 2, 2);
    scene.add(dirLight);

    // ---------- ГЛОБУС ----------
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const radius = 1.0;
    const segments = 64;

    const sphereGeo = new THREE.SphereGeometry(radius, segments, segments);

    const texLoader = new THREE.TextureLoader();

    // Текстуры с CDN (работают из браузера, картинка Земли как в реале)
    const dayMap = texLoader.load(
        "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg"
    );
    const nightMap = texLoader.load(
        "https://threejs.org/examples/textures/planets/earth_lights_2048.png"
    );

    const earthMat = new THREE.MeshPhongMaterial({
        map: dayMap,
        shininess: 8,
        specular: new THREE.Color(0x333333),
        emissive: new THREE.Color(0xffffff),
        emissiveMap: nightMap,
        emissiveIntensity: 0.0, // будет зависеть от времени суток
    });

    const earthMesh = new THREE.Mesh(sphereGeo, earthMat);
    globeGroup.add(earthMesh);

    // Лёгкая «атмосфера»
    const atmosphereGeo = new THREE.SphereGeometry(radius * 1.02, 64, 64);
    const atmosphereMat = new THREE.MeshBasicMaterial({
        color: 0x3ea6ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    globeGroup.add(atmosphere);

    // ---------- ТОЧКИ-ОГОНЬКИ ----------
    const sparksGeo = new THREE.BufferGeometry();
    const sparksCount = 350;
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
        opacity: 0.9,
    });

    const sparks = new THREE.Points(sparksGeo, sparksMat);
    globeGroup.add(sparks);

    // ---------- ВРЕМЯ СУТОК: ДЕНЬ / НОЧЬ ----------
    function updateDayNight() {
        const now = new Date();
        const hours = now.getHours() + now.getMinutes() / 60;

        // 12:00 — минимум ночи, 0:00 и 24:00 — максимум огней
        const t = (hours / 24) * 2 * Math.PI;
        const dayFactor = (Math.cos(t) + 1) / 2; // 1 днём, 0 ночью
        const nightFactor = 1 - dayFactor;

        earthMat.emissiveIntensity = 0.3 + nightFactor * 1.0;

        // Положение "солнца"
        dirLight.position.set(
            Math.cos(t) * 4,
            Math.sin(t) * 2,
            2
        );
        dirLight.intensity = 0.6 + dayFactor * 0.4;
    }

    // ---------- РОТАЦИЯ: КАК В EARTH / ORBIT ----------
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const rotSpeed = 0.005;

    function onPointerDown(e) {
        isDragging = true;
        prevX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        prevY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        const dx = clientX - prevX;
        const dy = clientY - prevY;
        prevX = clientX;
        prevY = clientY;

        targetRotY += dx * rotSpeed;
        targetRotX += dy * rotSpeed;

        // ограничиваем наклон, чтобы шар не переворачивался
        const maxTilt = 1.2;
        if (targetRotX > maxTilt) targetRotX = maxTilt;
        if (targetRotX < -maxTilt) targetRotX = -maxTilt;
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

    // ---------- ФОКУС-РЕЖИМ (вылетает на первый план) ----------
    let focusMode = false;

    function toggleFocusMode() {
        focusMode = !focusMode;

        if (focusMode) {
            document.body.classList.add("lvs-globe-focus");
            if (wrapper) wrapper.classList.add("lvs-globe-wrapper--focus");
            targetCameraZ = 2.1;
        } else {
            document.body.classList.remove("lvs-globe-focus");
            if (wrapper) wrapper.classList.remove("lvs-globe-wrapper--focus");
            targetCameraZ = 3.2;
            hideTooltip();
        }
    }

    // не мешаем drag: маленький клик — фокус, просто движение — нет
    let clickTimeout = null;
    canvas.addEventListener("click", function () {
        // задержка, чтобы не мельтешило при частых кликах
        if (clickTimeout) {
            clearTimeout(clickTimeout);
            clickTimeout = null;
        }
        clickTimeout = setTimeout(() => {
            toggleFocusMode();
        }, 80);
    });

    // ---------- РЕЙКАСТИНГ: КЛИК ПО СТРАНЕ / ГОРОДУ ----------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function screenToLatLon(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(earthMesh);
        if (!intersects || intersects.length === 0) return null;

        const p = intersects[0].point.clone().normalize();

        const lat = 90 - (Math.acos(p.y) * 180 / Math.PI);
        const lon = ((Math.atan2(p.z, p.x) * 180 / Math.PI) + 180) % 360 - 180;

        return { lat, lon, point: intersects[0].point };
    }

    function showTooltip(x, y, text) {
        if (!tooltip) return;
        tooltip.style.display = "block";
        tooltip.style.left = x + 12 + "px";
        tooltip.style.top = y + 12 + "px";
        tooltip.innerHTML = text;
    }

    function hideTooltip() {
        if (!tooltip) return;
        tooltip.style.display = "none";
    }

    // клик по глобусу в ФОКУС-режиме: показать инфо и переход на jobs.html
    canvas.addEventListener("dblclick", function (e) {
        if (!focusMode) return;

        const hit = screenToLatLon(e.clientX, e.clientY);
        if (!hit) return;

        const { lat, lon } = hit;

        showTooltip(e.clientX, e.clientY,
            `Selected location<br>Lat: ${lat.toFixed(2)}°, Lon: ${lon.toFixed(2)}°<br><br>` +
            `Jobs page will open…`
        );

        // сюда потом подключишь реальный список работ
        const url = `jobs.html?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`;
        setTimeout(() => {
            window.location.href = url;
        }, 700);
    });

    // ---------- АНИМАЦИЯ ----------
    function animate() {
        requestAnimationFrame(animate);

        // авто-вращение по Y
        if (!isDragging) {
            targetRotY += 0.0008;
        }

        rotY += (targetRotY - rotY) * 0.08;
        rotX += (targetRotX - rotX) * 0.08;
        globeGroup.rotation.y = rotY;
        globeGroup.rotation.x = rotX;

        // дыхание огоньков
        const t = performance.now() * 0.001;
        sparksMat.opacity = 0.75 + Math.sin(t * 1.1) * 0.15;

        // камера (зум при фокусе)
        currentCameraZ += (targetCameraZ - currentCameraZ) * 0.08;
        camera.position.z = currentCameraZ;

        // день / ночь
        updateDayNight();

        renderer.render(scene, camera);
    }

    animate();
})();
