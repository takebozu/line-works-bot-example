'use strict'

const API_ID = process.env.API_ID;
const SERVER_API_CONSUMER_KEY = process.env.SERVER_API_CONSUMER_KEY;
const BOT_NO = process.env.BOT_NO;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;    //セットされている場合はSalesforceへの接続を行う

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request-promise')
const crypto = require('crypto');
const app = express()
const url = require('url');

const force = require('./force.js')


//--------------------------------------------------------------------------------
// LINE WORKSへのメッセージ送信関連
//--------------------------------------------------------------------------------

/**
 * 認証が必要である旨のメッセージを送る
 * 
 * @param accountId
 */
function sendAuthorizationLink(accountId) {
    const authUrl = force.getAuthorizationEndpoint(accountId);
    const content = '{"type": "link", "contentText": "リンクをクリックしてログインしてください。リンクの有効期限は今から10分間です。", "linkText": "Salesforceにログイン", "link":"' + authUrl + '"}'
    sendMessage(accountId, content);
}

/**
 * クエリの結果のメッセージを送る
 *
 * @param {string} accountId
 * @param {Object} json Salesfoce REST APIから返されたレスポンス
 */
function sendQueryResult(accountId, json) {
    let content = null;
    if(json.totalSize > 0) {
        content = '{"type": "text", "text": "答えは「' + json.records[0].Name + '」ですね。" }'
    } else {
        content = '{"type": "text", "text": "該当レコードはありません。" }'
    }
    sendMessage(accountId, content);
}

/** 
 * LINE WORKSにメッセージを送信する。
 *
 * @param {string} accountId
 * @param {string} content 送信するメッセージ（JSON形式）。LINE WORKSのBOT SDKで定義されたもの。
 */
function sendMessage(accountId, content) {
    var headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'consumerKey': SERVER_API_CONSUMER_KEY,
        'Authorization': 'Bearer ' + ACCESS_TOKEN
    }

    var options = {
        url: 'https://apis.worksmobile.com/' + API_ID + '/message/sendMessage/v2',
        method: 'POST',
        headers: headers,
        body: '{"botNo": ' + BOT_NO + ',"accountId": "' + accountId + '","content": ' + content + '}'
    }

    request(options)
    .then(function (body) {
        console.log(body) ; 
    }).catch(function(e) {
        console.log(e);
    });
}

//--------------------------------------------------------------------------------
// APIサーバーとしての機能
//--------------------------------------------------------------------------------

app.set('port', (process.env.PORT || 5000))

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
    res.send('Hello, I\'m a chat bot');
});

// Botへのリクエストを処理
app.post('/callback', function(req, res, next){
    res.status(200).end();

    //リクエストを解釈
    let accountId = req.body.source.accountId;
    let userMessage = req.body.content.text;
    let content = null;
    if (req.body.type == 'message') {
        if (CLIENT_ID) {
            //Salesforceへの問い合わせを行う
            force.query(accountId, "select Name from Account where Name like '%25" + userMessage + "%25' limit 1")
            .then(function(json) {
                sendQueryResult(accountId, json);
            }).catch(function(e) {
                if(e.toString() == "Authorization Required") {
                    sendAuthorizationLink(accountId);
                } else {
                    console.log(e);
                }
            });
        } else {
            //同じ応答をする（echo）だけ
            content = '{"type": "text","text": "' + userMessage + '"}'
        }
    } else {
        content = '{"type": "text","text": "リクエストを処理できませんでした。"}'
    }

    // クライアントへメッセージを返信
    if (accountId != null && content != null) {
        sendMessage(accountId, content);
    }
});

//OAuth2.0のAuthorization Codeを取得するためのエンドポイント
app.get('/code_callback', function(req, res, next){
    const urlParts = url.parse(req.url, true);
    const query = urlParts.query;
    force.exchangeCodeForToken(query.code, query.state)
    .then(function(accountId) {
        res.send('Succeeded!');
        const content = '{"type": "text","text": "認証が完了しました。キーワードを入力すると、それを含む取引先名を答えます。"}';
        sendMessage(accountId, content);
    })
    .catch(function(e) {
        res.send('Error:' + e);
    });
});

// サーバー起動
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})