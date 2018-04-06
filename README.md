# Relish message

_Customized error messages for Hapi.js Joi validation_


## Introduction

It provides the scenario based custom messages for the joi validation. 95% of the code taken from the relish package and included some features. By default it supports the internalization using either [hapi-i18n](https://github.com/codeva/hapi-i18n) or [hapi-i18n-mongo](https://github.com/sivabalan02/hapi-i18n-mongo), but its an optional. 

**Default Joi Response**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "\"name\" fails because [\"name\" is not allowed to be empty], \"email\" must be a valid email",
  "validation": {
    "source": "payload",
    "keys": [
      "name",
      "email"
    ]
  }
}
```

**Example Relish_message Response**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
      "name": "name is not allowed to be empty",
      "email": "email must be a valid email"
    }
}
```

## Installation
```sh
npm install relish_message --save
```

## Usage
First load and initialize the module

```js
// load the package and set custom message options
const Relish = require('relish_message')({
  stripQuotes  : true,
    statusCode   : 400,
    message      : {
        value: "Validation failed",
        key  : message
    },
    error_key    : error,
    output_format: {
        message: '',
        data   : {},
        error  : {}
    },
  messages   : {
    'signup': {
      'name'    : {
        'required': 'First name required',
        'empty'   : 'First name required',
        'min'     : ['First name must have atleast {key} characters', {'key': 2}],
        'max'     : ['First name have maximum {key} characters', {'key': 35}]
      },
      'email'    : {
        'required': 'Email required',
        'empty'   : 'Email required',
        'min'     : ['Email must have atleast {key} characters', {'key': 3}],
        'max'     : ['Email have maximum {key} characters', {'key': 256}]
      },
    }
  }
});
```

Once relish message was initialized, it will package exposes a custom `failAction` handler that can be used in your Hapi.js [Route Options][hapi-route-options].

```js
// call the failAction handler in your route options
server.route({
  method: 'POST',
  path: '/signup',
  config: {
    app: {
      scenario: 'signup'
    },
    validate: {
      // set a custom failAction handler
      failAction: Relish.failAction,
      payload: {
          name: Joi.string().required(),
          email: Joi.string().email()
      }
    }
  },
  handler: (request, h) => return h.response('OK')
});
```

## Properties

### stripQuotes
 Used to remove quotes from error messages if it is true. (Default: true)

### statusCode
Http status code of the error. (Default: 400)

### output_format
Tells the response format of the error. Default format is
```
  output_format: {
    message: '',
    error: {}
    data: {}
  }
```
Here data property will be optional one. But message and error were mandatory. This output_format property used to customize the response data format

### message
Holds the response format message key name and value

Example if the message property is defined as follows 
```
  message: {
    key: 'messages',
    value: 'Validation failed'
  }
  output_format: {
    message: '',
    error: {}
    data: {}
  }
```

then response will be like this
```
  {
    messages: 'Validation failed',
    error: {},
    data: {}
  }
```
### error_key
Holds error key name
Example
```
  error_key: "errors",
  output_format: {
    message: '',
    error: {}
    data: {}
  }
```

Output: 
```
   {
    message: '',
    errors: {
      "name": "name is not allowed to be empty",
      "email": "email must be a valid email"
    }
    data: {}
  }
```

## Change log
________
###2.0.0
1) Hapi 17.x.x support included. For those who are using 16.x.x try to use version 1.3.5

###1.3.6
1) Output format included

###1.3.5
1) Fixed the bugs
  - Query and parameters validation error message was fixed

###1.3.4
1) Changed the response format 

Old version:
```
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
      {
        "key": "name",
        "message": "name is not allowed to be empty",
      },
      {
        "name": "email",
        "message": "email must be a valid email"
      }
    ]
  ]
}
```
New version:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
      "name": "name is not allowed to be empty",
      "email": "email must be a valid email"
    }
}
```