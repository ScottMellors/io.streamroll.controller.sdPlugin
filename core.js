var websocket = null;
var pluginUUID = null;

//let DOMAIN = "http://localhost:3000";
let DOMAIN = "https://streamroll.io";

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

        if (settings != undefined && globalSettings != undefined) {

            if (settings["uuidState"] == "custom") {
                diceUUID = settings["diceUUID"];
            } else {
                diceUUID = globalSettings["diceUUID"];
            }

            diceValue = settings["diceValue"] || "3D6";

            let diceConfig = settings["rollOptions"] || {};

            let url = `${DOMAIN}/roll/`;

            let displayName = settings["displayName"] || "";

            let updatedRollEvents = {};
            let rollEventKeys = Object.keys(diceConfig.rollEvents || {});

            for (let i = 0; i < rollEventKeys.length; i++) {
                //get object at key
                let rollEventVal = diceConfig.rollEvents[rollEventKeys[i]];
                //TODO EVENT ACTIONS NEED TO BE AN ARRAY, CURRENTLY BORKIN
                updatedRollEvents[rollEventKeys[i]] = { eventTitle: rollEventVal.eventTitle, eventActions: diceConfig.rollEvents[rollEventKeys[i]].eventActions };
            }

            //send request to BE
            fetch(url, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uuid: diceUUID,
                    notation: diceValue,
                    rollEvents: updatedRollEvents,
                    listStyle: diceConfig.rollListStyle || {},
                    roller: displayName || "Streamroller"
                })
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
        if (settings != null) {
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
        if (settings != null) {
            let listUUID;

            if (settings["uuidState"] == "custom") {
                listUUID = settings["diceUUID"];
            } else {
                listUUID = globalSettings["diceUUID"];
            }

            var url = `${DOMAIN}/listclear/${listUUID}`;
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
    }
};

let clearListTopAction = {
    type: "io.streamroll.controller.listClearTop",
    onKeyUp: function (context, settings, coordinates, userDesiredState) {
        if (settings != null) {
            let listUUID;

            if (settings["uuidState"] == "custom") {
                listUUID = settings["diceUUID"];
            } else {
                listUUID = globalSettings["diceUUID"];
            }

            var url = `${DOMAIN}/listcleartop/${listUUID}`;
            fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            }).then(response => {
                console.log(response);

                //get response code and alert if bad
                let statusCode = response.status;

                if (statusCode == 404) {
                    showError(context);
                } else if (statusCode == 500) {
                    showError(context);
                }
            }).catch((reason) => {
                console.log(reason);
                showError(context);
            });

        } else {
            showError(context);
        }
    }
};

let keyUpActions = {
    "basic": quickAction,
    "listclearall": clearListAction,
    "listcleartop": clearListTopAction
};

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

            //get correct variable for id
            let actionType = action.replace("io.streamroll.controller.", "");
            let actionObj = keyUpActions[actionType];
            if (actionObj) {
                actionObj.onKeyUp(context, settings, coordinates, userDesiredState);
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
            }

            if (jsonPayload.hasOwnProperty("rollOptions")) {
                settings.rollOptions = JSON.parse(jsonPayload.rollOptions);
            }

            if (jsonPayload.hasOwnProperty("rollerNameUpdate")) {
                settings.displayName = jsonPayload.rollerNameUpdate;
            }

            if (jsonPayload.hasOwnProperty("setUUID") && jsonPayload.hasOwnProperty("setUUIDState")) {
                uuid = jsonPayload.setUUID;

                settings.uuidState = jsonPayload.setUUIDState;

                if (jsonPayload.setUUIDState == "global") {
                    globalSettings.diceUUID = uuid;
                } else {
                    settings.diceUUID = uuid;
                }

                //setSettings(context, settings);
                saveGlobalSettings(pluginUUID, globalSettings);
                setTitle(context, settings.diceValue || "");
            }

            setSettings(context, settings);

        } else if (event == "didReceiveGlobalSettings") {
            globalSettings = jsonPayload.settings;
        }
    };

    websocket.onclose = function () {
        // Websocket is closed
    };
};