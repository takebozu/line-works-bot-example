'use strict'

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const request = require('request-promise')
const uuid = require('uuid/v1');
const datastore = require('nedb-promise')
const db = new datastore({ filename: 'data/auth.db', autoload: true });


//--------------------------------------------------------------------------------
// 関数定義
//--------------------------------------------------------------------------------

/**
 * SalesforceのREST APIを呼び出す。
 *
 * @param {string} userId ユーザー識別子
 * @param {string} accessToken Access Token
 * @param {string} instanceUrl SalesforceのインスタンスURL
 * @param {string} soql SOQL
 * @param {boolean} enableTokenRefresh ステータス401が返された場合に、トークンのリフレッシュを試みるかどうか
 * @return {Object} エラーの詳細
 */
function callRestApi(userId, accessToken, instanceUrl, soql, enableTokenRefresh = true) {
	return new Promise(function(resolve, reject) {
		var headers = {
	        'Content-Type': 'application/json',
	        'Authorization': 'Bearer ' + accessToken
	    }

	    var options = {
	        url: instanceUrl + '/services/data/v39.0/query/?q=' + soql,
	        method: 'GET',
	        headers: headers,
	        resolveWithFullResponse: true 
	    }

	    request(options)
	    .then(function(response) {
	    	const json = JSON.parse(response.body);
	    	resolve(json);
		}).catch(function(e) {
	    	if(e.statusCode == 401) {
	    		if (enableTokenRefresh) {
		    		refreshAccessToken(userId)
		    		.then(function(newAccessToken) {
						callRestApi(userId, newAccessToken, instanceUrl, soql, false)
						.then(function(json) {
							resolve(json);	
						});
		    		});
	    		} else {
	    			reject("Failed to call REST API.");
	    		}
	    	} else {
	    		reject(e);
	    	}

		});
	});
}

/**
 * DBに保存されているAccess Tokenを取り出す。
 *
 * @param {string} userId ユーザー識別子
 * @return {Promise}
 */
function getAccessToken(userId) {
	return new Promise(function(resolve, reject) {
		db.findOne({user_id: userId, access_token:{$exists:true}})
		.then(function(doc){
			if(doc != null) {
				resolve(doc);
			} else {
				reject("Authorization Required");
			}
		}).catch(function(e) {
			reject(e);
		});
	});
}

/**
 * Access Tokenをリフレッシュする。
 *
 * @param {string} userId ユーザー識別子
 * @return {Promise}
 */
function refreshAccessToken(userId) {
	let newAccessToken = null;
	return new Promise(function(resolve, reject) {
		db.findOne({user_id: userId})
		.then(function(doc){
			if(doc != null) {
		        var headers = {
		            'Content-Type': 'application/x-www-form-urlencoded'
		        }

		        var formData = {
				 	grant_type: 'refresh_token',
				 	client_id: CLIENT_ID,
				 	client_secret: CLIENT_SECRET,
				 	refresh_token: doc.refresh_token
				}

		        var options = {
		            url: 'https://login.salesforce.com/services/oauth2/token',
		            method: 'POST',
		            headers: headers,
		            formData: formData
		        }

		        return request(options);
		    }
		}).then(function(responseBody) {
			const json = JSON.parse(responseBody);
	    	newAccessToken = json.access_token;
	    	return db.update({user_id: userId},
	    		{$set: {access_token: json.access_token, instance_url: json.instance_url}},
	    		{upsert:false});
		}).then(function(recordCount) {
	    	resolve(newAccessToken);
		}).catch(function(err) {
			reject(err);
		});
	});
}


//--------------------------------------------------------------------------------
// モジュール機能
//--------------------------------------------------------------------------------

module.exports = {
	/**
	 * SalesforceのOAuth認証エンドポイントを取得する。
	 *
	 * @param {string} userId ユーザー識別子
	 */
	getAuthorizationEndpoint: function(userId) {
		const state = uuid().replace(/-/g, '');
		const stateExpired = Date.now() + 10 * 60 * 1000;	// in 10 minutes
		db.update({user_id: userId}, {$set: {state: state, state_expired: stateExpired}}, {upsert: true});

		const url = 'https://login.salesforce.com/services/oauth2/authorize'
			+ '?response_type=code'
			+ '&client_id=' + CLIENT_ID
			+ '&redirect_uri=' + REDIRECT_URI
			+ '&state=' + state;

		return url;

    },
    /**
     * 認証コードをAccess Tokenに交換する。
     *
     * @param {string} code 認証コード
     * @param {string} state 想定されるステート（認証サーバーから返されたものをそのままセット）
     */
    exchangeCodeForToken: function(code, state) {
    	let userId = null;
    	return new Promise(function(resolve, reject) {
	    	const now = Date.now();
			db.findOne({state: state, state_expired:{$gt: now}})
			.then(function(doc) {
				if(doc != null) {
					userId = doc.user_id;
					return Promise.resolve();
				} else {
					return Promise.reject("The link may be expired.");
				}
			}).then(function() {
		        var headers = {
		            'Content-Type': 'application/x-www-form-urlencoded'
		        }

		        var formData = {
				 	grant_type: 'authorization_code',
				 	code: code,
				 	client_id: CLIENT_ID,
				 	client_secret: CLIENT_SECRET,
				 	redirect_uri: REDIRECT_URI
				}

		        var options = {
		            url: 'https://login.salesforce.com/services/oauth2/token',
		            method: 'POST',
		            headers: headers,
		            formData: formData
		        }

		        return request(options);
			}).then(function(responseBody) {
	        	const json = JSON.parse(responseBody);
	        	return db.update({user_id: userId},
	        		{$set: {access_token: json.access_token, refresh_token: json.refresh_token, instance_url: json.instance_url}},
	        		{upsert:false});
			}).then(function(recordCount) {
	        	resolve(userId);
			}).catch(function(e) {
				reject(e);
			});
		});
    },
    /**
     * Salesforceにクエリを投げる。
     *
     * @param {string} userId ユーザー識別子
     * @param {string} soql SOQL
     */
    query: function(userId, soql) {
    	return new Promise(function(resolve, reject) {
	   		getAccessToken(userId)
			.then(function(doc){
				callRestApi(userId, doc.accessToken, doc.instance_url, soql)
				.then(function(json) {
					resolve(json);
				});
	    	}).catch(function(e) {
	    		reject(e);
	    	});
    	});
    }
};




