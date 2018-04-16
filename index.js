'use strict'

const API_ID = process.env.API_ID;
const SERVER_API_CONSUMER_KEY = process.env.SERVER_API_CONSUMER_KEY;
const BOT_NO = process.env.BOT_NO;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const crypto = require('crypto');
const app = express()

app.set('port', (process.env.PORT || 5000))

// リクエストの改ざんチェック
app.use(bodyParser.json({ verify: function (req, res, buf, encoding) {
    const body = buf.toString(encoding);
    console.log('body:' + body);

    const hmac = crypto.createHmac('sha256', API_ID);
    hmac.update(body);
    const hmacDigest = hmac.digest();
    const bodySig = Buffer.from(hmacDigest).toString('base64');
    console.log('Signature from body  : ' + bodySig);
    const headerSig = req.get('X-WORKS-Signature');
    console.log('Signature from header: ' + headerSig);
    if (bodySig == headerSig) {
        console.log('Valid signature.');
    } else {
        throw new Error('Invalid signature!');
    }
} }));

// ルートへアクセスした場合は、ダミーメッセージを返す
app.get('/', function (req, res) {
    res.send('Hello, I\'m a chat bot');
});

// Botへのリクエストを処理
app.post('/callback', function(req, res, next){
    res.status(200).end();

    //リクエストを解釈
    var accountId = req.body.source.accountId;
    var message = null;
    if (req.body.type == 'message') {
        var userMessage = req.body.content.text;
        message = userMessage;  //同じ応答をする（echo）だけ
    } else {
        message = 'リクエストを処理できませんでした。';
    }

    // クライアントへメッセージを返信
    if (accountId != null && message != null) {
        const request = require('request');

        var headers = {
            'Content-Type': 'application/json; charset=UTF-8',
            'consumerKey': SERVER_API_CONSUMER_KEY,
            'Authorization': 'Bearer ' + ACCESS_TOKEN
        }

        var options = {
            url: 'https://apis.worksmobile.com/' + API_ID + '/message/sendMessage/v2',
            method: 'POST',
            headers: headers,
            body: '{"botNo": ' + BOT_NO + ',"accountId": "' + accountId + '","content": {"type": "text","text": "' + message + '"}}'
        }

        request(options, function (error, response, body) {
            console.log(body) ; 
        })
    }

});

// サーバー起動
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})