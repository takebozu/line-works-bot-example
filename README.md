# Talk Bot for LINE WORKS

[LINE WORKS](https://line.worksmobile.com/)の「トーク Bot API」を使ったBotのサンプルです。

## 前提
`git clone`したあと、`npm install`で必要なモジュールをインストールしておいてください。

## 準備（オプション）
ローカル環境で実行する場合は、下記の手順で.envファイルを作成します。heroku上で実行する場合は、.envファイルは作成せず、各値をメモしておきます。

### .envファイルの準備
まず最初に、[LINE WORKS Developer Console](https://developers.worksmobile.com/jp/console)にアクセスします。

APIタブを開いて、必要な情報を作成・取得します。取得した情報は、index.jsと同じディレクトリに.envという名前のファイルを作成して、KEY=VALUE形式で記載します。
なお、SERVER_IDは「Server List(ID登録タイプ)」を作成することで取得することができます。「Server List(固定IPタイプ)」ではないので、注意してください。

```
API_ID=XXXXX
SERVER_API_CONSUMER_KEY=XXXXX
SERVER_ID=XXXXX
```

また、「Server List(ID登録タイプ)」を作成すると認証キーをダウンロードできます。ダウンロードして、lw_server_auth_key.pemという名称でindex.jsと同じディレクトリに保存します。

### Botの登録

次に、Developer ConsoleでBotタブを開いて、Botを登録します。Callback URLはあとで取得しますので、一旦仮のものに設定しておきます。取得した、Bot No.を、.envファイルにKEY=VALUE形式で記載します。

```
BOT_NO=XXXX
```

## herokuでの実行

### herokuのセットアップ
次のコマンドでherokuの環境を作成します。

`heroku login`

`heroku apps:create {YOUR HEROKU APP'S NAME}`

### herokuのURLをBotにセット
上記のherokuのセットアップで表示されたURLの末尾に/callbackを付けたものを、上記の「Botの登録」で登録したBotのCallbackにセットします。

### herokuのConfig Varsへの値のセット
次の環境変数については、herokuにデプロイしたアプリで利用しますので、herokuのConfig Varsにも設定します。

* API_ID
* SERVER_API_CONSUMER_KEY
* SERVER_ID
* BOT_NO

また、ダウンロードした認証キーファイルの中身を、SERVER_AUTH_KEYというキー名で、Config Varsに登録します。

## 実行
herokuにソースをDeployします。

`git push heroku master`

その後、LINE WORKSの管理者用画面の、 サービス > Bot で作成したBotを追加し、「公開」に設定すると、LINE WORKSのトークでBotに対して行ったコメントが、Botからエコーバックされます。
