var websocket = null;
var pluginUUID = null;

var DestinationEnum = Object.freeze({
    "HARDWARE_AND_SOFTWARE": 0,
    "HARDWARE_ONLY": 1,
    "SOFTWARE_ONLY": 2
})

var uuid;

var quickAction = {

    type: "io.streamdice.controller.basic",

    onKeyDown: function (context, settings, coordinates, userDesiredState) {

    },

    onKeyUp: function (context, settings, coordinates, userDesiredState) {
        var diceUUID = "";
        var diceValue = "3d6";

        if (settings != null && settings.hasOwnProperty("diceUUID")) {
            diceUUID = settings["diceUUID"];
            diceValue = settings["diceValue"];

            //TODO Update this to website version later
            var url = `http://192.168.50.190:3000/roll/${diceUUID}/${diceValue}`;
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
    },

    onWillAppear: function (context, settings, coordinates) {
        if (settings != null && settings.hasOwnProperty("diceUUID") && settings.diceUUID != "") {
            setTitle(context, settings.diceValue || "3D6");
        } else {
            //SHOW ERROR TILE
            setTitle(context, "UUID\n MISSING");
        }
    }
};

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    pluginUUID = inPluginUUID

    // Open the web socket
    websocket = new WebSocket("ws://127.0.0.1:" + inPort);

    function registerPlugin(inPluginUUID) {
        var json = {
            "event": inRegisterEvent,
            "uuid": inPluginUUID
        };

        websocket.send(JSON.stringify(json));
    };

    websocket.onopen = function () {
        // WebSocket is connected, send message
        registerPlugin(pluginUUID);
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
            if (action == "io.streamdice.controller.basic") {
                quickAction.onKeyUp(context, settings, coordinates, userDesiredState);
            }
        } else if (event == "willAppear") {
            settings = jsonPayload["settings"];
            var coordinates = jsonPayload["coordinates"];
            if (action == "io.streamdice.controller.basic") {
                quickAction.onWillAppear(context, settings, coordinates);
            }
        } else if (event == "sendToPlugin") {
            if (jsonPayload.hasOwnProperty("setUUID")) {
                uuid = jsonPayload.setUUID;
                settings.diceUUID = uuid;
                setTitle(context, "");
            }

            if (jsonPayload.hasOwnProperty("setQuickDice")) {
                settings.diceValue = jsonPayload.setQuickDice;

                setTitle(context, jsonPayload.setQuickDice);
            }

            setSettings(context, settings);
        }
    };

    websocket.onclose = function () {
        // Websocket is closed
    };
};