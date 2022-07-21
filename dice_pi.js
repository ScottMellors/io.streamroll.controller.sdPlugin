let globalSettings = {};
let settings = {};
let actionInfo = {};
let websocket = undefined;
let pluginAction = undefined;
let uuid;

var workingUUID;

//PI Funcs

function loadInfoWindow() {
    //pop open a widnow to the website export info page
    window.open("https://streamroll.io/export-info", "_blank");
}

function importSettings() {
    //get input field
    let inputFieldValue = document.getElementById("importInput").value.trim();

    //alert if length == 0 || json doesnt validate?
    if (inputFieldValue.length == 0) {
        alert("Missing an import string, please enter one and try again!");
    } else {
        //save to local settings
        try {
            let config = JSON.parse(inputFieldValue);

            let configCount = 0;
            if (config.rollListStyle) {
                configCount += 1;
            }

            if (config.rollEvents) {
                configCount += Object.keys(config.rollEvents).length;
            }

            //update currentStyleLabel
            document.getElementById("currentStyleCountLabel").innerHTML = instance.localization['StyleItemsLabel'].replace("{num}", configCount);

            sendValueToPlugin('rollOptions');

            //show success?
            alert("Style Updated!");
        } catch (e) {
            alert("There is something wrong with the imported settings, please check and try again!");
        }
    }
}

// StreamDeck Funcs

function sendValueToPlugin(type) {
    var payload = {};

    payload.settings = settings;

    if (type === "uuidUpdateState") {
        //if state is global, replace field with global value
        if (document.querySelector('input[name="uuidStateRadio"]:checked').value == "global") {
            document.getElementById("dice_uuid").value = globalSettings.diceUUID;
        } else {
            document.getElementById("dice_uuid").value = settings.diceUUID;
        }
    } else if (type === "rollOptions") {
        payload["rollOptions"] = document.getElementById("importInput").value.trim();
        document.getElementById("importInput").value = "";
    }

    if (type === 'setQuickDice') {
        payload["setQuickDice"] = document.getElementById("dice_roll_value").value;
    } else if (pluginAction === "io.streamroll.controller.basic") {
        payload["setQuickDice"] = document.getElementById("dice_roll_value").value || "3D6";
    }

    if (type === 'rollerNameUpdate') {
        payload["rollerNameUpdate"] = document.getElementById("rollerName").value;
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
                document.getElementById("dice_roll_extras").style.display = "flex";
                //load setting
                var diceVal = jsonPayload.settings.diceValue || "3D6";
                document.getElementById("dice_roll_value").value = diceVal;

                let diceRollerName = jsonPayload.settings.displayName || "";
                document.getElementById("rollerName").value = diceRollerName;

                let config = jsonPayload.settings.rollOptions || {};

                let configCount = 0;
                if (config.rollListStyle) {
                    configCount += 1;
                }

                if (config.rollEvents) {
                    configCount += Object.keys(config.rollEvents).length;
                }

                //update currentStyleLabel
                document.getElementById("currentStyleCountLabel").innerHTML = instance.localization['StyleItemsLabel'].replace("{num}", configCount);

            } else {
                //hide it
                document.getElementById("dice_roll_item").style.display = "none";
                document.getElementById("dice_roll_extras").style.display = "none";
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
        document.getElementById('rdio1Label').innerHTML = "<span></span>" + instance.localization['UUIDStatePreset'];
        document.getElementById('rdio2Label').innerHTML = "<span></span>" + instance.localization['UUIDStateLocal'];
        document.getElementById('uuidLabel').innerHTML = instance.localization['DiceUUID'];
        document.getElementById('valueLabel').innerHTML = instance.localization['DiceRollValue'];

        //dice Options labels
        document.getElementById('roll_options_heading').innerHTML = instance.localization['RollOptions'];
        document.getElementById('roll_style_heading').innerHTML = instance.localization['RollStyle'];
        document.getElementById('roller_details_heading').innerHTML = instance.localization['RollerDetailsHeading'];
        document.getElementById('roller_name_label').innerHTML = instance.localization['RollerNameLabel'];
        document.getElementById('rollerName').placeholder = instance.localization['StreamRollerPlaceholder'];
        document.getElementById('moreInfoLabel').innerHTML = instance.localization['MoreInfo'];
        document.getElementById('learnButton').innerHTML = instance.localization['LearnMore'];
        document.getElementById('currentStyleLabel').innerHTML = instance.localization['CurrentStyle'];
        document.getElementById('importLabel').innerHTML = instance.localization['ImportString'];
        document.getElementById('importInput').placeholder = instance.localization['ExportedString']; //??
        document.getElementById('importActionLabel').innerHTML = instance.localization['ImportLabel'];
        document.getElementById('importButton').innerHTML = instance.localization['ImportOptions'];
    };
}