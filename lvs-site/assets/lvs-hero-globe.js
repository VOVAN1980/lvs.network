Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNGJlYzY3MS0wNzg0LTRhMTYtYTg4ZS0wZDk2Njk4MmJkODAiLCJpZCI6MzYzOTE1LCJpYXQiOjE3NjQxMTY4MTd9.mB7rmSUqh2vbP7RDT5B2nQMtOOoRNX0U1e3Z09v5ILM";

const viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    baseLayerPicker: true,
    fullscreenButton: false,
});

// Когда кликают на место на Земле
const handler = viewer.screenSpaceEventHandler;

handler.setInputAction(function (movement) {
    const cartesian = viewer.camera.pickEllipsoid(
        movement.position,
        Cesium.Ellipsoid.WGS84
    );

    if (!cartesian) return;

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);

    const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
    const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);

    console.log("Клик по координатам:", lat, lon);

    alert("Регион: " + lat + ", " + lon +
          "\nВ будущем: показать вакансии, компании и задания.");
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);


// центрирование по пользователю
function focusMyRegion() {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lon, lat, 2000000),
            });
        },
        () => {
            alert("Невозможно получить местоположение.");
        }
    );
}
