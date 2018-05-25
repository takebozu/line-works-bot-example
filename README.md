# Talk Bot for LINE WORKS

[LINE WORKS](https://line.worksmobile.com/)の「トーク Bot API」を使ったBotのサンプルです。
Salesforceへのアクセス部分はモジュールがありそうですが、勉強も兼ねてフルスクラッチで書いています。

以下はHerokuにデプロイする前提での手順です。

## 前提
`git clone`したあと、`npm install`で必要なモジュールをインストールしておいてください。

## 準備
### .envファイルの準備
まず最初に、[LINE WORKS Developer Console](https://developers.worksmobile.com/jp/console)にアクセスします。

APIタブを開いて、必要な情報を作成・取得します。取得した情報は、index.jsと同じディレクトリに.envという名前のファイルを作成して、KEY=VALUE形式で記載します。
なお、SERVER_IDは「Server List(ID登録タイプ)」を作成することで取得することができます。「Server List(固定IPタイプ)」ではないので、注意してください。

```
API_ID=XXXXX
SERVER_API_CONSUMER_KEY=XXXXX
SERVER_ID=XXXXX
```

また、「Server List(ID登録タイプ)」を作成すると認証キーをダウンロードできます。ダウンロードして、private_key.txtという名称でindex.jsと同じディレクトリに保存します。

### Botの登録

次に、Developer ConsoleでBotタブを開いて、Botを登録します。Callback URLはあとで取得しますので、一旦仮のものに設定しておきます。取得した、Bot No.を、.envファイルにKEY=VALUE形式で記載します。

```
BOT_NO=XXXX
```

### foremanコマンド（任意）
.envに書かれている環境変数を読み込んだ上で、アプリを実行するために、foremanコマンドを利用すると便利です。foremanコマンドがインストールされていない場合は、

`sudo gem install foreman`

などのコマンドでインストールしてください。

### Access Tokenの取得
次のコマンドでLINE WORKSからAccess Tokenを取得します。

`foreman run node get-access-token.js`


コンソールに次のような書式で結果が表示されます。

```
{
   "access_token":"XXXXX",
   "token_type":"Bearer",
   "expires_in":86400
}
```

"access_token":の後の""内の部分をコピーして、.envファイルに次の形式で貼り付けます。ダブルクォーテーション(")を貼り付けしないように注意してください。

```
ACCESS_TOKEN=XXXXX
```

### herokuのセットアップ
次のコマンドでherokuの環境を作成します。

`heroku login`

`heroku apps:create {YOUR HEROKU APP'S NAME}`

### herokuのURLをBotにセット
上記のherokuのセットアップで表示されたURLの末尾に/callbackを付けたものを、上記の「Botの登録」で登録したBotのCallbackにセットします。

### herokuのConfig Varsへの値のセット
.envに記載した環境変数のうち、次の環境変数については、herokuにデプロイしたアプリで利用しますので、herokuのConfig Varsにも設定します。

* API_ID
* BOT_NO
* SERVER_API_CONSUMER_KEY
* ACCESS_TOKEN

## 実行
herokuにソースをDeployします。

`git push heroku master`

その後、LINE WORKSの管理者用画面の、 サービス > Bot で作成したBotを追加し、「公開」に設定すると、LINE WORKSのトークでBotに対して行ったコメントが、Botからエコーバックされます。

## （オプション）Salesforceに接続する場合
### 概要
Salesforceに接続すると、入力したキーワードと部分一致する取引先名を応答してくれるようになります。

### 設定方法
SalesforceでConnected Appを作成し、次の情報を.envファイルに次の形式で貼り付けます。

```
CLIENT_ID=XXXXX
CLIENT_SECRET=XXXXX
REDIRECT_URI=XXXXX
```

なお、REDIRECT_URIは上記のherokuのセットアップで表示されたURLの末尾にcode_callbackを付けたものになります。
また、これらの環境変数は、herokuにデプロイしたアプリでも利用しますので、herokuのConfig Varsにも設定します。




