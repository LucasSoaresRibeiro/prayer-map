var resizeTimeout = null;
var hideMessage = null;
var timerCounter = 0;
var maxTimerCounterInSeconds = 8;
var mapZoom = 2.5;

var goToOptions = {
    speedFactor: 0.15, // less number is slower
    easing: "in-out-coast-quadratic" // easing function to slow down when reaching the target
};

const googleDocsId = "1dQDHSLGIvlboNZ2XKFOcG4okvHEcSOPePuX3GkFIjfY";
const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/e/${googleDocsId}/pub?gid=0&single=true&output=csv`

var map;
var view;
var currentPrayer;
var nextPrayer;
var lastSheetIndex;
var enableGlobeRotate = true;

$(function () {
    initMap("_map");
    setTimer();
    getLivePrayer();
    setInterval("setTimer()", 1000);
    setInterval("getLivePrayer()", (maxTimerCounterInSeconds + 1) * 1000);
    $("#prayer_watch_div").click(function () {
        toggleFullScreen();
    });
    $(window).resize(function () {
        resizeAll();
    });
    hideMessage = setTimeout("$('#click_message').fadeOut('slow')", 2000);
});

function sizeCountry() {
    var fontSize = 150;
    $("#_country_name span").css('font-size', fontSize + "px");
    var ourText = $("#_country_name span");
    var maxHeight = $("#_country_name").height();
    var textHeight = ourText.height();
    var maxWidth = $("#_country_name").width();
    var textWidth = ourText.width();
    while ((textWidth > maxWidth || textHeight > maxHeight) && fontSize > 10) {
        fontSize = fontSize - 1;
        $("#_country_name span").css('font-size', fontSize + "px");
        textHeight = ourText.height();
        textWidth = ourText.width();
    }
}

function sizeText() {
    var fontSize = 80;
    $("#_prayer_request_text").find("span").css('font-size', fontSize + "px");
    var ourText = $('span:visible:first', $("#_prayer_request_text"));
    var maxHeight = $("#_prayer_request_text").height() - parseInt($("#_prayer_request_text").css("padding-top")) - parseInt($("#_prayer_request_text").css("padding-bottom"));
    var textHeight = ourText.height();
    while (textHeight > maxHeight && fontSize > 10) {
        fontSize = fontSize - 1;
        $("#_prayer_request_text").find("span").css('font-size', fontSize + "px");
        textHeight = ourText.height();
    }
}

function resizeAll() {
    sizeCountry();
    sizeText();
    $("#_logo_lines").width($("#_logo img").width());
}

function toggleFullScreen() {
    if ($("#full_div").data("full") == "no") {
        clearTimeout(hideMessage);
        $("#click_message").html("Click to exit full screen").show();
        setTimeout("$('#click_message').fadeOut('slow')", 2000);
        if (document.documentElement.requestFullScreen) {
            document.documentElement.requestFullScreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullScreen) {
            document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
        $("#full_div").data("full", "yes");
    } else {
        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }
        $("#full_div").data("full", "no");
    }
    resizeAll();
}

function setTimer() {

    var minutes = Math.floor(timerCounter / 60);
    var seconds = timerCounter - minutes * 60;

    $("#timer").html(`${(minutes < 10 ? "0" : "") + minutes}:${(seconds < 10 ? "0" : "") + seconds}`);

    timerCounter--;
    if (timerCounter < 0) {
        timerCounter = 0;
    }
}

function getRandomSheetLine(sheetLines) {
    let randomIndex = Math.floor(Math.random() * sheetLines.length);
    while (randomIndex == lastSheetIndex) {
        randomIndex = Math.floor(Math.random() * sheetLines.length);
    }
    lastSheetIndex = randomIndex;
    return sheetLines[randomIndex];
}

function getSheetValue(sheetLine, columnName) {
    return sheetLine[`gsx$${columnName}`].$t;
}

function initMap(mapDiv) {

    require([
        "esri/Map",
        "esri/views/SceneView",
        "esri/Basemap",
        "esri/layers/TileLayer",
        "esri/layers/VectorTileLayer",
        "esri/core/watchUtils"
      ], function(Map, SceneView, Basemap, TileLayer, VectorTileLayer, watchUtils) {
      
        /*****************************************
         * Define map and view
         *****************************************/

        // // Relief
        // var basemap = new Basemap({
        //     baseLayers: [new TileLayer({
        //       url: "https://tiles.arcgis.com/tiles/nGt4QxSblgDfeJn9/arcgis/rest/services/VintageShadedRelief/MapServer",
        //       opacity: 0.7,
        //       minScale: 0
        //     })]
        // });

        // Charted Territory
        var basemap = new Basemap({
            baseLayers: [
              new VectorTileLayer({
                portalItem: {
                  id: "4eb3dd72d8224e41bd259e952dcac3fe"
                }
              })
            ]
        });
      
        map = new Map({
          basemap: basemap,
          ground: {
            surfaceColor: [255, 255, 255]
          }
        });
      
        view = new SceneView({
          container: mapDiv,
          camera: {
            position: [-96.22, 15.26, 17000000],
            heading: 0,
            tilt: 0
          },
          qualityProfile: "medium",
          map: map,
          alphaCompositingEnabled: true,
          environment: {
            background: {
              type: "color",
              color: [0, 0, 0, 0]
            },
            starsEnabled: false,
            atmosphereEnabled: false
          },
          highlightOptions: {
            fillOpacity: 0,
            color: "#ffffff"
          },
          constraints: {
            altitude: {
              min: 400000
            }
          }
        });

        // Remove all widgets on map
        view.ui.components = [];

        // Event on loaded
        view.when(function(){
            pinMap(currentPrayer.x, currentPrayer.y);
            watchUtils.whenFalseOnce(view, "updating", rotate);
          }, function(error){
            console.error(error);
        });

    });
}

/*****************************************
 * Flow Functions
 *****************************************/

function getLivePrayer() {

    timerCounter = maxTimerCounterInSeconds;

    if (nextPrayer != undefined) {
        renderPrayer(nextPrayer)
    }

    requestNextPrayer();
}

function requestNextPrayer() {

    $.ajax({
        url: googleSheetsUrl,
        type: "GET",
        timeout: 10000,
        success: function (response) {

            // read sheet
            const sheetLines = JSON.parse(response).feed.entry;
            const sheetLine = getRandomSheetLine(sheetLines);

            const prayer = {
                "locality": getSheetValue(sheetLine, "localidade"),
                "prayer": getSheetValue(sheetLine, "pedido"),
                "address": getSheetValue(sheetLine, "endereco")
            }

            // geocode address
            geocodeAddress(prayer);
            
        },
        dataType: "text"
        }
    );
}

function geocodeAddress(prayer) {

    $.ajax({
        url: `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&outSR=4326&maxLocations=1&SingleLine=${prayer.address}`,
        type: "GET",
        timeout: 10000,
        success: function (response) {

            const jsonResponse = JSON.parse(response);

            if (jsonResponse.candidates.length > 0) {
                prayer.x = jsonResponse.candidates[0].location.x;
                prayer.y = jsonResponse.candidates[0].location.y;
            } else {
                prayer.x = 0;
                prayer.y = 0;
            }

            saveNextPrayerRequest(prayer);
            
        },
        dataType: "text"
        }
    );
}

function saveNextPrayerRequest(prayer) {

    if (currentPrayer == undefined) {
        currentPrayer = prayer;
        renderPrayer(currentPrayer);
        requestNextPrayer();
    } else {
        nextPrayer = prayer;
    }

}

function renderPrayer(prayer) {

    pinMap(prayer.x, prayer.y);
    $("#_prayer_request_text span").html(prayer.prayer);
    $("#_country_name span").html(prayer.locality);
    resizeAll();

}

function pinMap(x, y) {

    require([
        "esri/Graphic"
      ], function(Graphic) {

        if (map) {

            view.graphics.removeAll();

            if ( y != 0 && x != 0 ) {

                // Address result

                var point = {
                    type: "point",
                    x: x,
                    y: y
                };
    
                // var markerSymbol = {
                //     type: "simple-marker",
                //     color: [226, 119, 40]
                // };

                var markerSymbol = {
                    type: "web-style",
                    styleName: "EsriIconsStyle",
                    name: "Pushpin 3"
                };

                var pointGraphic = new Graphic({
                    geometry: point,
                    symbol: markerSymbol
                });
                
                view.graphics.add(pointGraphic);

                setTimeout(() => {

                    view.goTo({
                        center: [x, y],
                        zoom: mapZoom,
                        heading: 0,
                        tilt: 0
                    }, goToOptions)

                }, 2000);
                
                enableGlobeRotate = false;

            } else {

                // World result
                enableGlobeRotate = true;
                rotate();

            }
            
        }

    });
}

function rotate() {
    if (enableGlobeRotate) {
        const camera = view.camera.clone();
        camera.position.longitude -= 0.05;
        view.goTo(camera, { animate: false });
        requestAnimationFrame(rotate);
    }
}
