// assets/space/space.js — полноэкранная Земля: колесо, даблклик, правая кнопка назад

(function () {
    const canvas = document.getElementById("lvs-space-canvas");
    const tooltip = document.getElementById("lvs-space-tooltip");
    const backBtn = document.getElementById("space-back-btn");

    if (!canvas || typeof THREE === "undefined") return;

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

    const INIT_Z = 3.0;
    const MIN_Z = 1.6;
    const MAX_Z = 6.0;

    const camera = new THREE.PerspectiveCamera(
        35,
        1,
        0.1,
        100
    );
    camera.position.set(0, 0, INIT_Z);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 2, 2);
    scene.add(dirLight);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const radius = 1.0;
    const segments = 128;

    const sphereGeo = new THREE.SphereGeometry(radius, segments, segments);

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

    const atmosphereGeo = new THREE.SphereGeometry(radius * 1.03, 128, 128);
    const atmosphereMat = new THREE.MeshBasicMaterial({
        color: 0x3ea6ff,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    globeGroup.add(atmosphere);

    const sparksGeo = new THREE.BufferGeometry();
    const sparksCount = 450;
    const positions = new Float32Array(sparksCount * 3);

    for (let i = 0; i < sparksCount; i++) {
        const u = Math.random() * 2 * Math.PI;
        const v = Math.random() * Math.PI;

        const r = radius * 1.02;
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

    let isDragging = false;
    let prevX = 0;
    let rotationY = 0;
    let targetRotY = 0;

    let zoomZ = INIT_Z;
    let targetZoomZ = INIT_Z;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onPointerDown(e) {
        if (e.button === 2) return;
        isDragging = true;
        prevX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const dx = clientX - prevX;
        prevX = clientX;

        const rotSpeed = 0.005;
        targetRotY += dx * rotSpeed;
    }

    function onPointerUp() {
        isDragging = false;
    }

    // zoom колесом
    function onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY;
        const step = 0.0025;
        targetZoomZ += delta * step;
        targetZoomZ = Math.min(MAX_Z, Math.max(MIN_Z, targetZoomZ));
    }

    // правая кнопка – назад на главную
    function goBack() {
        window.location.href = "index.html#work";
    }

    function onContextMenu(e) {
        e.preventDefault();
        goBack();
    }

    // двойной клик — инфо региона
    function onDblClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        mouse.set(x, y);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(earthMesh);

        if (!hits.length || !tooltip) return;

        const p = hits[0].point.clone().normalize();
        const lat = Math.asin(p.y) * 180 / Math.PI;
        const lon = Math.atan2(p.z, p.x) * 180 / Math.PI;

        const regionUrl = `/lvs-site/region.html?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`;

        tooltip.style.display = "block";
        tooltip.style.left = e.clientX + 14 + "px";
        tooltip.style.top = e.clientY + 14 + "px";
        tooltip.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">Work region</div>
            <div style="font-size:12px;opacity:0.85;margin-bottom:6px;">
                Lat ${lat.toFixed(1)}°, Lon ${lon.toFixed(1)}°. 
                Open tasks and companies for this territory.
            </div>
            <a href="${regionUrl}">
                Open region page
            </a>
        `;
    }

    // ESC тоже назад
    function onKeyDown(e) {
        if (e.key === "Escape") {
            goBack();
        }
    }

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

    if (backBtn) {
        backBtn.addEventListener("click", goBack);
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || width;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    function animate() {
        requestAnimationFrame(animate);

        targetRotY += 0.0007;
        rotationY += (targetRotY - rotationY) * 0.08;
        globeGroup.rotation.y = rotationY;

        zoomZ += (targetZoomZ - zoomZ) * 0.12;
        camera.position.z = zoomZ;
        camera.lookAt(0, 0, 0);

        const t = performance.now() * 0.001;
        sparksMat.opacity = 0.75 + Math.sin(t * 1.1) * 0.15;

        renderer.render(scene, camera);
    }

    animate();
})();
