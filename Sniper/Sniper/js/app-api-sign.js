(function(){

	var ecyptedTool = {
		
		"baseParams" : {
			"app_api_key": true, 
			"app_user_token": true, 
			"app_salt": true, 
			"app_t": true, 
			"app_user_ip": true, 
			"api_secret": true, 
			"token_secret": true
		},
		
		"appApiSign" : "",

		"totalParams" : {}, 

		"missingParams" : [],

		makeNeededParams: function() {
			console.log("making needed params-----");

			ecyptedTool.totalParams = {};
			ecyptedTool.missingParams = [];
			var _missedParams = [];
			var _baseParams = []; 
			var _totalParams = {};

			//获取url参数
			var _urlParams = pm.request.getUrlEditorParams();
			for (var index in _urlParams) {
				
				if (_urlParams[index]["key"] in ecyptedTool.baseParams) 
					if (_urlParams[index]["value"] != "" && _urlParams[index]["value"] != null) {
						console.log("input param(" + _urlParams[index]["key"] + "): " + _urlParams[index]["value"]);
						_totalParams[_urlParams[index]["key"]] = _urlParams[index]["value"];
					}
			}

			

			//获取api_secret&token_secret
			var apiSecret = $("#request-helper-mapi-apiSecret").val();
			var tokenSecret = $("#request-helper-mapi-tokenSecret").val();
			if (apiSecret != "" && apiSecret != null) {
				console.log("api_secret : " + apiSecret);
				_totalParams["api_secret"] = apiSecret;
			}
				
			if (tokenSecret != "" && tokenSecret != null) {
				console.log("token_secret : " + tokenSecret);
				_totalParams["token_secret"] = tokenSecret;
			} 
				

			
			//检测未填参数
			for (var p in ecyptedTool.baseParams)
				!_totalParams.hasOwnProperty(p) && ecyptedTool.missingParams.push(p);

			console.log("missing params'length : " + ecyptedTool.missingParams.length);
			//显示未填参数

			if (ecyptedTool.missingParams.length != 0 && ecyptedTool.showMissingParamsResult())
			{
				
				return;
			}

			//var _config = ecyptedTool.unmarshallObject("mapiConfig");
			
			return ecyptedTool.totalParams = _totalParams;
		},

		//从localStorage获取api_secret,token_id信息,key为
		unmarshallObject: function(key) {
        	var text = localStorage.getItem(key);
        	return JSON.parse(text);
    	},

		ecrypted : function() {
			console.log("start to ecrypt");

			ecyptedTool.appApiSign = "";
			var beforeEcrypted = ecyptedTool.totalParams["api_secret"] + "&" + ecyptedTool.totalParams["token_secret"];
			
			delete ecyptedTool.totalParams["api_secret"];
			delete ecyptedTool.totalParams["token_secret"];

			for (var param in ecyptedTool.totalParams) {
				beforeEcrypted += ecyptedTool.totalParams[param];
			}

			ecyptedTool.appApiSign = CryptoJS.SHA1(beforeEcrypted);
			console.log("app_api_sign: " + ecyptedTool.appApiSign);
		},



		showEcyptedResult: function() {
			var missingParamsResult = $("#missing-param");
			var ecryptedResult = $("#ecrypted-result");
			missingParamsResult.html("");
			ecryptedResult.html("");

			ecryptedResult.append("app_api_sign: <br><span class='app-api-sign'>" + ecyptedTool.appApiSign + "</span>");
		},

		showMissingParamsResult: function() {

			var missingParamsResult = $("#missing-param");
			var ecryptedResult = $("#ecrypted-result");
			missingParamsResult.html("");
			ecryptedResult.html("");

			for (var mp in ecyptedTool.missingParams)
				missingParamsResult.append("missing param: <span class='param'>" + ecyptedTool.missingParams[mp] + "</span><br>");
			return true;
		},

		startEcrypt: function() {
			console.log("you click ecrypt-button");

			if (ecyptedTool.makeNeededParams()) {
				ecyptedTool.ecrypted();
				ecyptedTool.showEcyptedResult();
			} else {
				ecyptedTool.showMissingParamsResult();
			}
		},

		init: function() {
			$("#ecrypted-button").click(ecyptedTool.startEcrypt);
		}
	};

	ecyptedTool.init();
})();

