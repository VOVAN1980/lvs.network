// Simple AI-style 3D globe for LVS main page
// No backend yet – only demo points & click handler.

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("lvs-globe-canvas");
    if (!canvas || !window.THREE) return;

    const tooltip = document.getElementById("lvs-globe-tooltip");
    const btnFocus = document.getElementById("btn-focus-my-region");

    const width = canvas.clientWidth || 420;
    const height = canvas.clientHeight || 420;

    const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(3, 2, 1);
    scene.add(dir);

    // Earth
    const radius = 1;
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
        "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg"
    );
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 8
    });
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // Simple glow halo
    const glowGeom = new THREE.SphereGeometry(radius * 1.06, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x4fb3ff,
        transparent: true,
        opacity: 0.18
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    scene.add(glow);

    // Demo city points (lat, lon, label, tasks)
    const cities = [
        {
            name: "Berlin",
            country: "Germany",
            lat: 52.52,
            lon: 13.405,
            tasks: [
                "LVS gateway node monitoring · +45 VU",
                "Rust micro-service fix · +70 VU"
            ]
        },
        {
            name: "Warsaw",
            country: "Poland",
            lat: 52.2297,
            lon: 21.0122,
            tasks: [
                "Frontend improvements for cabinet UI · +55 VU",
                "Local onboarding support · +30 VU"
            ]
        },
        {
            name: "Kyiv",
            country: "Ukraine",
            lat: 50.4501,
            lon: 30.5234,
            tasks: [
                "Design concepts for LVS marketplace · +80 VU",
                "Content localization (UA/RU/EN) · +40 VU"
            ]
        },
        {
            name: "London",
            country: "UK",
            lat: 51.5074,
            lon: -0.1278,
            tasks: [
                "Legal research about reputation systems · +60 VU"
            ]
        },
        {
            name: "New York",
            country: "USA",
            lat: 40.7128,
            lon: -74.0060,
            tasks: [
                "LVS integration with existing SaaS · +150 VU"
            ]
        }
    ];

    const cityGroup = new THREE.Group();
    const cityMaterial = new THREE.MeshBasicMaterial({color: 0x4fe39a});
    cities.forEach(c => {
        const phi = (90 - c.lat) * (Math.PI / 180);
        const theta = (c.lon + 180) * (Math.PI / 180);

        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        const cityGeom = new THREE.SphereGeometry(0.02, 12, 12);
        const cityMesh = new THREE.Mesh(cityGeom, cityMaterial);
        cityMesh.position.set(x, y, z);
        cityMesh.userData.city = c;
        cityGroup.add(cityMesh);
    });
    scene.add(cityGroup);

    // Raycaster for clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onClick(event) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // First try cities
        const cityHits = raycaster.intersectObjects(cityGroup.children, true);
        if (cityHits.length > 0) {
            const city = cityHits[0].object.userData.city;
            showTooltip(event.clientX, event.clientY, city);
            return;
        }

        // If no city clicked – just show generic region info
        const hits = raycaster.intersectObject(earth);
        if (hits.length > 0) {
            const p = hits[0].point.clone().normalize();
            const lat = Math.asin(p.y) * 180 / Math.PI;
            const lon = Math.atan2(p.z, p.x) * 180 / Math.PI;
            const generic = regionFromLatLon(lat, lon);
            showTooltip(event.clientX, event.clientY, generic);
        }
    }

    function regionFromLatLon(lat, lon) {
        // Very rough mapping – just to give feeling.
        if (lat > 35 && lat < 70 && lon > -10 && lon < 40) {
            return {
                name: "Europe (example)",
                country: "",
                tasks: [
                    "Remote Rust/LVS task · +80 VU",
                    "Customer support / onboarding · +35 VU"
                ]
            };
        }
        if (lat > 10 && lat < 55 && lon < -30) {
            return {
                name: "Americas (example)",
                country: "",
                tasks: [
                    "Business integration pilot · +120 VU",
                    "Design sprint for marketplace UI · +60 VU"
                ]
            };
        }
        if (lat < 35 && lat > -40 && lon > 60 && lon < 150) {
            return {
                name: "Asia-Pacific (example)",
                country: "",
                tasks: [
                    "Localization & outreach · +50 VU",
                    "LVS education / workshops · +40 VU"
                ]
            };
        }
        return {
            name: "Global remote",
            country: "",
            tasks: [
                "Documentation & community work · +30 VU",
                "Node reliability monitoring · +45 VU"
            ]
        };
    }

    function showTooltip(clientX, clientY, city) {
        if (!tooltip || !city) return;
        const name = city.country ? `${city.name}, ${city.country}` : city.name;

        tooltip.innerHTML = `
            <div style="font-weight:600; margin-bottom:4px;">${name}</div>
            <div style="font-size:12px; opacity:0.8; margin-bottom:6px;">Example work opportunities:</div>
            <ul style="margin:0; padding-left:16px; font-size:12px;">
                ${city.tasks.map(t => `<li>${t}</li>`).join("")}
            </ul>
        `;
        tooltip.style.left = clientX + 12 + "px";
        tooltip.style.top = clientY + 12 + "px";
        tooltip.style.display = "block";
    }

    document.addEventListener("click", (e) => {
        // hide tooltip if clicked outside canvas
        if (!canvas.contains(e.target)) {
            if (tooltip) tooltip.style.display = "none";
        }
    });

    canvas.addEventListener("click", onClick);

    // "Find work near me" – просто автофокус на Европе/Берлине
    if (btnFocus) {
        btnFocus.addEventListener("click", () => {
            // поворачиваем землю так, чтобы Европа была по центру
            targetRotationY = Math.PI * 0.2;
        });
    }

    // Rotation / animation
    let targetRotationY = 0;
    let rotationY = 0;

    function animate() {
        requestAnimationFrame(animate);
        rotationY += (targetRotationY - rotationY) * 0.05;
        earth.rotation.y += 0.002 + (rotationY * 0.0005);
        cityGroup.rotation.y = earth.rotation.y;
        glow.rotation.y = earth.rotation.y * 0.95;
        renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function onResize() {
        const w = canvas.clientWidth || canvas.parentElement.clientWidth || 420;
        const h = canvas.clientHeight || w;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", onResize);
    onResize();
});
