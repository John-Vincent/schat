/*******************
 * SCHAT CONSTANTS *
 *******************/     

const error_codes = {
    DIRECTORY_ERROR: 100,
    LOCAL_KEY_ERROR: 101,
    FOREIGN_KEY_ERROR: 102,
    KEY_MATCH_ERROR: 103,
    SESSION_KEY_ERROR: 104
}

const init_packet_types = {
    keyRequest: 'keyRequest',
    verifyKey: 'verifyKey',
    verifyAnswer: 'verifyAnswer',
    keysReady: 'keysReady',
    sessionSegment: 'sessionSegment',
    sessionTest: 'sessionTest',
    sessionResponse: 'sessionResponse',
    key: 'key'
}

const default_port = 4567;

const start_chat_flags = {
    localPort : "--port",
    privateKey : "--priv",
    publicKey : "--pub",
    foreignPubKey : "--fpub",
    saveFPub : "--save-fpub",
    tempKeys : "--temp-keys"
}

module.exports = {
    error_codes: error_codes,
    init_packet_types: init_packet_types,
    default_port : default_port,
    start_chat_flags : start_chat_flags
}
