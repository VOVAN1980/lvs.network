// assets/lvs-hero-globe.js
// Мини-прод-глобус на Cesium в хиро. Крутится, даёт покрутить, клик → space.html

(function () {
    if (typeof Cesium === "undefined") return;

    // ВСТАВЬ СЮДА СВОЙ РЕАЛЬНЫЙ TOKEN
    Cesium.Ion.defaultAccessToken = "ТВОЙ_CESIUM_TOKEN";

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
        shouldAnimate: false,
        imageryProvider: Cesium.createWorldImagery(),
        terrain: Cesium.Terrain.fromWorldTerrain()
    });

    // убираем надпись Cesium снизу
    viewer.cesiumWidget.creditContainer.style.display = "none";

    const scene = viewer.scene;
    const camera = viewer.camera;

    // стартовая позиция — красиво видно Европу/планету
    camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(10, 30, 20000000) // lon, lat, height (meters)
    });

    // Лёгкое авто-вращение вокруг оси Z
    let lastTime = performance.now();
    scene.preRender.addEventListener(function () {
        const now = performance.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // медленное вращение
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.08 * delta);
    });

    // Клик по шару → переход на прод-страницу с большим глобусом
    container.addEventListener("click", function () {
        window.location.href = "space.html";
    });
})();
