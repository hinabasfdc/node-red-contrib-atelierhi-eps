module.exports = function (RED) {
  const jwt = require('jsonwebtoken');
  const request = require('request');

  let TOKEN = '';
  let TOKEN_EXPIRE = Date.now();

  function EinsteinPlatformServices(config) {
    RED.nodes.createNode(this, config);

    this.request_url = config.request_url;
    this.default_feature = config.default_feature;
    this.default_modelid = config.default_modelid;
    this.account_id = config.account_id;
    this.private_key = config.private_key;

    let node = this;
    node.on('input', function (msg) {

      getAccessToken(node, msg, (access_token) => {

        // Parameter Check & デフォルト値設定
        if (!msg.eps.feature) msg.eps.feature = node.default_feature;
        if (!msg.eps.modelid) msg.eps.modelid = node.default_modelid;

        let reqUrl;
        let formData = {};
        formData.modelId = msg.eps.modelid;

        // Vision or Language のいずれかの場合
        if (msg.eps.feature == "IMAGECLASSIFICATION" || msg.eps.feature == "OBJECTDETECTION" || msg.eps.feature == "SENTIMENT" || msg.eps.feature == "INTENT") {

          // 予測する画像 or テキストを msg から抽出
          if (msg.eps.sampleBase64Content) {
            formData.sampleBase64Content = msg.eps.sampleBase64Content;
          } else if (msg.eps.sampleLocation) {
            formData.sampleLocation = msg.eps.sampleLocation;
          } else if (msg.eps.document) {
            formData.document = msg.eps.document;
          } else {
            msg.payload = '{"message": "No image or text content."}';
            node.send(msg);
            return;
          }

          if (msg.eps.feature == "IMAGECLASSIFICATION") {
            reqUrl = node.request_url + "vision/predict";
          } else if (msg.eps.feature == "OBJECTDETECTION") {
            reqUrl = node.request_url + "vision/detect";
          } else if (msg.eps.feature == "SENTIMENT") {
            reqUrl = node.request_url + "language/sentiment";
          } else if (msg.eps.feature == "INTENT") {
            reqUrl = node.request_url + "language/intent";
          }

          //予測・解析を行うHTTPリクエスト文を組み立て
          let reqOptionsPrediction = {
            url: reqUrl,
            headers: {
              'Authorization': 'Bearer ' + access_token,
              'Cache-Control': 'no-cache',
              'Content-Type': 'multipart/form-data'
            },
            formData: formData
          }

          //組み立てたリクエスト文を送信
          request.post(reqOptionsPrediction, (error, response, body) => {
            msg.payload = body;
            node.send(msg);
          });

          // 特定できなかった場合
        } else {
          msg.payload = '{"message": "No feature founded."}';
          node.send(msg);
        }
      });
    });
  };

  function getAccessToken(node, msg, cb) {

    console.log("[DEBUG]: TOKEN: " + TOKEN);
    console.log("[DEBUG]: TOKEN_EXPIRE: " + TOKEN_EXPIRE);

    let current_time = Date.now();
    let expired = true;

    // TOKEN の有効期限まで1分以上ある場合は、すでに取得済みの TOKEN を利用
    if (TOKEN_EXPIRE - current_time > 60000) {
      expired = false;
    }

    // すでに取得済みの TOKEN を利用
    if (TOKEN && !expired) {
      console.log("[DEBUG]: Token is not expired.");
      cb(TOKEN);

      // TOKEN を取得
    } else {
      console.log("[DEBUG]: Token is expired.");

      // JWT payload
      let rsa_payload = {
        "sub": node.account_id,
        "aud": node.request_url + "oauth2/token"
      }

      // TOKEN の有効期間を10分に設定
      let rsa_options = {
        header: {
          "alg": "RS256",
          "typ": "JWT"
        },
        expiresIn: '10m'
      }

      // Sign the JWT payload
      let assertion = jwt.sign(
        rsa_payload,
        node.private_key,
        rsa_options
      );

      //HTTPリクエストの組み立て
      let options = {
        url: node.request_url + "oauth2/token",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'accept': 'application/json'
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`
      }

      //組み立てたリクエスト文をPOSTで送信
      //レンスポンスが返ってきたらファンクション内を実行
      request.post(options, (error, response, body) => {
        let data = JSON.parse(body);
        let access_token = data["access_token"];

        // 取得した TOKEN を変数に格納(有効期限を10分後までに)
        TOKEN = access_token;
        TOKEN_EXPIRE = Date.now() + 600000;
        console.log("[DEBUG]: Set new TOKEN.");

        cb(access_token);
      });
    }
  };

  RED.nodes.registerType("Einstein-Platform-Services", EinsteinPlatformServices);
}