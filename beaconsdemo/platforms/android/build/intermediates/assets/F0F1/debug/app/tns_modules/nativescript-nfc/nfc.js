"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nfc_common_1 = require("./nfc.common");
var utils = require("tns-core-modules/utils/utils");
var application = require("tns-core-modules/application");
var frame = require("tns-core-modules/ui/frame");
var onTagDiscoveredListener = null;
var onNdefDiscoveredListener = null;
var NfcIntentHandler = (function () {
    function NfcIntentHandler() {
        this.savedIntent = null;
    }
    NfcIntentHandler.prototype.parseMessage = function () {
        var intent = application.android.foregroundActivity.getIntent();
        if (intent === null || this.savedIntent === null) {
            return;
        }
        var action = intent.getAction();
        if (action === null) {
            return;
        }
        var tag = intent.getParcelableExtra(android.nfc.NfcAdapter.EXTRA_TAG);
        var messages = intent.getParcelableArrayExtra(android.nfc.NfcAdapter.EXTRA_NDEF_MESSAGES);
        if (action === android.nfc.NfcAdapter.ACTION_NDEF_DISCOVERED) {
            var ndef = android.nfc.tech.Ndef.get(tag);
            var ndefJson = this.ndefToJSON(ndef);
            if (ndef === null && messages !== null) {
                if (messages.length > 0) {
                    var message = messages[0];
                    ndefJson.message = this.messageToJSON(message);
                    ndefJson.type = "NDEF Push Protocol";
                }
                if (messages.length > 1) {
                    console.log("Expected 1 ndefMessage but found " + messages.length);
                }
            }
            if (onNdefDiscoveredListener === null) {
                console.log("Ndef discovered, but no listener was set via setOnNdefDiscoveredListener. Ndef: " + JSON.stringify(ndefJson));
            }
            else {
                onNdefDiscoveredListener(ndefJson);
            }
            application.android.foregroundActivity.getIntent().setAction("");
        }
        else if (action === android.nfc.NfcAdapter.ACTION_TECH_DISCOVERED) {
            var techList = tag.getTechList();
            for (var i = 0; i < tag.getTechList().length; i++) {
                var tech = tag.getTechList()[i];
            }
            application.android.foregroundActivity.getIntent().setAction("");
        }
        else if (action === android.nfc.NfcAdapter.ACTION_TAG_DISCOVERED) {
            var result = {
                id: tag === null ? null : this.byteArrayToJSArray(tag.getId()),
                techList: this.techListToJSON(tag)
            };
            if (onTagDiscoveredListener === null) {
                console.log("Tag discovered, but no listener was set via setOnTagDiscoveredListener. Ndef: " + JSON.stringify(result));
            }
            else {
                onTagDiscoveredListener(result);
            }
            application.android.foregroundActivity.getIntent().setAction("");
        }
    };
    NfcIntentHandler.prototype.byteArrayToJSArray = function (bytes) {
        var result = [];
        for (var i = 0; i < bytes.length; i++) {
            result.push(bytes[i]);
        }
        return result;
    };
    NfcIntentHandler.prototype.byteArrayToJSON = function (bytes) {
        var json = new org.json.JSONArray();
        for (var i = 0; i < bytes.length; i++) {
            json.put(bytes[i]);
        }
        return json.toString();
    };
    NfcIntentHandler.prototype.bytesToHexString = function (bytes) {
        var dec, hexstring, bytesAsHexString = "";
        for (var i = 0; i < bytes.length; i++) {
            if (bytes[i] >= 0) {
                dec = bytes[i];
            }
            else {
                dec = 256 + bytes[i];
            }
            hexstring = dec.toString(16);
            if (hexstring.length === 1) {
                hexstring = "0" + hexstring;
            }
            bytesAsHexString += hexstring;
        }
        return bytesAsHexString;
    };
    NfcIntentHandler.prototype.bytesToString = function (bytes) {
        var result = "";
        var i, c, c1, c2, c3;
        i = c = c1 = c2 = c3 = 0;
        if (bytes.length >= 3) {
            if ((bytes[0] & 0xef) === 0xef && (bytes[1] & 0xbb) === 0xbb && (bytes[2] & 0xbf) === 0xbf) {
                i = 3;
            }
        }
        while (i < bytes.length) {
            c = bytes[i] & 0xff;
            if (c < 128) {
                result += String.fromCharCode(c);
                i++;
            }
            else if ((c > 191) && (c < 224)) {
                if (i + 1 >= bytes.length) {
                    throw "Un-expected encoding error, UTF-8 stream truncated, or incorrect";
                }
                c2 = bytes[i + 1] & 0xff;
                result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                if (i + 2 >= bytes.length || i + 1 >= bytes.length) {
                    throw "Un-expected encoding error, UTF-8 stream truncated, or incorrect";
                }
                c2 = bytes[i + 1] & 0xff;
                c3 = bytes[i + 2] & 0xff;
                result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return result;
    };
    NfcIntentHandler.prototype.techListToJSON = function (tag) {
        if (tag !== null) {
            var techList = [];
            for (var i = 0; i < tag.getTechList().length; i++) {
                techList.push(tag.getTechList()[i]);
            }
            return techList;
        }
        return null;
    };
    NfcIntentHandler.prototype.ndefToJSON = function (ndef) {
        if (ndef === null) {
            return null;
        }
        var result = {
            type: ndef.getType()[0],
            maxSize: ndef.getMaxSize(),
            writable: ndef.isWritable(),
            message: this.messageToJSON(ndef.getCachedNdefMessage()),
            canMakeReadOnly: ndef.canMakeReadOnly()
        };
        var tag = ndef.getTag();
        if (tag !== null) {
            result.id = this.byteArrayToJSArray(tag.getId());
            result.techList = this.techListToJSON(tag);
        }
        return result;
    };
    NfcIntentHandler.prototype.messageToJSON = function (message) {
        try {
            if (message === null) {
                return null;
            }
            var records = message.getRecords();
            var result = [];
            for (var i = 0; i < records.length; i++) {
                var record = this.recordToJSON(records[i]);
                result.push(record);
            }
            return result;
        }
        catch (e) {
            console.log("Error in messageToJSON: " + e);
            return null;
        }
    };
    NfcIntentHandler.prototype.recordToJSON = function (record) {
        var payloadAsString = this.bytesToString(record.getPayload());
        var payloadAsStringWithPrefix = payloadAsString;
        var type = record.getType()[0];
        if (type === android.nfc.NdefRecord.RTD_TEXT[0]) {
            var languageCodeLength = record.getPayload()[0];
            payloadAsString = payloadAsStringWithPrefix.substring(languageCodeLength + 1);
        }
        else if (type === android.nfc.NdefRecord.RTD_URI[0]) {
            var prefix = nfc_common_1.NfcUriProtocols[record.getPayload()[0]];
            if (!prefix) {
                prefix = "";
            }
            payloadAsString = prefix + payloadAsString.slice(1);
        }
        return {
            tnf: record.getTnf(),
            type: type,
            id: this.byteArrayToJSArray(record.getId()),
            payload: this.byteArrayToJSON(record.getPayload()),
            payloadAsHexString: this.bytesToHexString(record.getPayload()),
            payloadAsStringWithPrefix: payloadAsStringWithPrefix,
            payloadAsString: payloadAsString
        };
    };
    return NfcIntentHandler;
}());
var nfcIntentHandler = new NfcIntentHandler();
var dispatchStarted = false;
var Activity = (function (_super) {
    __extends(Activity, _super);
    function Activity() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Activity.prototype.onCreate = function (savedInstanceState) {
        if (!this._callbacks) {
            frame.setActivityCallbacks(this);
        }
        this._callbacks.onCreate(this, savedInstanceState, _super.prototype.onCreate);
    };
    Activity.prototype.onSaveInstanceState = function (outState) {
        this._callbacks.onSaveInstanceState(this, outState, _super.prototype.onSaveInstanceState);
    };
    Activity.prototype.onStart = function () {
        this._callbacks.onStart(this, _super.prototype.onStart);
    };
    Activity.prototype.onStop = function () {
        this._callbacks.onStop(this, _super.prototype.onStop);
    };
    Activity.prototype.onDestroy = function () {
        this._callbacks.onDestroy(this, _super.prototype.onDestroy);
    };
    Activity.prototype.onBackPressed = function () {
        this._callbacks.onBackPressed(this, _super.prototype.onBackPressed);
    };
    Activity.prototype.onRequestPermissionsResult = function (requestCode, permissions, grantResults) {
        this._callbacks.onRequestPermissionsResult(this, requestCode, permissions, grantResults, undefined);
    };
    Activity.prototype.onActivityResult = function (requestCode, resultCode, data) {
        this._callbacks.onActivityResult(this, requestCode, resultCode, data, _super.prototype.onActivityResult);
    };
    Activity.prototype.onNewIntent = function (intent) {
        _super.prototype.onNewIntent.call(this, intent);
        application.android.foregroundActivity.setIntent(intent);
        nfcIntentHandler.savedIntent = intent;
        nfcIntentHandler.parseMessage();
    };
    return Activity;
}(android.app.Activity));
Activity = __decorate([
    JavaProxy("com.tns.NativeScriptActivity")
], Activity);
var Nfc = (function () {
    function Nfc() {
        var that = this;
        this.intentFilters = [];
        this.techLists = Array.create("[Ljava.lang.String;", 0);
        var intent = new android.content.Intent(application.android.foregroundActivity, application.android.foregroundActivity.getClass());
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
        this.pendingIntent = android.app.PendingIntent.getActivity(application.android.foregroundActivity, 0, intent, 0);
        var nfcAdapter = android.nfc.NfcAdapter.getDefaultAdapter(application.android.foregroundActivity);
        if (nfcAdapter !== null) {
            if (Nfc.firstInstance) {
                nfcAdapter.enableForegroundDispatch(application.android.foregroundActivity, this.pendingIntent, this.intentFilters, this.techLists);
            }
        }
        nfcIntentHandler.parseMessage();
        if (!Nfc.firstInstance) {
            return;
        }
        Nfc.firstInstance = false;
        application.android.on(application.AndroidApplication.activityPausedEvent, function (args) {
            var pausingNfcAdapter = android.nfc.NfcAdapter.getDefaultAdapter(args.activity);
            if (pausingNfcAdapter !== null) {
                try {
                    nfcAdapter.disableForegroundDispatch(args.activity);
                }
                catch (e) {
                    console.log("Illegal State Exception stopping NFC. Assuming application is terminating.");
                }
            }
        });
        application.android.on(application.AndroidApplication.activityResumedEvent, function (args) {
            var resumingNfcAdapter = android.nfc.NfcAdapter.getDefaultAdapter(args.activity);
            if (resumingNfcAdapter !== null && !args.activity.isFinishing()) {
                resumingNfcAdapter.enableForegroundDispatch(args.activity, that.pendingIntent, that.intentFilters, that.techLists);
            }
        });
    }
    Nfc.prototype.available = function () {
        return new Promise(function (resolve, reject) {
            var nfcAdapter = android.nfc.NfcAdapter.getDefaultAdapter(utils.ad.getApplicationContext());
            resolve(nfcAdapter !== null);
        });
    };
    Nfc.prototype.enabled = function () {
        return new Promise(function (resolve, reject) {
            var nfcAdapter = android.nfc.NfcAdapter.getDefaultAdapter(utils.ad.getApplicationContext());
            resolve(nfcAdapter !== null && nfcAdapter.isEnabled());
        });
    };
    Nfc.prototype.setOnTagDiscoveredListener = function (arg) {
        var that = this;
        return new Promise(function (resolve, reject) {
            onTagDiscoveredListener = (arg === null ? null : arg);
            resolve();
        });
    };
    Nfc.prototype.setOnNdefDiscoveredListener = function (arg, options) {
        return new Promise(function (resolve, reject) {
            onNdefDiscoveredListener = (arg === null ? null : arg);
            resolve();
        });
    };
    Nfc.prototype.eraseTag = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            var intent = application.android.foregroundActivity.getIntent();
            if (intent === null || nfcIntentHandler.savedIntent === null) {
                reject("Can't erase tag; didn't receive an intent");
                return;
            }
            var tag = nfcIntentHandler.savedIntent.getParcelableExtra(android.nfc.NfcAdapter.EXTRA_TAG);
            var records = new Array.create(android.nfc.NdefRecord, 1);
            var tnf = android.nfc.NdefRecord.TNF_EMPTY;
            var type = Array.create("byte", 0);
            var id = Array.create("byte", 0);
            var payload = Array.create("byte", 0);
            var record = new android.nfc.NdefRecord(tnf, type, id, payload);
            records[0] = record;
            var ndefClass = android.nfc.NdefMessage;
            var ndefMessage = new ndefClass(records);
            var errorMessage = that.writeNdefMessage(ndefMessage, tag);
            if (errorMessage === null) {
                resolve();
            }
            else {
                reject(errorMessage);
            }
        });
    };
    Nfc.prototype.writeTag = function (arg) {
        var that = this;
        return new Promise(function (resolve, reject) {
            try {
                if (!arg) {
                    reject("Nothing passed to write");
                    return;
                }
                var intent = application.android.foregroundActivity.getIntent();
                if (intent === null || nfcIntentHandler.savedIntent === null) {
                    reject("Can not write to tag; didn't receive an intent");
                    return;
                }
                var tag = nfcIntentHandler.savedIntent.getParcelableExtra(android.nfc.NfcAdapter.EXTRA_TAG);
                var records = that.jsonToNdefRecords(arg);
                var ndefClass = android.nfc.NdefMessage;
                var ndefMessage = new ndefClass(records);
                var errorMessage = that.writeNdefMessage(ndefMessage, tag);
                if (errorMessage === null) {
                    resolve();
                }
                else {
                    reject(errorMessage);
                }
            }
            catch (ex) {
                reject(ex);
            }
        });
    };
    Nfc.prototype.writeNdefMessage = function (message, tag) {
        var ndef = android.nfc.tech.Ndef.get(tag);
        if (ndef === null) {
            var formatable = android.nfc.tech.NdefFormatable.get(tag);
            if (formatable === null) {
                return "Tag doesn't support NDEF";
            }
            formatable.connect();
            formatable.format(message);
            formatable.close();
            return null;
        }
        try {
            ndef.connect();
        }
        catch (e) {
            console.log("ndef connection error: " + e);
            return "connection failed";
        }
        if (!ndef.isWritable()) {
            return "Tag not writable";
        }
        var size = message.toByteArray().length;
        var maxSize = ndef.getMaxSize();
        if (maxSize < size) {
            return "Message too long; tag capacity is " + maxSize + " bytes, message is " + size + " bytes";
        }
        ndef.writeNdefMessage(message);
        ndef.close();
        return null;
    };
    Nfc.prototype.jsonToNdefRecords = function (input) {
        var nrOfRecords = 0;
        nrOfRecords += input.textRecords ? input.textRecords.length : 0;
        nrOfRecords += input.uriRecords ? input.uriRecords.length : 0;
        var records = new Array.create(android.nfc.NdefRecord, nrOfRecords);
        var recordCounter = 0;
        if (input.textRecords !== null) {
            for (var i in input.textRecords) {
                var textRecord = input.textRecords[i];
                var langCode = textRecord.languageCode || "en";
                var encoded = this.stringToBytes(langCode + textRecord.text);
                encoded.unshift(langCode.length);
                var tnf = android.nfc.NdefRecord.TNF_WELL_KNOWN;
                var type = Array.create("byte", 1);
                type[0] = 0x54;
                var id = Array.create("byte", textRecord.id ? textRecord.id.length : 0);
                if (textRecord.id) {
                    for (var j = 0; j < textRecord.id.length; j++) {
                        id[j] = textRecord.id[j];
                    }
                }
                var payload = Array.create("byte", encoded.length);
                for (var n = 0; n < encoded.length; n++) {
                    payload[n] = encoded[n];
                }
                var record = new android.nfc.NdefRecord(tnf, type, id, payload);
                records[recordCounter++] = record;
            }
        }
        if (input.uriRecords !== null) {
            var _loop_1 = function (i) {
                var uriRecord = input.uriRecords[i];
                var uri = uriRecord.uri;
                var prefix;
                nfc_common_1.NfcUriProtocols.slice(1).forEach(function (protocol) {
                    if ((!prefix || prefix === "urn:") && uri.indexOf(protocol) === 0) {
                        prefix = protocol;
                    }
                });
                if (!prefix) {
                    prefix = "";
                }
                var encoded = this_1.stringToBytes(uri.slice(prefix.length));
                encoded.unshift(nfc_common_1.NfcUriProtocols.indexOf(prefix));
                var tnf = android.nfc.NdefRecord.TNF_WELL_KNOWN;
                var type = Array.create("byte", 1);
                type[0] = 0x55;
                var id = Array.create("byte", uriRecord.id ? uriRecord.id.length : 0);
                if (uriRecord.id) {
                    for (var j = 0; j < uriRecord.id.length; j++) {
                        id[j] = uriRecord.id[j];
                    }
                }
                var payload = Array.create("byte", encoded.length);
                for (var n = 0; n < encoded.length; n++) {
                    payload[n] = encoded[n];
                }
                var record = new android.nfc.NdefRecord(tnf, type, id, payload);
                records[recordCounter++] = record;
            };
            var this_1 = this;
            for (var i in input.uriRecords) {
                _loop_1(i);
            }
        }
        return records;
    };
    Nfc.prototype.stringToBytes = function (input) {
        var bytes = [];
        for (var n = 0; n < input.length; n++) {
            var c = input.charCodeAt(n);
            if (c < 128) {
                bytes[bytes.length] = c;
            }
            else if ((c > 127) && (c < 2048)) {
                bytes[bytes.length] = (c >> 6) | 192;
                bytes[bytes.length] = (c & 63) | 128;
            }
            else {
                bytes[bytes.length] = (c >> 12) | 224;
                bytes[bytes.length] = ((c >> 6) & 63) | 128;
                bytes[bytes.length] = (c & 63) | 128;
            }
        }
        return bytes;
    };
    return Nfc;
}());
Nfc.firstInstance = true;
exports.Nfc = Nfc;
//# sourceMappingURL=nfc.js.map