'use strict'

require('dotenv-extended').load();

const API_ID = process.env.API_ID;
const SERVER_API_CONSUMER_KEY = process.env.SERVER_API_CONSUMER_KEY;
const SERVER_ID = process.env.SERVER_ID;
const SERVER_AUTH_KEY = process.env.SERVER_AUTH_KEY;
const BOT_NO = process.env.BOT_NO;

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios')
const qs = require('qs');


//--------------------------------------------------------------------------------
// LINE WORKSの認証関連
//--------------------------------------------------------------------------------

let accessToken = null;

/**
 * Access Tokenを取得する。
 * データベースに保存されていればそれを返し、保存されていなければ新規に取得する。
 *
 * @return {String} Access Token。
 */
async function getAccessToken(forceRefresh) {
	if(accessToken && !forceRefresh) {
		return accessToken; 
    }

    try {
        //キーの読み込み
        let keyText = SERVER_AUTH_KEY;
        if(!keyText) {
            keyText = fs.readFileSync('./lw_server_auth_key.pem', 'utf8');
        }

        //JWTの生成
        const now = Date.now() / 1000;
        const assertion = jwt.sign({"iss": SERVER_ID, "iat":now, "exp":now + 300}, keyText, {algorithm:'RS256'});

        let formData = {
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion : assertion
        };

        let config = {
            url: 'https://authapi.worksmobile.com/b/' + API_ID + '/server/token',
            method: 'POST',
            headers: {
                'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'
            },
            data: qs.stringify(formData)
        }

        let response = await axios(config);
        accessToken = response.data.access_token;
        
        return accessToken;
    } catch (error) {
        console.log(error);
    }
    return null;
}


//--------------------------------------------------------------------------------
// LINE WORKSへのメッセージ送信関連
//--------------------------------------------------------------------------------

/** 
 * LINE WORKSにメッセージを送信する。
 *
 * @param {string} accountId
 * @param {string} content 送信するメッセージ（JSON形式）。LINE WORKSのBOT SDKで定義されたもの。
 */
async function sendMessage(accountId, content, isNewTokenRequired = false) {
    let accessToken = await getAccessToken(isNewTokenRequired);

    const config = {
        url: 'https://apis.worksmobile.com/' + API_ID + '/message/sendMessage/v2',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'consumerKey': SERVER_API_CONSUMER_KEY,
            'Authorization': 'Bearer ' + accessToken
        },
        data: '{"botNo": ' + BOT_NO + ',"accountId": "' + accountId + '","content": ' + content + '}'
    }

    try {
        let response = await axios(config);
        if(response.data.errorCode) {
            console.log(`Response error code: ${response.data.errorCode}`);
            console.log(`Response error message: ${response.data.errorMessage}`);
        }
        if(!isNewTokenRequired && response.data.errorCode && response.data.errorCode === '024') {
            //認証エラー @see https://developers.worksmobile.com/jp/document/1002003?lang=ja
            await sendMessage(accountId, content, true);
        }
    } catch (error) {
        console.log(error);
    }
}

//--------------------------------------------------------------------------------
// APIサーバーとしての機能
//--------------------------------------------------------------------------------

app.set('port', (process.env.PORT || 5000));

// リクエストの改ざんチェック
app.use(bodyParser.json({ verify: function (req, res, buf, encoding) {
    const body = buf.toString(encoding);

    const hmac = crypto.createHmac('sha256', API_ID);
    hmac.update(body);
    const hmacDigest = hmac.digest();
    const bodySig = Buffer.from(hmacDigest).toString('base64');
    const headerSig = req.get('X-WORKS-Signature');
    if (bodySig == headerSig) {
        console.log('Valid signature.');
    } else {
        throw new Error('Invalid signature!');
    }
} }));

// ルートへアクセスした場合は、ダミーメッセージを返す
app.get('/', function (req, res) {
    res.send('It works!');
});

// Botへのリクエストを処理
app.post('/callback', function(req, res, next){
    res.status(200).end();

    //リクエストを解釈
    let accountId = req.body.source.accountId;
    let content = null;
    switch (req.body.type) {
    case "join":
        //handle joining
        content = '{"type": "text","text": "ようこそ"}';
        break;
    case "leave":
        //handle leaving
        break;
    case "message":
        //同じ応答をする（echo）だけ
        content = `{"type": "text","text": "${req.body.content.text}"}`;
        break;
    default:
        content = `{"type": "text","text": "リクエストを処理できませんでした。(message.type: ${req.body.type})"}`;
    }

    // クライアントへメッセージを返信
    if (accountId != null && content != null) {
        sendMessage(accountId, content);
    }
});

// サーバー起動
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
})