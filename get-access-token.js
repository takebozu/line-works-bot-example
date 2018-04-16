'use strict'

const API_ID=process.env.API_ID;
const SERVER_ID=process.env.SERVER_ID;

var fs = require('fs');
fs.readFile('./private_key.txt', 'utf8', function (err, text) {

    //JWTの生成
    const jwt = require('jsonwebtoken');
    const now = Date.now() / 1000
    const assertion = jwt.sign({"iss":SERVER_ID, "iat":now, "exp":now + 300}, text, {algorithm:'RS256'});

    //Access Tokenのリクエスト
    const request = require('request');

    var headers = {
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'
    }

    var options = {
        url: 'https://authapi.worksmobile.com/b/' + API_ID + '/server/token',
        method: 'POST',
        headers: headers,
        //json: true,
        form: {"grant_type":"urn:ietf:params:oauth:grant-type:jwt-bearer",
               "assertion":assertion}
    }

    request(options, function (error, response, body) {
        console.log(body);
    })

});

