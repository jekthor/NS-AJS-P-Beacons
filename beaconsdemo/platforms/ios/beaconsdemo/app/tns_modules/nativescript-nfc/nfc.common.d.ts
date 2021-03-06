export declare const NfcUriProtocols: string[];
export interface NdefListenerOptions {
    stopAfterFirstRead?: boolean;
}
export interface TextRecord {
    text: string;
    languageCode?: string;
    id?: Array<number>;
}
export interface UriRecord {
    uri: string;
    id?: Array<number>;
}
export interface WriteTagOptions {
    textRecords?: Array<TextRecord>;
    uriRecords?: Array<UriRecord>;
}
export interface NfcTagData {
    id?: Array<number>;
    techList?: Array<string>;
}
export interface NfcNdefRecord {
    id: Array<number>;
    tnf: number;
    type: number;
    payload: string;
    payloadAsHexString: string;
    payloadAsStringWithPrefix: string;
    payloadAsString: string;
}
export interface NfcNdefData extends NfcTagData {
    message: Array<NfcNdefRecord>;
    type?: string;
    maxSize?: number;
    writable?: boolean;
    canMakeReadOnly?: boolean;
}
export interface NfcApi {
    available(): Promise<boolean>;
    enabled(): Promise<boolean>;
    writeTag(arg: WriteTagOptions): Promise<any>;
    eraseTag(): Promise<any>;
    setOnTagDiscoveredListener(arg: (data: NfcTagData) => void): Promise<any>;
    setOnNdefDiscoveredListener(arg: (data: NfcNdefData) => void, options?: NdefListenerOptions): Promise<any>;
}
