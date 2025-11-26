// assets/lvs-hero-globe.js
// Мини-глобус в hero. Крутится сам, по клику — переход на space.html

(function () {
    if (typeof Cesium === "undefined") return;

    // реальный токен (тот же, что в space.js)
    Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

    const container = document.getElementById("lvs-hero-globe");
    if (!container) return;

    const viewer = new Cesium.Viewer(container, {
        animation: false,
        timeline: false,
        fullscreenButton: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        selectionIndicator: false,
        shouldAnimate: false
        // НИКАКИХ createOsmImagery / кастомных imageryProvider — только дефолт
    });

    // убираем копирайт Cesium
    if (viewer.cesiumWidget && viewer.cesiumWidget.creditContainer) {
        viewer.cesiumWidget.creditContainer.style.display = "none";
    }

    const scene = viewer.scene;
    const camera = viewer.camera;

    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show = true;

    // стартовая позиция — красиво видим Европу/Африку
    camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(10, 20, 20000000)
    });

    // лёгкое авто-вращение
    let lastTime = performance.now();
    scene.preRender.addEventListener(function () {
        const now = performance.now();
        const deltaSeconds = (now - lastTime) / 1000;
        lastTime = now;

        camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.08 * deltaSeconds);
    });

    // клик по шару → полная карта
    container.addEventListener("click", function () {
        window.location.href = "space.html";
    });
})();
