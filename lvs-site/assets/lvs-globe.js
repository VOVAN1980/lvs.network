// lvs-globe.js
// Простой 3D-глобус без облаков, с "искорками жизни" по поверхности.

(function () {
    const canvas = document.getElementById("lvs-globe-canvas");
    if (!canvas) return;

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0); // полностью прозрачный фон

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 3.2);

    // свет
    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(3, 2, 2);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambient);

    // текстуры земли
    const texLoader = new THREE.TextureLoader();

    const earthTexture = texLoader.load(
        "assets/space/earth-day.jpg",
        () => render() // старт когда текстура загрузилась
    );

    let lightsTexture;
    try {
        lightsTexture = texLoader.load("assets/space/earth-lights.png");
    } catch (e) {
        lightsTexture = null;
    }

    const geo = new THREE.SphereGeometry(1, 96, 96);

    const matParams = {
        map: earthTexture,
        metalness: 0.0,
        roughness: 1.0
    };

    const earthMaterial = new THREE.MeshStandardMaterial(matParams);

    if (lightsTexture) {
        lightsTexture.encoding = THREE.sRGBEncoding;
        lightsTexture.wrapS = lightsTexture.wrapT = THREE.ClampToEdgeWrapping;

        const lightsMaterial = new THREE.MeshBasicMaterial({
            map: lightsTexture,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        const earthGroup = new THREE.Group();
        const earthMesh = new THREE.Mesh(geo, earthMaterial);
        const lightsMesh = new THREE.Mesh(geo, lightsMaterial);

        earthGroup.add(earthMesh);
        earthGroup.add(lightsMesh);
        scene.add(earthGroup);

        // прокрутка будет для всей группы
        scene.userData.earthObject = earthGroup;
    } else {
        const earthMesh = new THREE.Mesh(geo, earthMaterial);
        scene.add(earthMesh);
        scene.userData.earthObject = earthMesh;
    }

    // искорки жизни (точки по поверхности)
    const sparkCount = 600;
    const positions = new Float32Array(sparkCount * 3);

    for (let i = 0; i < sparkCount; i++) {
        // равномерное распределение по сфере
        const u = Math.random();
        const v = Math.random();

        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        const r = 1.01; // чуть выше поверхности

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }

    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const sparkMaterial = new THREE.PointsMaterial({
        color: 0x63ffe0,
        size: 0.012,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9
    });

    const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
    scene.add(sparks);

    // ротация
    let autoRotateSpeed = 0.0023;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    function resizeRenderer() {
        const rect = canvas.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height || rect.width);
        const width = size;
        const height = size;

        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function animate() {
        requestAnimationFrame(animate);

        const earthObject = scene.userData.earthObject;
        if (earthObject && !isDragging) {
            earthObject.rotation.y += autoRotateSpeed;
        }
        sparks.rotation.y += autoRotateSpeed * 1.2;

        renderer.render(scene, camera);
    }

    function render() {
        resizeRenderer();
        animate();
    }

    // drag вращение мышкой
    function onPointerDown(e) {
        isDragging = true;
        lastX = e.clientX || e.touches?.[0]?.clientX || 0;
        lastY = e.clientY || e.touches?.[0]?.clientY || 0;
    }

    function onPointerMove(e) {
        if (!isDragging) return;

        const x = e.clientX || e.touches?.[0]?.clientX || 0;
        const y = e.clientY || e.touches?.[0]?.clientY || 0;

        const dx = (x - lastX) / 180;
        const dy = (y - lastY) / 180;

        lastX = x;
        lastY = y;

        const earthObject = scene.userData.earthObject;
        if (earthObject) {
            earthObject.rotation.y += dx * 1.6;
            earthObject.rotation.x += dy * 1.1;
            earthObject.rotation.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, earthObject.rotation.x)
            );
        }
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

    // адаптив
    window.addEventListener("resize", resizeRenderer);

    // кнопка "Найти работу рядом со мной" — пока просто авто-фокус на Европе (демо)
    const btnNearMe = document.getElementById("btn-focus-my-region");
    if (btnNearMe) {
        btnNearMe.addEventListener("click", () => {
            const earthObject = scene.userData.earthObject;
            if (!earthObject) return;

            // грубо поворачиваем так, чтобы Европа была по центру
            earthObject.rotation.y = -0.6;
            earthObject.rotation.x = 0.3;
        });
    }
})();
