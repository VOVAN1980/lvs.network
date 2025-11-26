(function () {
    if (typeof Cesium === "undefined") return;

    // Токен один и тот же, всё ок
    Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

    var backBtn = document.getElementById("space-back-btn");

    function goBack() {
        window.location.href = "index.html#work";
    }

    if (backBtn) {
        backBtn.addEventListener("click", goBack);
    }

    // ----- VIEWER -----
    var viewer = new Cesium.Viewer("cesiumContainer", {
        imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
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
        selectionIndicator: false
    });

    // убираем кредиты
    viewer._cesiumWidget._creditContainer.style.display = "none";

    var scene = viewer.scene;
    scene.globe.enableLighting = true;
    scene.skyAtmosphere.show = true;
    scene.skyBox.show = true;

    // стартовая позиция камеры
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(10, 50, 15000000),
        duration: 0
    });

    // убираем стандартный даблклик-зум
    viewer.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // ----- CITIES -----
    var CITY_DATA = [
        { name: "Bad Kreuznach", lat: 49.8454, lon: 7.8670 },
        { name: "Mainz",        lat: 49.9929, lon: 8.2473 },
        { name: "Frankfurt",    lat: 50.1109, lon: 8.6821 },
        { name: "Berlin",       lat: 52.5200, lon: 13.4050 },
        { name: "Hamburg",      lat: 53.5511, lon: 9.9937 },
        { name: "Munich",       lat: 48.1351, lon: 11.5820 },

        { name: "Paris",        lat: 48.8566, lon: 2.3522 },
        { name: "London",       lat: 51.5074, lon: -0.1278 },
        { name: "Warsaw",       lat: 52.2297, lon: 21.0122 },
        { name: "Prague",       lat: 50.0755, lon: 14.4378 },
        { name: "Vienna",       lat: 48.2082, lon: 16.3738 },
        { name: "Rome",         lat: 41.9028, lon: 12.4964 },
        { name: "Madrid",       lat: 40.4168, lon: -3.7038 },

        { name: "New York",     lat: 40.7128, lon: -74.0060 },
        { name: "Los Angeles",  lat: 34.0522, lon: -118.2437 },
        { name: "Tokyo",        lat: 35.6762, lon: 139.6503 },
        { name: "Seoul",        lat: 37.5665, lon: 126.9780 },
        { name: "Singapore",    lat: 1.3521,  lon: 103.8198 },
        { name: "Sydney",       lat: -33.8688, lon: 151.2093 },
        { name: "São Paulo",    lat: -23.5505, lon: -46.6333 }
    ];

    CITY_DATA.forEach(function (city) {
        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat),
            point: {
                pixelSize: 8,
                color: Cesium.Color.YELLOW.withAlpha(0.95),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1
            },
            label: {
                text: city.name,
                font: "12px 'Segoe UI', sans-serif",
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -18),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            properties: {
                cityName: city.name,
                lat: city.lat,
                lon: city.lon
            }
        });
    });

    // ----- DOUBLE CLICK HANDLER -----
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction(function (click) {
        var picked = scene.pick(click.position);

        if (picked && picked.id && picked.id.properties) {
            var props = picked.id.properties;

            var name = props.cityName.getValue();
            var lat  = props.lat.getValue();
            var lon  = props.lon.getValue();

            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lon, lat, 800000),
                duration: 0.9
            });

            setTimeout(function () {
                window.location.href =
                    "/lvs-site/region.html?city=" +
                    encodeURIComponent(name) +
                    "&lat=" + lat +
                    "&lon=" + lon;
            }, 400);

            return;
        }

        // клик в пустоту → просто летим ближе к месту
        var ellipsoid  = scene.globe.ellipsoid;
        var cartesian  = viewer.camera.pickEllipsoid(click.position, ellipsoid);
        if (!cartesian) return;

        var cartographic = ellipsoid.cartesianToCartographic(cartesian);

        var lat = Cesium.Math.toDegrees(cartographic.latitude);
        var lon = Cesium.Math.toDegrees(cartographic.longitude);

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1600000),
            duration: 0.9
        });
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // ESC → назад
    window.addEventListener("keydown", function (e) {
        if (e.key === "Escape") goBack();
    });
})();
