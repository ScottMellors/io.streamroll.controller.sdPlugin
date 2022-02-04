
var pluginAction = null,
    uuid = '';

if ($SD) {
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

        if (pluginAction == "io.streamdice.controller.basic") {

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
};

function sendValueToPlugin(type) {

    if ($SD && $SD.connection) {
        var payload = {};

        if (type === 'setQuickDice') {
            payload["setQuickDice"] = document.getElementById("dice_roll_value").value;
        } else if (pluginAction === "io.streamdice.controller.basic") {
            payload["setQuickDice"] = "3D6";
        }

        payload["setUUID"] = document.getElementById("dice_uuid").value;

        $SD.api.sendToPlugin(uuid, pluginAction, payload);
    }
}
