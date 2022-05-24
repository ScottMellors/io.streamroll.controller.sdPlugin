/* if ($SD) {
    $SD.on('connected', function (jsonObj) {
        uuid = jsonObj['uuid'];
        if (jsonObj.hasOwnProperty('actionInfo')) {
            pluginAction = jsonObj.actionInfo['action'];
        }

        var workingUUID = jsonObj.actionInfo.payload.settings.diceUUID || undefined;
        if (workingUUID == undefined) {
            workingUUID = "";
        }

        //load settings
        document.getElementById('dice_uuid').value = workingUUID;

        if (pluginAction == "io.streamroll.controller.basic") {

            //Might need to be flex?
            document.getElementById("dice_roll_item").style.display = "flex";

            //load setting
            var diceVal = jsonObj.actionInfo.payload.settings.diceValue;
            if (diceVal == undefined) {
                diceVal = "3D6";
            }
            document.getElementById("dice_roll_value").value = diceVal;
        } else {
            //hide it
            document.getElementById("dice_roll_item").style.display = "none";
        }
    });   
}; */

function sendValueToPlugin(type) {
    var payload = {};

    console.log(document.querySelector('input[name="uuidStateRadio"]:checked').value);

    if (type === "uuidUpdateState") {
        //if state is global, replace field with global value
        if (document.querySelector('input[name="uuidStateRadio"]:checked').value == "global") {
            document.getElementById("dice_uuid").value = globalSettings.diceUUID;
        } else {
            document.getElementById("dice_uuid").value = settings.diceUUID;
        }
    }

    if (type === 'setQuickDice') {
        payload["setQuickDice"] = document.getElementById("dice_roll_value").value;
    } else if (pluginAction === "io.streamroll.controller.basic") {
        payload["setQuickDice"] = document.getElementById("dice_roll_value").value || "3D6";
    }

    payload["setUUID"] = document.getElementById("dice_uuid").value;
    payload["setUUIDState"] = document.querySelector('input[name="uuidStateRadio"]:checked').value

    const json = {
        "action": actionInfo['action'],
        "event": "sendToPlugin",
        "context": uuid,
        "payload": payload
    };

    websocket.send(JSON.stringify(json));
}

let globalSettings = {};
let settings = {};
let actionInfo = {};
let websocket = undefined;
let pluginAction = undefined;
let uuid;

var workingUUID;

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inUUID;
    // please note: the incoming arguments are of type STRING, so
    // in case of the inActionInfo, we must parse it into JSON first
    actionInfo = JSON.parse(inActionInfo); // cache the info
    websocket = new WebSocket('ws://localhost:' + inPort);

    var info = JSON.parse(inInfo);

    // Retrieve language
    var language = info['application']['language'];

    PI(language);

    // if connection was established, the websocket sends
    // an 'onopen' event, where we need to register our PI
    websocket.onopen = function () {
        let json = {
            event: inRegisterEvent,
            uuid: uuid
        };
        // register property inspector to Stream Deck
        websocket.send(JSON.stringify(json));

        let settingsJson = {
            'event': 'getGlobalSettings',
            'context': uuid
        };

        websocket.send(JSON.stringify(settingsJson));
    };

    websocket.onmessage = function (evt) {
        // Received message from Stream Deck
        let subJsonObj = JSON.parse(evt.data);
        let event = subJsonObj.event;
        let jsonPayload = subJsonObj.payload || {};

        if (event === "didReceiveGlobalSettings") {
            globalSettings = jsonPayload.settings;

            var workingUUID = globalSettings.diceUUID;

            //load settings
            document.getElementById('dice_uuid').value = workingUUID;

            //do get local settings

            let settingsJson = {
                'event': 'getSettings',
                'context': uuid
            };

            websocket.send(JSON.stringify(settingsJson));

        } else if (event === "didReceiveSettings") {
            pluginAction = subJsonObj.action;
            settings = jsonPayload.settings;

            var workingUUID = undefined;

            if (jsonPayload.settings.uuidState == "local") {

                document.getElementById("rdio2").checked = true;
                workingUUID = jsonPayload.settings.diceUUID || undefined;
            } else {
                workingUUID = globalSettings.diceUUID || undefined;
            }

            document.getElementById('dice_uuid').value = workingUUID || "";

            if (pluginAction == "io.streamroll.controller.basic") {
                document.getElementById("dice_roll_item").style.display = "flex";

                //load setting
                var diceVal = jsonPayload.settings.diceValue || "3D6";
                document.getElementById("dice_roll_value").value = diceVal;
            } else {
                //hide it
                document.getElementById("dice_roll_item").style.display = "none";
            }
        }
    };
}


function PI(inLanguage) {
    // Init PI
    instance = this;

    // Public localizations for the UI
    this.localization = {};

    // Load the localizations
    getLocalization(inLanguage, function (inStatus, inLocalization) {
        if (inStatus) {
            // Save public localization
            instance.localization = inLocalization['PI'];

            // Localize the PI
            instance.localize();
        } else {
            console.log(inLocalization);
        }
    });

    // Localize the UI
    this.localize = function () {
        // Check if localizations were loaded
        if (instance.localization == null) {
            return;
        }

        // Localize the fields
        document.getElementById('dice_setup_heading').innerHTML = instance.localization['DiceSetup'];
        document.getElementById('stateRdioLabel').innerHTML = instance.localization['Use'];
        document.getElementById('rdio1Label').innerHTML = instance.localization['UUIDStatePreset'];
        document.getElementById('rdio2Label').innerHTML = instance.localization['UUIDStateLocal'];
        document.getElementById('uuidLabel').innerHTML = instance.localization['DiceUUID'];
        document.getElementById('valueLabel').innerHTML = instance.localization['DiceRollValue'];
    };
}