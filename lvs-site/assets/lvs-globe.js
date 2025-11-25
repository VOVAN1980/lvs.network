// lvs-globe.js
// Simple rotating Earth + "life sparkles" + click tooltip.
// Requires three.js (loaded in index.html).

(function () {
    document.addEventListener("DOMContentLoaded", initLvsGlobe);

    function initLvsGlobe() {
        const canvas = document.getElementById("lvs-globe-canvas");
        if (!canvas || typeof THREE === "undefined") return;

        const tooltip = document.getElementById("lvs-globe-tooltip");
        const wrapper = canvas.parentElement;

        // --- renderer / scene / camera ---
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        renderer.setClearColor(0x000000, 0); // прозрачный фон

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            35,
            1,
            0.1,
            100
        );
        camera.position.set(0, 0, 4);

        // light
        const light = new THREE.DirectionalLight(0xffffff, 1.1);
        light.position.set(3, 2, 2);
        scene.add(light);

        scene.add(new THREE.AmbientLight(0x404040, 0.9));

        // --- Earth ---
        const earthGroup = new THREE.Group();
        scene.add(earthGroup);

        const radius = 1.15;
        const geo = new THREE.SphereGeometry(radius, 96, 96);
        const loader = new THREE.TextureLoader();

        const earthTexture = loader.load(
            "assets/space/earth.png",
            () => {
                render(); // первый кадр как только текстура загрузилась
            }
        );

        earthTexture.colorSpace = THREE.SRGBColorSpace;

        const earthMat = new THREE.MeshPhongMaterial({
            map: earthTexture,
            shininess: 10,
            specular: new THREE.Color(0x222222),
        });

        const earthMesh = new THREE.Mesh(geo, earthMat);
        earthGroup.add(earthMesh);

        // --- "sparkles of life" on surface ---
        const sparkCount = 650;
        const sparkGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(sparkCount * 3);

        for (let i = 0; i < sparkCount; i++) {
            // равномерно по сфере
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);

            const r = radius + 0.01;
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.sin(theta);

            positions[i * 3 + 0] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        sparkGeo.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );

        const sparkMat = new THREE.PointsMaterial({
            color: 0x6fe4ff,
            size: 0.015,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.9,
        });

        const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
        earthGroup.add(sparkPoints);

        // --- rotation control ---
        let targetRotY = 0;
        let autoRotate = true;

        // "Find work near me" -> фокус примерно на Европе / Германии
        const focusBtn = document.getElementById("btn-focus-my-region");
        if (focusBtn) {
            focusBtn.addEventListener("click", () => {
                // небольшой сдвиг к Европе
                targetRotY = Math.PI * 0.35;
                autoRotate = false;
            });
        }

        // --- click tooltip (demo regions, без raycast, просто контент) ---
        const sampleRegions = [
            {
                title: "Berlin · EU hub",
                text: "+120 VU – Rust micro-services, node operations, protocol research.",
            },
            {
                title: "São Paulo · Design & onboarding",
                text: "+80 VU – UX polish for dashboards, onboarding small businesses into LVS.",
            },
            {
                title: "Seoul · AI agents",
                text: "+150 VU – agent marketplaces, autonomous service integrations.",
            },
            {
                title: "Nairobi · Local services",
                text: "+60 VU – real-world tasks, logistics & community coordination.",
            },
        ];

        canvas.addEventListener("click", (ev) => {
            if (!tooltip) return;

            const region =
                sampleRegions[
                    Math.floor(Math.random() * sampleRegions.length)
                ];

            tooltip.innerHTML =
                "<strong>" +
                region.title +
                "</strong><br/>" +
                region.text;

            tooltip.style.left = ev.clientX + 14 + "px";
            tooltip.style.top = ev.clientY + 10 + "px";

            tooltip.classList.add("visible");

            clearTimeout(tooltip._hideTimer);
            tooltip._hideTimer = setTimeout(() => {
                tooltip.classList.remove("visible");
            }, 4000);
        });

        // --- resize ---
        function resizeRenderer() {
            const rect = wrapper.getBoundingClientRect();
            const size = Math.min(rect.width, 460); // вёрстка ограничивает
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            renderer.setPixelRatio(dpr);
            renderer.setSize(size, size, false);

            camera.aspect = 1;
            camera.updateProjectionMatrix();
        }

        window.addEventListener("resize", resizeRenderer);
        resizeRenderer();

        // --- animation loop ---
        function render() {
            requestAnimationFrame(render);

            if (autoRotate) {
                earthGroup.rotation.y += 0.0028;
            } else {
                // плавно дотягиваем до таргета
                earthGroup.rotation.y +=
                    (targetRotY - earthGroup.rotation.y) * 0.03;
            }

            // лёгкий "дыхательный" дрейф sparkles
            sparkPoints.rotation.y += 0.0008;

            renderer.render(scene, camera);
        }

        render();
    }
})();
