// assets/space/space.js — полноэкранная Земля, без "окна", с наклоном

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

    const INIT_DIST = 3.6;
    const MIN_DIST = 1.15;   // раньше 2.4
    const MAX_DIST  = 8.0;

    const camera = new THREE.PerspectiveCamera(
        35,
        1,
        0.1,
        100
    );
    camera.position.set(0, 0, INIT_DIST);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
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

    // <<< ЭТОТ БЛОК УБРАТЬ >>>
/*
// атмосфера
const atmGeo = new THREE.SphereGeometry(RADIUS * 1.03, SEGMENTS, SEGMENTS);
const atmMat = new THREE.MeshBasicMaterial({
    color: 0x3ea6ff,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
});
const atmosphere = new THREE.Mesh(atmGeo, atmMat);
globeGroup.add(atmosphere);
*/

    // огоньки на поверхности
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

    // ----- STATE -----
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    // углы камеры вокруг центра (как широта/долгота)
    let rotX = 0;          // наклон вверх/вниз
    let rotY = 0;          // поворот вокруг оси
    let targetRotX = 0;
    let targetRotY = 0;

    let dist = INIT_DIST;
    let targetDist = INIT_DIST;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function clamp(v, min, max) {
        return Math.min(max, Math.max(min, v));
    }

    // ----- POINTER -----
    function onPointerDown(e) {
        if (e.button === 2) return; // правая — назад
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

        targetRotY += dx * rotSpeed;      // влево / вправо
        targetRotX += -dy * rotSpeed;     // вверх / вниз

        const limit = Math.PI / 2 - 0.1;  // чтобы не переворачивало
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

    // ----- BACK -----
    function goBack() {
        window.location.href = "index.html#work";
    }

    function onContextMenu(e) {
        e.preventDefault();
        goBack();
    }

    function onKeyDown(e) {
        if (e.key === "Escape") goBack();
    }

    if (backBtn) {
        backBtn.addEventListener("click", goBack);
    }

    // ----- DOUBLE CLICK REGION -----
    function onDblClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        mouse.set(x, y);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(earthMesh);

        if (!hits.length) return;

        const p = hits[0].point.clone().normalize();

        const lat = Math.asin(p.y);           // радианы
        const lon = Math.atan2(p.x, p.z);     // радианы

        // разворачиваем камеру на эту точку
        targetRotX = -lat;
        targetRotY = lon;
        targetDist = clamp(targetDist * 0.8, MIN_DIST, MAX_DIST);

        if (!tooltip) return;

        const latDeg = lat * 180 / Math.PI;
        const lonDeg = lon * 180 / Math.PI;
        const regionUrl = `/lvs-site/region.html?lat=${latDeg.toFixed(2)}&lon=${lonDeg.toFixed(2)}`;

        tooltip.style.display = "block";
        tooltip.style.left = e.clientX + 14 + "px";
        tooltip.style.top  = e.clientY + 14 + "px";
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
        const width  = rect.width  || window.innerWidth;
        const height = rect.height || window.innerHeight;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    // ----- ANIMATE -----
    function animate() {
        requestAnimationFrame(animate);

        // лёгкое авто-вращение
        targetRotY += 0.00025;

        rotX += (targetRotX - rotX) * 0.12;
        rotY += (targetRotY - rotY) * 0.12;
        dist += (targetDist - dist) * 0.12;

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


