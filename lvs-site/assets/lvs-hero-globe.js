// Мини-глобус в круге на главной странице (#miniGlobe)

(function () {
    // Ждём полной загрузки, чтобы контейнер точно существовал
    window.addEventListener("load", function () {
        if (typeof Cesium === "undefined") return;

        var container = document.getElementById("miniGlobe");
        if (!container) return;

        // ТВОЙ реальный токен
        Cesium.Ion.defaultAccessToken =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

        var viewer = new Cesium.Viewer(container, {
            imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
            // без terrain → легче, стабильнее, а для мини-глобуса не критично
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            fullscreenButton: false,
            infoBox: false,
            selectionIndicator: false,
            shouldAnimate: true
        });

        var scene = viewer.scene;
        scene.globe.enableLighting = true;
        scene.skyAtmosphere.show = true;
        scene.skyBox.show = false;
        scene.backgroundColor = Cesium.Color.TRANSPARENT;

        // стартовая позиция камеры
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(10.0, 20.0, 15000000.0)
        });

        // убираем даблклик-зум
        viewer.screenSpaceEventHandler.removeInputAction(
            Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
        );

        // Лёгкое авто-вращение
        var lastTime = viewer.clock.currentTime.clone();
        var spinRate = 0.03;

        viewer.clock.onTick.addEventListener(function (clock) {
            var currentTime = clock.currentTime;
            var deltaSeconds = Cesium.JulianDate.secondsDifference(
                currentTime,
                lastTime
            );
            lastTime = currentTime;

            viewer.scene.camera.rotate(
                Cesium.Cartesian3.UNIT_Z,
                -spinRate * deltaSeconds
            );
        });

        // По клику переходим на полную карту
        container.style.cursor = "pointer";
        container.addEventListener("click", function () {
            window.location.href = "space.html";
        });
    });
})();
