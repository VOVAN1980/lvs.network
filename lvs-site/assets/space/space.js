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

    // ----- INTERACTION STATE -----
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    // как бы "широта/долгота" камеры вокруг шара
    let rotX = 0;          // вверх/вниз
    let rotY = 0;          // влево/вправо
    let targetRotX = 0;
    let targetRotY = 0;

    let dist = INIT_DIST;
    let targetDist = INIT_DIST;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // ----- HELPERS -----

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function updateCamera() {
        // камера вращается вокруг центра, как в Google Earth
        const x = dist * Math.cos(targetRotX) * Math.sin(targetRotY);
        const y = dist * Math.sin(targetRotX);
        const z = dist * Math.cos(targetRotX) * Math.cos(targetRotY);

        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
    }

    // ----- POINTER -----
    function onPointerDown(e) {
        if (e.button === 2) return; // right click — другое поведение
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

        const rotSpeed = 0.005;

        targetRotY += dx * rotSpeed;          // горизонт
        targetRotX += -dy * rotSpeed;         // вертикаль (инверс)

        // ограничиваем наклон, чтобы не переворачивало
        const limit = Math.PI / 2 - 0.2;
        targetRotX = clamp(targetRotX, -limit, limit);
    }

    function onPointerUp() {
        isDragging = false;
    }

    // ----- WHEEL ZOOM -----
    function onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY;
        const factor = 1 + Math.abs(delta) * 0.0007;

        if (delta > 0) {
            targetDist = clamp(targetDist * factor, MIN_DIST, MAX_DIST);
        } else {
            targetDist = clamp(targetDist / factor, MIN_DIST, MAX_DIST);
        }
    }

    // ----- BACK / RESET -----
    function goBack() {
        window.location.href = "index.html#work";
    }

    function onContextMenu(e) {
        e.preventDefault();
        goBack();
    }

    function onKeyDown(e) {
        if (e.key === "Escape") {
            goBack();
        }
    }

    if (backBtn) {
        backBtn.addEventListener("click", goBack);
    }

    // ----- DOUBLE CLICK = ЗУМ В ТОЧКУ + INFO -----
    function onDblClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        mouse.set(x, y);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(earthMesh);

        if (!hits.length) return;

        const p = hits[0].point.clone().normalize();

        // сферические координаты точки
        const lat = Math.asin(p.y);                // радианы
        const lon = Math.atan2(p.x, p.z);          // радианы

        // разворачиваем Землю так, чтобы точка была "под камерой"
        targetRotX = -lat;
        targetRotY = lon;

        // зумимся ближе
        targetDist = clamp(targetDist * 0.7, MIN_DIST, MAX_DIST);

        // инфо-tooltip + ссылка на регион
        if (!tooltip) return;

        const latDeg = lat * 180 / Math.PI;
        const lonDeg = lon * 180 / Math.PI;

        const regionUrl = `/lvs-site/region.html?lat=${latDeg.toFixed(2)}&lon=${lonDeg.toFixed(2)}`;

        tooltip.style.display = "block";
        tooltip.style.left = e.clientX + 14 + "px";
        tooltip.style.top = e.clientY + 14 + "px";
        tooltip.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">Work region</div>
            <div style="font-size:12px;opacity:0.85;margin-bottom:6px;">
                Lat ${latDeg.toFixed(1)}°, Lon ${lonDeg.toFixed(1)}°. 
                Open tasks and companies for this territory.
            </div>
            <a href="${regionUrl}">
                Open region page
            </a>
        `;
    }

    // ----- EVENTS -----
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKeyDown);

    // ----- RESIZE -----
    function resize() {
        const rect = canvas.getBoundingClientRect();
        const width  = rect.width  || 600;
        const height = rect.height || width;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    // ----- ANIMATE -----
    function animate() {
        requestAnimationFrame(animate);

        // лёгкое авто-вращение, как у Google
        targetRotY += 0.0003;

        rotX += (targetRotX - rotX) * 0.12;
        rotY += (targetRotY - rotY) * 0.12;
        dist += (targetDist - dist) * 0.12;

        // камеру крутим вокруг центра
        const x = dist * Math.cos(rotX) * Math.sin(rotY);
        const y = dist * Math.sin(rotX);
        const z = dist * Math.cos(rotX) * Math.cos(rotY);
        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);

        const t = performance.now() * 0.001;
        sparksMat.opacity = 0.75 + Math.sin(t * 1.1) * 0.15;

        renderer.render(scene, camera);
    }

    animate();
})();
