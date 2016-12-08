(function () {
    var ConfluenceGenerator;

    (function(root) {
        var ref;
        if ((ref = root.bundle) != null ? ref.minApiVersion('0.2.0') : void 0) {
            return root.Mustache = require("./mustache");
        } else {
            return require("mustache.js");
        }
    })(this);

    ConfluenceGenerator = function () {
        this.request = function (paw_request) {
            var headers = [];
            var is_json = false;
            var ref = paw_request.getHeaders(true);
            var key;
            var value;
            console.log(ref);

            for (var key in ref) {
                console.log(key);
                value = ref[key];
                console.log(value);
                if (key === 'Content-Type') {
                    is_json = value.getEvaluatedString().search(/(json)/i) > -1;
                    continue;
                }
                headers.push({
                    key: key,
                    value: this.concatDynamicString(value)
                });
            }

            console.log(headers);

            var has_headers = headers.length > 0;
            var body = paw_request.body;
            var has_body = body.length > 0;

            if (body.length && is_json) {
                body = JSON.stringify(JSON.parse(body), null, 4);
            }

            return {
                "headers?": has_headers,
                headers: headers,
                contentType: paw_request.headers['Content-Type'],
                "body?": has_headers && has_body,
                body: body
            };
        };


        this.response = function (exchange) {
            var body, body_indentation, has_body, has_headers, headers, is_json, key, ref, value;
            if (!exchange) {
                return null;
            }
            headers = [];
            is_json = false;
            ref = exchange.responseHeaders;
            for (key in ref) {
                value = ref[key];
                if (key === 'Content-Type' || key === 'Connection' || key === 'Date' || key === 'Via' || key === 'Server' || key === 'Content-Length') {
                    is_json = key === 'Content-Type' && value.search(/(json)/i) > -1;
                    continue;
                }
                headers.push({
                    key: key,
                    value: value
                });
            }
            has_headers = headers.length > 0;
            body = exchange.responseBody;
            has_body = body.length > 0;
            if (has_body) {
                if (is_json) {
                    body = JSON.stringify(JSON.parse(body), null, 4);
                }
                /*body_indentation = '        ';
                if (has_headers) {
                    body_indentation += '    ';
                }
                body = body.replace(/^/gm, body_indentation);*/
            }
            return {
                statusCode: exchange.responseStatusCode,
                contentType: exchange.responseHeaders['Content-Type'],
                "headers?": has_headers,
                headers: headers,
                "body?": has_headers && has_body,
                body: body
            };
        };

        this.concatDynamicString = function (dynString) {
            var ret = '';
            for (var i = 0; i < dynString.length; i++) {
                var s = dynString.getComponentAtIndex(i);

                if (typeof s == "string") {
                    ret += s;
                }
                else {
                    if(s.type != undefined && s.type == "com.luckymarmot.EnvironmentVariableDynamicValue") {
                        ret += "[" + this.context.getEnvironmentVariableById(s.environmentVariable).name + "]";
                    } else {
                        ret += s;
                    }
                }
            }
            return ret;
        }

        this.context = null;
        this.generate = function (context) {
            this.context = context;
            var paw_request = this.context.getCurrentRequest();
            var request = this.request(paw_request);

            var url = this.concatDynamicString(paw_request.getUrl(true));

            var result = paw_request.method + ' ' + url;

            // get headers as an object: string -> DynamicString
            var headers = paw_request.getHeaders(true);
            result += '\n\nHeaders:\n\n';
            // enumerate headers
            for (var headerName in headers) { // headerName is a string
                var headerValue = headers[headerName]; // DynamicString
                result += headerName + ': ' + this.concatDynamicString(headerValue) + '\n';
            }
            if (request.body.length) {
                result += '\n\nBody:\n\n' + request.body;
            }

            //return result;


            template = readFile("confluence.mustache");
            return Mustache.render(template, {
                name: paw_request.name,
                method: paw_request.method,
                path: url,
                request: this.request(paw_request),
                response: this.response(paw_request.getLastExchange())
            });
        };
    }
    ;

    ConfluenceGenerator.identifier = "com.cobeisfresh.ConfluenceGenerator";

    ConfluenceGenerator.title = "Confluence Content Generator";

    ConfluenceGenerator.fileExtension = "md";

    registerCodeGenerator(ConfluenceGenerator);

}).call(this);
