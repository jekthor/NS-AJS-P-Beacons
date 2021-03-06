"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nfc_common_1 = require("./nfc.common");
var Nfc = (function () {
    function Nfc() {
    }
    Nfc._available = function () {
        var isIOS11OrUp = NSObject.instancesRespondToSelector("accessibilityAttributedLabel");
        if (isIOS11OrUp) {
            try {
                return NFCNDEFReaderSession.readingAvailable;
            }
            catch (e) {
                return false;
            }
        }
        else {
            return false;
        }
    };
    Nfc.prototype.available = function () {
        return new Promise(function (resolve, reject) {
            resolve(Nfc._available());
        });
    };
    Nfc.prototype.enabled = function () {
        return new Promise(function (resolve, reject) {
            resolve(Nfc._available());
        });
    };
    Nfc.prototype.setOnTagDiscoveredListener = function (arg) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    };
    Nfc.prototype.setOnNdefDiscoveredListener = function (arg, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!Nfc._available()) {
                reject();
                return;
            }
            if (arg === null) {
                _this.invalidateSession();
                resolve();
                return;
            }
            try {
                _this.delegate = NFCNDEFReaderSessionDelegateImpl.createWithOwnerResultCallbackAndOptions(new WeakRef(_this), function (data) {
                    if (!arg) {
                        console.log("Ndef discovered, but no listener was set via setOnNdefDiscoveredListener. Ndef: " + JSON.stringify(data));
                    }
                    else {
                        arg(data);
                    }
                }, options);
                _this.session = NFCNDEFReaderSession.alloc().initWithDelegateQueueInvalidateAfterFirstRead(_this.delegate, null, options.stopAfterFirstRead);
                _this.session.beginSession();
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
    };
    Nfc.prototype.invalidateSession = function () {
        if (this.session) {
            this.session.invalidateSession();
            this.session = undefined;
        }
    };
    Nfc.prototype.stopListening = function () {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    };
    Nfc.prototype.writeTag = function (arg) {
        return new Promise(function (resolve, reject) {
            reject("Not available on iOS");
        });
    };
    Nfc.prototype.eraseTag = function () {
        return new Promise(function (resolve, reject) {
            reject("Not available on iOS");
        });
    };
    return Nfc;
}());
exports.Nfc = Nfc;
var NFCNDEFReaderSessionDelegateImpl = (function (_super) {
    __extends(NFCNDEFReaderSessionDelegateImpl, _super);
    function NFCNDEFReaderSessionDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NFCNDEFReaderSessionDelegateImpl.new = function () {
        try {
            NFCNDEFReaderSessionDelegateImpl.ObjCProtocols.push(NFCNDEFReaderSessionDelegate);
        }
        catch (ignore) {
        }
        return _super.new.call(this);
    };
    NFCNDEFReaderSessionDelegateImpl.createWithOwnerResultCallbackAndOptions = function (owner, callback, options) {
        var delegate = NFCNDEFReaderSessionDelegateImpl.new();
        delegate._owner = owner;
        delegate.options = options;
        delegate.resultCallback = callback;
        return delegate;
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.readerSessionDidDetectNDEFs = function (session, messages) {
        var _this = this;
        var firstMessage = messages[0];
        if (this.options && this.options.stopAfterFirstRead) {
            setTimeout(function () { return _this._owner.get().invalidateSession(); });
        }
        this.resultCallback(this.ndefToJson(firstMessage));
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.readerSessionDidInvalidateWithError = function (session, error) {
        this._owner.get().invalidateSession();
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.ndefToJson = function (message) {
        if (message === null) {
            return null;
        }
        var ndefJson = {
            message: this.messageToJSON(message),
        };
        return ndefJson;
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.messageToJSON = function (message) {
        var result = [];
        for (var i = 0, l = message.records.count; i < l; i++) {
            result.push(this.recordToJSON(message.records.objectAtIndex(i)));
        }
        return result;
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.recordToJSON = function (record) {
        var payloadAsHexArray = this.nsdataToHexArray(record.payload);
        var payloadAsString = this.nsdataToASCIIString(record.payload);
        var payloadAsStringWithPrefix = payloadAsString;
        var recordType = this.nsdataToHexArray(record.type);
        var decimalType = this.hexToDec(recordType[0]);
        if (decimalType === 84) {
            var languageCodeLength = +payloadAsHexArray[0];
            payloadAsString = payloadAsStringWithPrefix.substring(languageCodeLength + 1);
        }
        else if (decimalType === 85) {
            var prefix = nfc_common_1.NfcUriProtocols[payloadAsHexArray[0]];
            if (!prefix) {
                prefix = "";
            }
            payloadAsString = prefix + payloadAsString.slice(1);
        }
        var b = interop.bufferFromData(record.payload);
        return {
            tnf: record.typeNameFormat,
            type: decimalType,
            id: this.byteArrayToJSArray(record.identifier),
            payload: this.hexToDecArray(payloadAsHexArray),
            payloadAsHexString: this.nsdataToHexString(record.payload),
            payloadAsStringWithPrefix: payloadAsStringWithPrefix,
            payloadAsString: payloadAsString
        };
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.byteArrayToJSArray = function (bytes) {
        var result = [];
        for (var i = 0; i < bytes.length; i++) {
            result.push(bytes[i]);
        }
        return result;
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.hexToDec = function (hex) {
        var result = 0, digitValue;
        hex = hex.toLowerCase();
        for (var i = 0; i < hex.length; i++) {
            digitValue = '0123456789abcdefgh'.indexOf(hex[i]);
            result = result * 16 + digitValue;
        }
        return result;
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.buf2hexString = function (buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (x) { return ('00' + x.toString(16)).slice(-2); }).join('');
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.buf2hexArray = function (buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (x) { return ('00' + x.toString(16)).slice(-2); });
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.buf2hexArrayNr = function (buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (x) { return +(x.toString(16)); });
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.hex2a = function (hexx) {
        var hex = hexx.toString();
        var str = '';
        for (var i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        return str;
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.nsdataToHexString = function (data) {
        var b = interop.bufferFromData(data);
        return this.buf2hexString(b);
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.nsdataToHexArray = function (data) {
        var b = interop.bufferFromData(data);
        return this.buf2hexArray(b);
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.nsdataToASCIIString = function (data) {
        return this.hex2a(this.nsdataToHexString(data));
    };
    NFCNDEFReaderSessionDelegateImpl.prototype.hexToDecArray = function (hexArray) {
        var resultArray = [];
        for (var i = 0; i < hexArray.length; i++) {
            var result = 0, digitValue = void 0;
            var hex = hexArray[i].toLowerCase();
            for (var j = 0; j < hex.length; j++) {
                digitValue = '0123456789abcdefgh'.indexOf(hex[j]);
                result = result * 16 + digitValue;
            }
            resultArray.push(result);
        }
        return JSON.stringify(resultArray);
    };
    return NFCNDEFReaderSessionDelegateImpl;
}(NSObject));
NFCNDEFReaderSessionDelegateImpl.ObjCProtocols = [];
//# sourceMappingURL=nfc.js.map