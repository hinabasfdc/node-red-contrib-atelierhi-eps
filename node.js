/*
 * Einstein Platform Services for Node-RED
 * Supported features:
 *  API Usage
 *  Vision - Image Classification
 *  Vision - Object Detection
 *  Language - Sentiment
 *  Language - Intent
 * Author: hinaba@salesforce.com
 * 
 * WARNING: This is NOT Salesforce supported library.
 */

module.exports = function (RED) {
  const jwt = require('jsonwebtoken');
  const request = require('request');

  let TOKEN = '';
  let TOKEN_EXPIRE = Date.now();

  function EinsteinPlatformServices(config) {
    RED.nodes.createNode(this, config);

    // Node parameter check
    if (config.request_url.slice(-1) == "/") {
      this.request_url = config.request_url;
    } else {
      this.request_url = config.request_url + "/";
    }

    this.default_feature = config.default_feature;
    this.default_modelid = config.default_modelid;

    if (config.account_id) {
      this.account_id = config.account_id;
    } else {
      msg.payload = '{"message": "No account id."}';
      node.send(msg);
      return;
    }

    if (config.account_id) {
      this.private_key = config.private_key;
    } else {
      msg.payload = '{"message": "No private key."}';
      node.send(msg);
      return;
    }

    let node = this;
    node.on('input', function (msg) {

      // Call getting access token function & execute prediction api call
      getAccessToken(node, msg, (access_token) => {

        // Msg parameter check & Set default value
        if (!msg.eps) msg.eps = {};
        if (!msg.eps.feature) msg.eps.feature = node.default_feature;
        if (!msg.eps.modelid) msg.eps.modelid = node.default_modelid;

        let reqUrl;
        let formData = {};
        formData.modelId = msg.eps.modelid;

        // Vision or Language
        if (msg.eps.feature == "IMAGECLASSIFICATION" || msg.eps.feature == "OBJECTDETECTION" || msg.eps.feature == "SENTIMENT" || msg.eps.feature == "INTENT") {

          // Get image or text from msg object
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

          // Set api url
          if (msg.eps.feature == "IMAGECLASSIFICATION") {
            reqUrl = node.request_url + "vision/predict";
          } else if (msg.eps.feature == "OBJECTDETECTION") {
            reqUrl = node.request_url + "vision/detect";
          } else if (msg.eps.feature == "SENTIMENT") {
            reqUrl = node.request_url + "language/sentiment";
          } else if (msg.eps.feature == "INTENT") {
            reqUrl = node.request_url + "language/intent";
          }

          // Set request options
          let reqOptionsApiCall = {
            url: reqUrl,
            headers: {
              'Authorization': 'Bearer ' + access_token,
              'Cache-Control': 'no-cache',
              'Content-Type': 'multipart/form-data'
            },
            formData: formData
          }

          // Call api & set result to msg.payload
          request.post(reqOptionsApiCall, (error, response, body) => {
            msg.payload = body;
            node.send(msg);
          });

          // API Usage
        } else if (msg.eps.feature == "APIUSAGE") {

          // Set api usage request option
          let reqOptionsApiCall = {
            url: node.request_url + "apiusage",
            headers: {
              'Authorization': 'Bearer ' + access_token,
              'Cache-Control': 'no-cache'
            }
          }

          // Call api usage api & Set result to msg.payload
          request.get(reqOptionsApiCall, (error, response, body) => {
            msg.payload = body;
            node.send(msg);
          });

          // Other feature
        } else {
          msg.payload = '{"message": "No available feature founded."}';
          node.send(msg);
        }

      });
    });
  };

  // Internal function for getting access token.
  function getAccessToken(node, msg, cb) {

    //console.log("[DEBUG]: TOKEN: " + TOKEN);
    //console.log("[DEBUG]: TOKEN_EXPIRE: " + TOKEN_EXPIRE);

    let current_time = Date.now();
    let expired = true;

    // Re-use the token if it has over 60 secconds to expire.
    if (TOKEN_EXPIRE - current_time > 60000) {
      expired = false;
    }

    // Return token
    if (TOKEN && !expired) {
      //console.log("[DEBUG]: Token is not expired.");
      cb(TOKEN);

    // Get new token.
    } else {
      //console.log("[DEBUG]: Token is expired.");

      // JWT payload
      let rsa_payload = {
        "sub": node.account_id,
        "aud": node.request_url + "oauth2/token"
      }

      // Set token available time to 600 seconds.
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

      // Set api request option.
      let reqOptionsApiCall = {
        url: node.request_url + "oauth2/token",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'accept': 'application/json'
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`
      }

      // Call access token api & set new token and callback function.
      request.post(reqOptionsApiCall, (error, response, body) => {
        let data = JSON.parse(body);
        let access_token = data["access_token"];

        TOKEN = access_token;
        TOKEN_EXPIRE = Date.now() + 600000;
        //console.log("[DEBUG]: Set new TOKEN.");

        cb(access_token);
      });
    }
  };

  RED.nodes.registerType("Einstein-Platform-Services", EinsteinPlatformServices);
}