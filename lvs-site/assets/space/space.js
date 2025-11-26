// assets/space/space.js — глобус Земли + города

(function () {
    const canvas      = document.getElementById("lvs-space-canvas");
    const tooltip     = document.getElementById("lvs-space-tooltip");
    const backBtn     = document.getElementById("space-back-btn");
    const labelLayer  = document.getElementById("space-label-layer");

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

    const INIT_DIST = 2.6;
    const MIN_DIST  = 1.05; // почти касаемся поверхности
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
    if (renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
        earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    earthTexture.minFilter = THREE.LinearMipMapLinearFilter;
    earthTexture.magFilter = THREE.LinearFilter;

    const earthMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 14,
        specular: new THREE.Color(0x444444),
    });

    const earthMesh = new THREE.Mesh(sphereGeo, earthMat);
    globeGroup.add(earthMesh);

    // никакого канта / атмосферы — чистый шар

    // огоньки "экономической активности" по поверхности
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

    // ----- ГОРОДА (для выбора работы) -----

    // базовый список — можешь расширять, это просто данные
    const CITY_DATA = [
        // Германия / твой регион
        { name: "Bad Kreuznach",   lat: 49.8454, lon: 7.8670 },
        { name: "Mainz",           lat: 49.9929, lon: 8.2473 },
        { name: "Frankfurt",       lat: 50.1109, lon: 8.6821 },
        { name: "Berlin",          lat: 52.5200, lon: 13.4050 },
        { name: "Hamburg",         lat: 53.5511, lon: 9.9937 },
        { name: "Munich",          lat: 48.1351, lon: 11.5820 },

        // Европа
        { name: "Paris",           lat: 48.8566, lon: 2.3522 },
        { name: "London",          lat: 51.5074, lon: -0.1278 },
        { name: "Warsaw",          lat: 52.2297, lon: 21.0122 },
        { name: "Prague",          lat: 50.0755, lon: 14.4378 },
        { name: "Vienna",          lat: 48.2082, lon: 16.3738 },
        { name: "Rome",            lat: 41.9028, lon: 12.4964 },
        { name: "Madrid",          lat: 40.4168, lon: -3.7038 },

        // мир
        { name: "New York",        lat: 40.7128, lon: -74.0060 },
        { name: "Los Angeles",     lat: 34.0522, lon: -118.2437 },
        { name: "Tokyo",           lat: 35.6762, lon: 139.6503 },
        { name: "Seoul",           lat: 37.5665, lon: 126.9780 },
        { name: "Singapore",       lat: 1.3521,  lon: 103.8198 },
        { name: "Sydney",          lat: -33.8688, lon: 151.2093 },
        { name: "São Paulo",       lat: -23.5505, lon: -46.6333 },
    ];

    function latLonToVec3(latDeg, lonDeg, radius = RADIUS) {
        const lat = THREE.MathUtils.degToRad(latDeg);
        const lon = THREE.MathUtils.degToRad(lonDeg);

        const x = radius * Math.cos(lat) * Math.sin(lon);
        const y = radius * Math.sin(lat);
        const z = radius * Math.cos(lat) * Math.cos(lon);
        return new THREE.Vector3(x, y, z);
    }

    const cityLabels = [];

    CITY_DATA.forEach(city => {
        const pos = latLonToVec3(city.lat, city.lon, RADIUS * 1.01);

        // маленькая точка на сфере (можно выключить, если не надо)
        const dotGeo = new THREE.SphereGeometry(0.012, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xffe266 });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(pos);
        globeGroup.add(dot);

        // HTML-лейбл
        const el = document.createElement("div");
        el.className = "space-city-label";
        el.textContent = city.name;
        labelLayer.appendChild(el);

        cityLabels.push({
            name: city.name,
            lat: city.lat,
            lon: city.lon,
            worldPos: pos,
            dot,
            el,
        });
    });

    // ----- STATE -----
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    // углы камеры вокруг центра
    let rotX = 0;
    let rotY = 0;
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

        targetRotY += dx * rotSpeed;
        targetRotX += -dy * rotSpeed;

        const limit = Math.PI / 2 - 0.1;
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

    // ----- CITY / REGION SELECT -----

    function haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = THREE.MathUtils.degToRad(lat2 - lat1);
        const dLon = THREE.MathUtils.degToRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(THREE.MathUtils.degToRad(lat1)) *
            Math.cos(THREE.MathUtils.degToRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function onDblClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        mouse.set(x, y);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(earthMesh);

        if (!hits.length) return;

        const p = hits[0].point.clone().normalize();

        const lat = Math.asin(p.y);       // рад
        const lon = Math.atan2(p.x, p.z); // рад

        const latDeg = lat * 180 / Math.PI;
        const lonDeg = lon * 180 / Math.PI;

        // ищем ближайший город
        let best = null;
        let bestDist = Infinity;

        cityLabels.forEach(c => {
            const d = haversineKm(latDeg, lonDeg, c.lat, c.lon);
            if (d < bestDist) {
                bestDist = d;
                best = c;
            }
        });

        // если ближе 300 км — считаем, что попали в этот город
        const CITY_THRESHOLD_KM = 300;

        if (best && bestDist <= CITY_THRESHOLD_KM) {
            // камера фокусится на город
            targetRotX = -THREE.MathUtils.degToRad(best.lat);
            targetRotY =  THREE.MathUtils.degToRad(best.lon);
            targetDist  = clamp(targetDist * 0.85, MIN_DIST, MAX_DIST);

            if (tooltip) {
                const cityUrl =
                    `/lvs-site/region.html?city=${encodeURIComponent(best.name)}` +
                    `&lat=${best.lat.toFixed(2)}&lon=${best.lon.toFixed(2)}`;

                tooltip.style.display = "block";
                tooltip.style.left = e.clientX + 14 + "px";
                tooltip.style.top  = e.clientY + 14 + "px";
                tooltip.innerHTML = `
                    <div style="font-weight:600;margin-bottom:4px;">${best.name}</div>
                    <div style="font-size:12px;opacity:0.85;margin-bottom:6px;">
                        Work opportunities, companies and tasks in this city.
                    </div>
                    <a href="${cityUrl}">
                        Open ${best.name} page
                    </a>
                `;
            }
        } else {
            // просто регион, как раньше
            targetRotX = -lat;
            targetRotY = lon;
            targetDist = clamp(targetDist * 0.8, MIN_DIST, MAX_DIST);

            if (tooltip) {
                tooltip.style.display = "block";
                tooltip.style.left = e.clientX + 14 + "px";
                tooltip.style.top  = e.clientY + 14 + "px";
                tooltip.innerHTML = `
                    <div style="font-weight:600;margin-bottom:4px;">Work region</div>
                    <div style="font-size:12px;opacity:0.85;margin-bottom:6px;">
                        Lat ${latDeg.toFixed(1)}°, Lon ${lonDeg.toFixed(1)}°. 
                        Open tasks and companies for this territory.
                    </div>
                `;
            }
        }
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
    function updateCityLabels() {
        if (!cityLabels.length) return;

        const size = renderer.getSize(new THREE.Vector2());
        const width = size.x;
        const height = size.y;

        const showLabels = dist < 4.5; // далеко — не засоряем экран

        cityLabels.forEach(c => {
            const pos = c.worldPos.clone().multiplyScalar(1.02);
            pos.project(camera);

            // если за камерой — не рисуем
            if (pos.z < -1 || pos.z > 1 || !showLabels) {
                c.el.style.display = "none";
                return;
            }

            const x = (pos.x * 0.5 + 0.5) * width;
            const y = (-pos.y * 0.5 + 0.5) * height;

            c.el.style.display = "block";
            c.el.style.transform =
                `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        });
    }

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

        updateCityLabels();
    }

    animate();
})();
