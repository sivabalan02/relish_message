'use strict';

const Hoek         = require('hoek');
const _            = require('lodash');

const internals    = {};
let errorMessages  = {},
    errorObject    = {};

internals.defaults = {
    stripQuotes  : true,
    statusCode   : 400,
    message      : {
        value: "Validation failed",
        key: 'message'
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
    this._opts   = opts ? Hoek.applyToDefaults(internals.defaults, opts) : internals.defaults;

    this.generateErrorMessage = (i18n, scenario, key, constraint, message) => {
        if (errorMessages.messages[scenario][key]) {
            if (typeof errorMessages.messages[scenario][key][constraint] === "object") {
                if (errorMessages.messages[scenario][key][constraint].length === 2) {
                    let errorMessage = i18n ? i18n.__(errorMessages.messages[scenario][key][constraint][0]) : errorMessages.messages[scenario][key][constraint][0];
                    let temp = errorMessages.messages[scenario][key][constraint][1];

                    for (let index in temp)
                        errorMessage = errorMessage.replace('{' + index + '}', temp[index]);

                    errorObject[key] = errorMessage;
                }
            }
            else if (typeof errorMessages.messages[scenario][key][constraint] === "string") {
                errorObject[key] = i18n ? i18n.__(errorMessages.messages[scenario][key][constraint]) : errorMessages.messages[scenario][key][constraint];
            }
            else
                errorObject[key] = errorMessages.stripQuotes ? message.replace(new RegExp('"', 'g'), '') : message;
        }
        else if (["missing", "xor"].indexOf(constraint) !== -1) {
            let matchKeys = message.match(/\[(.*)\]/);
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
        else
            errorObject[key] = errorMessages.stripQuotes ? message.replace(new RegExp('"', 'g'), '') : message;
    }

    this.parseError = (error, i18n, scenario) => {

        error.map((i) => {
            let err = {
                path      : i.context.key,
                message   : errorMessages.stripQuotes ? i.message.replace(/"/g, ''): i.message,
                constraint: i.type.split('.').pop()
            };

            this.generateErrorMessage(i18n, scenario, err.path, err.constraint, err.message);
        });
    };

    this.exports.options = (opts) => {
        this._opts = Hoek.applyToDefaults(this._opts, opts);

        return this.exports;
    };

    this.exports.failAction = (request, h, error) => {
        let i18n      = request.i18n,
            scenario  = request.route.settings.app.scenario;

        errorObject   = {};

        errorMessages = _.cloneDeep(this._opts);
        errorMessages.message = i18n ? i18n.__(errorMessages.message) : errorMessages.message;
        if (request.route.settings.validate.payload) {
            if (!request.payload) {
                let keys = request.route.settings.validate.payload._inner.children;
                for (let index in keys)
                    this.generateErrorMessage(i18n, scenario, keys[index].key, "required", "");
            }
            else
                this.parseError(error.details, i18n, scenario);
        }

        if (isEmpty(errorObject) && (request.route.settings.validate.query || request.route.settings.validate.params))
            this.parseError(error.details, i18n, scenario);

        error.output.payload                            = errorMessages.output_format;
        error.output.payload[errorMessages.message.key] = errorMessages.message.value;
        error.output.payload[error_key]                 = errorObject;
        error.output.statusCode                         = errorMessages.statusCode;

        delete (error.output.payload.statusCode);
        delete (error.output.payload.validation);
        
        if (error.output.payload.error && errorMessages.error_key !== "error")
            delete (error.output.payload.error);

        return error;
    };

    return this.exports;
};

module.exports = (opts) => new Relish_message(opts);