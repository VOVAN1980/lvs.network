// assets/lvs-hero-globe.js
(function () {
    // Если Cesium не подгрузился - тихо выходим
    if (typeof Cesium === "undefined") return;

    const container = document.getElementById("lvs-hero-globe");
    if (!container) return; // перестраховка, чтобы не ловить appendChild of null

    // Твой реальный токен Cesium Ion
    Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

    // Мини-viewer для главной страницы
    const viewer = new Cesium.Viewer(container, {
        imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }), // глобус как в Space
        terrain: Cesium.Terrain.fromWorldTerrain(),

        animation: false,
        timeline: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: false
    });

    const scene = viewer.scene;
    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show = true;
    scene.skyBox.show = true;

    // Стартовая камера — Европа / Африка примерно как на скрине
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(10, 20, 20000000),
        duration: 0
    });

    // Убираем стандартный double-click zoom, нам не нужен
    viewer.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // Клик по кругу → переходим на полноэкранный Space-глобус
    const clickArea = document.getElementById("lvs-globe-click-area");
    if (clickArea) {
        clickArea.style.cursor = "pointer";
        clickArea.addEventListener("click", function () {
            window.location.href = "space.html";
        });
    }

    // (опционально) можно чуть-чуть медленно вращать Землю
    viewer.clock.onTick.addEventListener(function () {
        const camera = viewer.camera;
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.00003); // лёгкий дрейф
    });
})();
