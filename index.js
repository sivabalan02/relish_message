'use strict';

const Hoek         = require('hoek');
const __           = require('lodash');

const internals    = {};

let errorMessages  = {},
    errorObject    = {};

internals.defaults = {
    stripQuotes  : true,
    statusCode   : 400,
    message      : {
        value: "Validation failed",
        key  : 'message'
    },
    error_key    : 'error',
    output_format: {
        message: '',
        data   : {},
        error  : {}
    }
};

function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

const Relish_message = function Relish_message(opts) {
    this.exports = {};
    this._opts = opts ? Hoek.applyToDefaults(internals.defaults, opts) : internals.defaults;

    this.parseError = (error, i18n, scenario) => {
        errorMessages = __.cloneDeep(this._opts);
        //errorMessages.message = i18n ? i18n.__(errorMessages.message) : errorMessages.message;
        error.data.details.map((i) => {
            let err = {
                key: typeof i.path === "string" ? i.path.split('.').pop() : i.path.join(),
                path: typeof i.path === "string" ? i.path : i.path.join(),
                message: errorMessages.stripQuotes ? i.message.replace(/"/g, '') : i.message,
                type: i.type.split('.').shift(),
                constraint: i.type.split('.').pop()
            };

            // if label is different than key, provide label
            if (i.context.key !== err.key) {
                err.label = i.context.key;
            }

            // set custom message (if exists)
            if (errorMessages.messages[scenario].hasOwnProperty(err.path)) {
                if (typeof errorMessages.messages[scenario][err.path][err.constraint] === "object") {
                    if (errorMessages.messages[scenario][err.path][err.constraint].length === 2) {
                        let errorMessage = i18n ? i18n.__(errorMessages.messages[scenario][err.path][err.constraint][0]) : errorMessages.messages[scenario][err.path][err.constraint][0];
                        let temp = errorMessages.messages[scenario][err.path][err.constraint][1];

                        for (let index in temp)
                            errorMessage = errorMessage.replace('{' + index + '}', temp[index]);

                        errorObject[err.key] = errorMessage;
                    }
                } else {
                    //let errorMessage = 
                    errorObject[err.key] = i18n ? i18n.__(errorMessages.messages[scenario][err.path][err.constraint]) : errorMessages.messages[scenario][err.path][err.constraint];
                }
            }
            else if (errorMessages.messages[scenario].hasOwnProperty(err.key)) {
                if (typeof errorMessages.messages[scenario][err.key][err.constraint] === "object") {
                    if (errorMessages.messages[scenario][err.key][err.constraint].length === 2) {
                        let errorMessage = i18n ? i18n.__(errorMessages.messages[scenario][err.key][err.constraint][0]) : errorMessages.messages[scenario][err.key][err.constraint][0];
                        let temp = errorMessages.messages[scenario][err.key][err.constraint][1];
                        for (let index in temp)
                            errorMessage = errorMessage.replace('{' + index + '}', temp[index]);

                        errorObject[err.key] = errorMessage;
                    }
                }
                else
                    errorObject[err.key] = i18n ? i18n.__(errorMessages.messages[scenario][err.key][err.constraint]) : errorMessages.messages[scenario][err.key][err.constraint];
            }
            else if (["missing", "xor"].indexOf(err.constraint) !== -1) {
                let matchKeys = err.message.match(/\[(.*)\]/);
                if (matchKeys && matchKeys.length && matchKeys[1]) {
                    let keys = matchKeys[1].split(",");
                    keys.forEach((key, index) => {
                        key = key.trim();
                        if (errorMessages.messages[scenario].hasOwnProperty(key)) {
                            if (typeof errorMessages.messages[scenario][key].required === "object") {
                                if (errorMessages.messages[scenario][key].required.length === 2) {
                                    let errorMessage = i18n ? i18n.__(errorMessages.messages[scenario][key]["required"][0]) : errorMessages.messages[scenario][key]["required"][0];
                                    let temp = errorMessages.messages[scenario][key]["required"][1];
                                    for (let index in temp)
                                        errorMessage = errorMessage.replace('{' + index + '}', temp[index]);

                                    errorObject[key] = errorMessage;
                                }
                            }
                            else
                                errorObject[key] = i18n ? i18n.__(errorMessages.messages[scenario][key].required) : errorMessages.messages[scenario][key].required;
                        }
                    });
                }
            }
        });
    };

    this.exports.options = (opts) => {
        this._opts = Hoek.applyToDefaults(this._opts, opts);

        return this.exports;
    };

    this.exports.failAction = (request, reply, source, error) => {
        let i18n = request.i18n;
        // parse error object
        errorObject = {};
        this.parseError(error, i18n, request.route.settings.app.scenario);
        let scenario = request.route.settings.app.scenario;

        //error.output.payload.message                  = errorMessages.message;
        error.output.payload = errorMessages.output_format;
        error.output.payload[errorMessages.message.key] = errorMessages.message.value;
        error.output.payload[errorMessages.error_key] = errorObject;
        if (!request.payload) {
            var customErrors = {};
            for (let index in errorMessages.messages[scenario]) {

                if (errorMessages.messages[scenario][index].required) {
                    if (typeof errorMessages.messages[scenario][index].required === "object") {
                        if (errorMessages.messages[scenario][index].required.length === 2) {
                            let errorMessage = i18n ? request.i18n.__(errorMessages.messages[scenario][index].required) : errorMessages.messages[scenario][index].required,
                                temp = errorMessages.messages[scenario][index].required[0];

                            for (let keyIndex in temp)
                                errorMessage = errorMessage.replace('{' + keyIndex + '}', temp[keyIndex]);

                            errorMessages.messages[scenario][index].required = errorMessage;
                        }
                    } else
                        errorMessages.messages[scenario][index].required = i18n ? request.i18n.__(errorMessages.messages[scenario][index].required) : errorMessages.messages[scenario][index].required;

                    customErrors[index] = errorMessages.messages[scenario][index].required;
                }
            }

            error.output.payload[errorMessages.error_key] = customErrors;
        }

        error.output.statusCode = errorMessages.statusCode;

        delete (error.output.payload.validation);
        delete (error.output.payload.statusCode);

        return reply(error);
    };

    return this.exports;
};

module.exports = (opts) => new Relish_message(opts);