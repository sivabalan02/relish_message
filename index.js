'use strict';

const Hoek = require('hoek');
const __ = require('lodash');
const internals = {};
let errorMessages = {},
    errorObject = {};

internals.defaults = {
    stripQuotes: true,
    statusCode: 400,
    message: "Validation failed",
    messages: {},
    data: {}
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
        else
            errorObject[key] = errorMessages.stripQuotes ? message.replace(new RegExp('"', 'g'), '') : message;
    }

    this.parseError = (error, i18n, scenario) => {

        error.map((i) => {
            let err = {
                path: i.context.key,
                message: errorMessages.stripQuotes ? i.message.replace(/"/g, '') : i.message,
                constraint: i.type.split('.').pop()
            };
            console.log(i);

            console.log(err);

            this.generateErrorMessage(i18n, scenario, err.path, err.constraint, err.message);
        });
    };

    this.exports.options = (opts) => {
        this._opts = Hoek.applyToDefaults(this._opts, opts);

        return this.exports;
    };

    this.exports.failAction = (request, h, error) => {
        let i18n = request.i18n,
            scenario = request.route.settings.app.scenario;

        errorObject = {};

        errorMessages = __.cloneDeep(this._opts);
        errorMessages.message = i18n ? i18n.__(errorMessages.message) : errorMessages.message;
        if (request.route.settings.validate.payload) {
            if (!request.payload) {
                let keys = request.route.settings.validate.payload._inner.children;
                for (let index in keys)
                    this.generateErrorMessage(i18n, scenario, keys[index].key, "required", "");
            }
            else {
                this.parseError(error.details, i18n, scenario);
                console.log("testt");
            }
        }

        if (isEmpty(errorObject) && (request.route.settings.validate.query || request.route.settings.validate.params))
            this.parseError(error.details, i18n, scenario);

        error.output.payload.message = errorMessages.message;
        error.output.payload.data = errorMessages.data;
        error.output.payload.errors = errorObject;
        error.output.statusCode = errorMessages.statusCode;

        delete (error.output.payload.statusCode);
        delete (error.output.payload.validation);
        delete (error.output.payload.error);

        return error;
    };

    return this.exports;
};

module.exports = (opts) => new Relish_message(opts);