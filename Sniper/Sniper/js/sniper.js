pm.sniper = (function() {

    var PARAM_API_KEY = "api_key";
    var PARAM_API_SIGN = "api_sign";
    var PARAM_USER_TOKEN = "user_token";
    var PARAM_TIMESTAMP = "t";

    var $miMessage = $("#request-helper-mi-message");
    var $mapiMessage = $("#request-helper-mapi-message");

    function processForMi() {
        try {
            $miMessage.html("");

            var paramMap = getParamMap();
            if (paramMap == null) {
                return;
            }

            var config = readMiConfigForm();

            var sKey = paramMap[PARAM_API_KEY];
            if (config.apiKey !== sKey) {
                throw new Error("Config API key " + config.apiKey + " doesn't match with url API key " + sKey);
            }

            var hash = makeMd5Hash(config.apiSecret);
            addOrUpdateRequestParam(PARAM_API_SIGN, hash, $miMessage);

            marshallObject("miConfig", config);
        }
        catch (e) {
            $miMessage.css("color", "red").html("<li>" + e.message + " </li>");
        }
    }

    function processForMapi() {
        try  {
            $mapiMessage.html("");

            var paramMap = getParamMap();
            if (paramMap == null) {
                return;
            }

            var config = readMapiConfigForm();

            var sKey = paramMap[PARAM_API_KEY];
            if (config.apiKey !== sKey) {
                throw new Error("Config API key " + config.apiKey + " doesn't match with url API key " + sKey);
            }

            var userToken = paramMap[PARAM_USER_TOKEN];
            if (userToken) {
                if (!config.tokenId) {
                    throw new Error("tokenId must not be null");
                }

                if (config.tokenId !== userToken) {
                    throw new Error("Config tokenId " + config.tokenId + " doesn't match with url tokenId " + userToken);
                }


                if (!config.tokenSecret) {
                    throw new Error("tokenSecret must not be null");
                }
            }

            doProcessForMapi(config);
        }
        catch (e) {
            $mapiMessage.css("color", "red").html("<li>" + e.message + " </li>");
        }
    }

    function doProcessForMapi(config) {
        removeRequestParam(PARAM_API_SIGN, $mapiMessage);
        addOrUpdateRequestParam(PARAM_TIMESTAMP, config.timestamp, $mapiMessage);

        var hash = makeSha1Hash(config.apiSecret, config.tokenSecret);
        var headerValue = "OAuth " + PARAM_API_SIGN + "=" + hash;

        addOrUpdateRequestHeader("Authorization", headerValue, $mapiMessage);

        marshallObject("mapiConfig", config);
    }

    function getTokenSecret(tokenId, config) {
        var tokenUrl = getTokenUrl(config);
        var url = tokenUrl + "?access_token=" + tokenId;
        console.log(url);

        var jqXhr = $.ajax({
            url: url
        });

        return jqXhr;
    }

    function addOrUpdateRequestParam(paramName, expectedValue, $message) {
        var urlParams = getUrlParams();
        var bodyParams = getBodyParams();

        var urlPos = findParamPosition(urlParams, paramName);
        var bodyPos = findParamPosition(bodyParams, paramName);

        // If the parameter is not present, add the parameter to url.
        if (urlPos == -1 && bodyPos == -1) {
            addUrlParam(paramName, expectedValue);
            $message.css("color", "green").append("<li>Added param " + paramName + " " + expectedValue + "</li>");
        }
        // If the parameter is in url, update the parameter in url if necessary.
        else if (urlPos >= 0) {
            var p = urlParams[urlPos];
            if (p.value != expectedValue) {
                updateUrlParam(paramName, expectedValue);
                $message.css("color", "green").append("<li>Replaced param " + paramName + " " + p.value + " with " + expectedValue + "</li>");
            }
        }
        // if the parameter is in body, update the parameter in body if necessary.
        else if (bodyPos >= 0) {
            var p = bodyParams[bodyPos];
            if (p.value != expectedValue) {
                updateBodyParam(paramName, expectedValue);
                $message.css("color", "green").append("<li>Replaced param " + paramName + " " + p.value + " with " + expectedValue + "</li>");
            }
        }
    }

    function removeRequestParam(paramName, $message) {
        var urlParams = getUrlParams();
        var bodyParams = getBodyParams();

        var urlPos = findParamPosition(urlParams, paramName);
        var bodyPos = findParamPosition(bodyParams, paramName);

        if (urlPos >= 0) {
            removeUrlParam(paramName);
            $message.css("color", "green").append("<li>Removed param " + paramName + " from url");
        }

        if (bodyPos >= 0) {
            removeBodyParam(paramName);
            $message.css("color", "green").append("<li>Removed param " + paramName + " from body");
        }
    }

    function filterParams(params, paramName) {
        var newParams = [];
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            if (paramName !== p.key) {
                newParams.push(p);
            }
        }
        return newParams;
    }

    function addUrlParam(paramName, paramValue) {
        var params = $("#url-keyvaleditor").keyvalueeditor("getValues");
        params.push({"key": paramName, "value": paramValue});
        resetUrlParams(params);
    }

    function updateUrlParam(paramName, paramValue) {
        var params = $("#url-keyvaleditor").keyvalueeditor("getValues");
        updateParam(params, paramName, paramValue);
        resetUrlParams(params);
    }

    function removeUrlParam(paramName) {
        var params = $("#url-keyvaleditor").keyvalueeditor("getValues");
        var newParams = filterParams(params, paramName);
        resetUrlParams(newParams);
    }

    function updateBodyParam(paramName, paramValue) {
        if (pm.request.body.mode === "params") {
            var bodyParams = $('#formdata-keyvaleditor').keyvalueeditor('getValues');
            updateParam(bodyParams, paramName, paramValue);
            $('#formdata-keyvaleditor').keyvalueeditor('reset', bodyParams);
        }
        else if (pm.request.body.mode === "urlencoded") {
            var bodyParams = $('#urlencoded-keyvaleditor').keyvalueeditor('getValues');
            updateParam(bodyParams, paramName, paramValue);
            $('#urlencoded-keyvaleditor').keyvalueeditor('reset', bodyParams);
        }
        else if (pm.request.body.mode === "raw") {
            var bodyParams = getBodyRawParams();
            updateParam(bodyParams, paramName, paramValue);
            var raw = transferParamsToRaw(bodyParams);
            pm.request.body.codeMirror.setValue(raw)
        }
    }

    function removeBodyParam(paramName) {
        if (pm.request.body.mode === "params") {
            var bodyParams = $('#formdata-keyvaleditor').keyvalueeditor('getValues');
            var newParams = filterParams(bodyParams, paramName);
            $('#formdata-keyvaleditor').keyvalueeditor('reset', newParams);
        }
        else if (pm.request.body.mode === "urlencoded") {
            var bodyParams = $('#urlencoded-keyvaleditor').keyvalueeditor('getValues');
            var newParams = filterParams(bodyParams, paramName);
            $('#urlencoded-keyvaleditor').keyvalueeditor('reset', newParams);
        }
        else if (pm.request.body.mode === "raw") {
            var bodyParams = getBodyRawParams();
            var newParams = filterParams(bodyParams, paramName);
            var raw = transferParamsToRaw(newParams);
            pm.request.body.codeMirror.setValue(raw)
        }
    }

    function updateParam(params, paramName, paramValue) {
        var pos = findParamPosition(params, paramName);
        if (pos >= 0) {
            var p = params[pos];
            p.value = paramValue;
        }
    }

    function findParamPosition(params, paramName) {
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            if (p.key === paramName) {
                return i;
            }
        }
        return -1;
    }

    function resetUrlParams(params) {
        $('#url-keyvaleditor').keyvalueeditor('reset', params);
        pm.request.setUrlParamString(params);
    }

    function addOrUpdateRequestHeader(headerName, expectedValue, $message) {
        var headers = pm.request.headers;

        var pos = findHeaderPosition(headerName, headers);

        // If the header is not present, we simply add it.
        if (pos == -1) {
            headers.push({key: headerName, name: headerName, value: expectedValue});
            resetRequestHeaders(headers);
            $message.css("color", "green").append("<li>Added header " + headerName + " " + expectedValue + "</li>");
        }
        // If the header is present but is not correct, we update it.
        else {
            var h = headers[pos];
            if (h.value !== expectedValue) {
                h.value = expectedValue;
                resetRequestHeaders(headers);
                $message.css("color", "green").append("<li>Replaced header " + headerName + " " + h.value + " with " + expectedValue + "</li>");
            }
        }
    }

    function findHeaderPosition(headerName, headers) {
        for (var i = 0; i < headers.length; i++) {
            var h = headers[i];
            if (h.key === headerName) {
                return i;
            }
        }
        return -1;
    }

    function resetRequestHeaders(headers) {
        pm.request.headers = headers;
        $('#headers-keyvaleditor').keyvalueeditor('reset', headers);
    }

    function getParamMap() {
        var params = getUrlParams();

        if (isMethodWithBody()) {
            var bodyParams = getBodyParams();
            params = params.concat(bodyParams);
        }        
        
        if (params == null || params.length == 0) {
            return null;
        }
        
        var paramMap = {};
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            if (p.key) {
                paramMap[p.key] = p.value;
            }
        }
        return paramMap;
    }

    function isMethodWithBody() {
        var method = pm.request.method.toUpperCase();
        return pm.request.isMethodWithBody(method);
    }

    function getUrlParams() {
        var urlParams = pm.request.getUrlEditorParams();
        return urlParams;        
    }

    function getBodyParams() {
        var bodyParams = [];
        if (!isMethodWithBody()) {
            return bodyParams;
        }

        if (pm.request.body.mode === "params") {
            bodyParams = $('#formdata-keyvaleditor').keyvalueeditor('getValues');
        }
        else if (pm.request.body.mode === "urlencoded") {
            bodyParams = $('#urlencoded-keyvaleditor').keyvalueeditor('getValues');
        }
        else if (pm.request.body.mode === "raw") {
            bodyParams = getBodyRawParams();
        }
        return bodyParams;
    }

    function getBodyRawParams() {
        var text = getBodyRawData();
        var params = [];
        if (text) {
            var splits = text.split("&");
            for (var i = 0; i < splits.length; i++) {
                var pairs = splits[i].split("=");
                if (pairs != null && pairs.length == 2) {
                    params.push({"key": pairs[0], "value": pairs[1]})
                }
            }
        }
        return params;
    }

    function transferParamsToRaw(params) {
        if (params == null || params.length == 0) {
            return null;
        }

        var buffer = new Array();
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            var entry = p.key + "=" + p.value;
            buffer.push(entry);
        }
        return buffer.join("&");
    }
    
    function getBodyRawData() {
        var text = pm.request.body.getRawData();
        var resultText = text;
        if (resultText) {
            if (/^\?/.test(resultText)) {
                resultText = resultText.substring(1);
            }

            if (/&$/.test(resultText)) {
                resultText = resultText.substring(0, resultText.length - 1);
            }

            if (resultText !== text) {
                pm.request.body.codeMirror.setValue(resultText)
            }
        }
        return resultText;
    }

    function makeMd5Hash(secret) {
        var paramMap = getParamMap();
        var baseString = getBaseString(paramMap);
        var message = baseString + secret;
        var hash = CryptoJS.MD5(message).toString(CryptoJS.enc.Hex);
		return hash;
    }

    function makeSha1Hash(apiSecret, tokenSecret) {
        var secret = apiSecret;
        if (tokenSecret) {
            secret = secret + "&" + tokenSecret;
        }

        var paramMap = getParamMap();
        var baseString = getBaseString(paramMap);
        var message = secret + baseString;
        var hash = CryptoJS.SHA1(message).toString(CryptoJS.enc.Hex);
        return hash;
    }

    function getBaseString(paramMap) {
        var keys = getSortedKeys(paramMap);
		var buffer = new Array();
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = decodeURIComponent(paramMap[key]);
            buffer.push(value);
        }
        return buffer.join("");
    }

    function getSortedKeys(paramMap) {
        var keys = [];
        for (var key in paramMap) {
            if (paramMap.hasOwnProperty(key) && key !== PARAM_API_SIGN) {
                keys.push(key);
            }
        }
        keys.sort();
        return keys;
    }

    function initMapiConfigForm() {
        var timestamp = currentTimeSeconds();
        $("#request-helper-mapi-timestamp").val(timestamp);

        var config = unmarshallObject("mapiConfig");
        if (config) {
            $("#request-helper-mapi-apiKey").val(config.apiKey);
            $("#request-helper-mapi-apiSecret").val(config.apiSecret);
            $("#request-helper-mapi-tokenId").val(config.tokenId);
            $("#request-helper-mapi-tokenSecret").val(config.tokenSecret);
        }
    }

    function initMiConfigForm() {
        var config = unmarshallObject("miConfig");
        if (config) {
            $("#request-helper-mi-apiKey").val(config.apiKey);
            $("#request-helper-mi-apiSecret").val(config.apiSecret);
        }
    }

    function readMapiConfigForm() {
        var config = {};

        // var authServerUrl = $("#request-helper-mapi-authServerUrl").val();
        // if (!authServerUrl) {
        //     throw new Error("Authorization server url must not be null");
        // }

        // if(/^http/.test(authServerUrl) === false) {
        //     authServerUrl = "http://" + authServerUrl;
        // }

        // if (/\/$/.test(authServerUrl) === false) {
        //     authServerUrl = authServerUrl + "/";
        // }
        
        config.apiKey = $("#request-helper-mapi-apiKey").val();
        config.apiSecret = $("#request-helper-mapi-apiSecret").val();
        config.tokenId = $("#request-helper-mapi-tokenId").val();
        config.tokenSecret = $("#request-helper-mapi-tokenSecret").val();
        config.timestamp = $("#request-helper-mapi-timestamp").val();

        if (!config.apiKey) {
            throw new Error("API key must not be null");
        }

        if (!config.apiSecret) {
            throw new Error("API secret must not be null");
        }
        return config;
    }

    function readMiConfigForm() {
        var config = {};
        config.apiKey = $("#request-helper-mi-apiKey").val();
        config.apiSecret = $("#request-helper-mi-apiSecret").val();

        if (!config.apiKey) {
            throw new Error("API key must not be null");
        }

        if (!config.apiSecret) {
            throw new Error("API secret must not be null");
        }
        return config;
    }

    function marshallObject(key, object) {
        localStorage.setItem(key, JSON.stringify(object));
    }

    function unmarshallObject(key) {
        var text = localStorage.getItem(key);
        return JSON.parse(text);
    }

    function getTokenUrl(config) {
        return config.authServerUrl + "api/oauth/token/get";
    }

    function currentTimeSeconds() {
        var seconds = parseInt(new Date().getTime() / 1000);
        return seconds;
    }

    function isSniperRawRequest() {
        if (pm.helpers.activeHelper === "mapi" || pm.helpers.activeHelper === "mi") {
            if (pm.request.dataMode === "raw") {
                return true;
            }
        }
        return false;
    }

    return {
        initMapiConfigForm: initMapiConfigForm,
        initMiConfigForm: initMiConfigForm,
        processForMapi: processForMapi,
        processForMi: processForMi,
        isSniperRawRequest: isSniperRawRequest
    };


})();
