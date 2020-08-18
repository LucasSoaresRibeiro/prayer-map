var resizeTimeout = null;
var hideMessage = null;
var timerCounter = 0;

const googleDocsId = "1QMWEANTHyzdwIH5PGTUZGw_AqOGwNX73ST0rEqRJ0W0";
const googleDocsSheetId = "od6";
const googleSheetsUrl = `https://spreadsheets.google.com/feeds/list/${googleDocsId}/${googleDocsSheetId}/public/values?alt=json`

var map;
var view;
var latitude;
var longitude;

$(function () {
    initMap("_map");
    setTimer();
    getLivePrayer();
    setInterval("setTimer()", 1000);
    setInterval("getLivePrayer()", 60000);
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
    $("#timer").html("00:" + (timerCounter < 10 ? "0" : "") + timerCounter);
    timerCounter--;
    if (timerCounter < 0) {
        timerCounter = 0;
    }
}

function getLivePrayer() {
    timerCounter = 60;
    $.ajax({
        url: googleSheetsUrl,
        type: "GET",
        timeout: 10000,
        success: function (response) {
            renderPrayerRequest(JSON.parse(response));
        },
        dataType: "text"
        }
    );
}

function initMap(mapDiv) {

    require([
        "esri/Map",
        "esri/layers/GeoJSONLayer",
        "esri/views/SceneView",
        "esri/Basemap",
        "esri/layers/TileLayer",
        "esri/widgets/Legend",
        "esri/widgets/HistogramRangeSlider",
        "esri/renderers/smartMapping/statistics/histogram",
        "esri/core/promiseUtils"
      ], function(Map, GeoJSONLayer, SceneView, Basemap, TileLayer, Legend, HistogramRangeSlider, histogram, promiseUtils) {
      
        /*****************************************
         * Define map and view
         *****************************************/
      
        map = new Map({
          basemap: new Basemap({
            baseLayers: [new TileLayer({
              url: "https://tiles.arcgis.com/tiles/nGt4QxSblgDfeJn9/arcgis/rest/services/VintageShadedRelief/MapServer",
              opacity: 0.7,
              minScale: 0
            })]
          }),
          ground: {
            surfaceColor: [255, 255, 255]
          }
        });
      
        view = new SceneView({
          container: mapDiv,
          camera: {
            position: [-96.22, 15.26, 20000000],
            heading: 0,
            tilt: 0
          },
          qualityProfile: "high",
          map: map,
          alphaCompositingEnabled: true,
          environment: {
            background: {
              type: "color",
              color: [0, 0, 0, 0]
            },
            lighting: {
              date: "Sun Jul 15 2018 21:04:41 GMT+0200 (Central European Summer Time)",
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
            pinMap();
          }, function(error){
            console.error(error);
        });

    });
}

function getSheetValue(sheetLine, columnName) {
    return sheetLine[`gsx$${columnName}`].$t;
}

function renderPrayerRequest(response) {

    const sheetLines = response.feed.entry;
    const sheetLine = sheetLines[0];

    const country_name = getSheetValue(sheetLine, "localidade");
    const live_prayer = getSheetValue(sheetLine, "pedido");
    latitude = getSheetValue(sheetLine, "latitude");
    longitude = getSheetValue(sheetLine, "longitude");

    pinMap();

    $("#_prayer_request_text span").html(live_prayer);
    $("#_country_name span").html(country_name);
    resizeAll();

}

function pinMap() {

    require([
        "esri/Graphic"
      ], function(Graphic) {
    
        console.log(latitude, longitude);

        if (map && latitude && longitude) {
        
            // add graphic marker
            var point = {
                type: "point",
                longitude: -71.2643,
                latitude: 42.0909
            };

            // Create a symbol for drawing the point
            var markerSymbol = {
                type: "simple-marker",
                color: [226, 119, 40]
            };

            // Create a graphic and add the geometry and symbol to it
            var pointGraphic = new Graphic({
                geometry: point,
                symbol: markerSymbol
            });
            
            view.graphics.add(pointGraphic);
            
            // zoom to result
            var options = {
                speedFactor: 0.1, // animation is 10 times slower than default
                easing: "out-quint" // easing function to slow down when reaching the target
            };

            view.goTo({center: [latitude, longitude] }, options)
            
        }

    });
}

/*
TODO:
- Ler linhas aleatoriamente
- Adicionar coordenadas no mapa com simbologia
- Fazer efeito de zoom ao trocar
*/