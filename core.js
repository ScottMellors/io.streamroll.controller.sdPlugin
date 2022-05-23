var websocket = null;
var pluginUUID = null;

let DOMAIN = "http://localhost:3000/";
//let DOMAIN = "https://streamroll.io/";

var DestinationEnum = Object.freeze({
    "HARDWARE_AND_SOFTWARE": 0,
    "HARDWARE_ONLY": 1,
    "SOFTWARE_ONLY": 2
})

var uuid;

var quickAction = {

    type: "io.streamroll.controller.basic",

    onKeyDown: function (context, settings, coordinates, userDesiredState) {

    },

    onKeyUp: function (context, settings, coordinates, userDesiredState) {
        var diceUUID = "";
        var diceValue = "3d6";

        if (settings != null && globalSettings.hasOwnProperty("diceUUID")) {
            diceUUID = globalSettings["diceUUID"];
            diceValue = settings["diceValue"];

            //might need to change this to POST
            var url = `${DOMAIN}roll/${diceUUID}/${diceValue}`;
            fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            }).then(response => {
                //get response code and alert if bad
                let statusCode = response.status;

                if (statusCode == 404) {
                    showError(context);
                } else if (statusCode == 500) {
                    showError(context);
                }
            }).catch((reason) => {
                showError(context);
            });
        } else {
            showError(context);
        }
    },

    onWillAppear: function (context, settings, coordinates) {
        if (settings != null && globalSettings.hasOwnProperty("diceUUID") && globalSettings.diceUUID != "") {
            setTitle(context, settings.diceValue || "3D6");
        } else {
            //SHOW ERROR TILE
            setTitle(context, "UUID\n MISSING");
        }
    }
};

let clearListAction = {

    type: "io.streamroll.controller.listClearAll",

    onKeyUp: function (context, settings, coordinates, userDesiredState) {
        var listUUID = "";

        if (settings != null && settings.hasOwnProperty("diceUUID")) {
            listUUID = settings["diceUUID"];

            var url = `${DOMAIN}listclear/${listUUID}`;
            fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            }).then(response => {
                //get response code and alert if bad
                let statusCode = response.status;

                if (statusCode == 404) {
                    showError(context);
                } else if (statusCode == 500) {
                    showError(context);
                }
            }).catch((reason) => {
                showError(context);
            });

        }
    }
};

let clearListTopAction = {};
let globalSettings = undefined;

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    pluginUUID = inPluginUUID;

    // Open the web socket
    websocket = new WebSocket("ws://127.0.0.1:" + inPort);

    websocket.onopen = function () {
        // WebSocket is connected, send message
        registerPlugin(pluginUUID, inRegisterEvent);
    };

    websocket.onmessage = function (evt) {
        // Received message from Stream Deck
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj["event"];
        var action = jsonObj["action"];
        var context = jsonObj["context"];
        var jsonPayload = jsonObj["payload"] || {};
        var settings = jsonPayload["settings"] || {};

        if (event == "keyUp") {
            var settings = jsonPayload["settings"];
            var coordinates = jsonPayload["coordinates"];
            var userDesiredState = jsonPayload["userDesiredState"];
            if (action == "io.streamroll.controller.basic") {
                quickAction.onKeyUp(context, settings, coordinates, userDesiredState);
            }
        } else if (event == "willAppear") {
            settings = jsonPayload["settings"];

            if (!globalSettings) {
                requestGlobalSettings(pluginUUID);
            }

            var coordinates = jsonPayload["coordinates"];
            if (action == "io.streamroll.controller.basic") {
                quickAction.onWillAppear(context, settings, coordinates);
            }
        } else if (event == "sendToPlugin") {
            if (jsonPayload.hasOwnProperty("setQuickDice")) {
                settings.diceValue = jsonPayload.setQuickDice;

                setTitle(context, jsonPayload.setQuickDice);
                setSettings(context, settings);
            }

            if (jsonPayload.hasOwnProperty("setUUID")) {
                uuid = jsonPayload.setUUID;
                globalSettings.diceUUID = uuid;
                setTitle(context, settings.diceValue || "");

                saveGlobalSettings(pluginUUID, globalSettings);
            }

            /*
            if (jsonPayload.hasOwnProperty("setUUID")) {
                uuid = jsonPayload.setUUID;
                settings.diceUUID = uuid;
                setTitle(context, "");
            } */




        } else if (event == "didReceiveGlobalSettings") {
            globalSettings = jsonPayload.settings;
        }
    };

    websocket.onclose = function () {
        // Websocket is closed
    };
};