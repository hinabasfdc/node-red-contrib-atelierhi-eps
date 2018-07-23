# node-red-contrib-atelierhi-eps
A Node-RED node to easly access prediction APIs of the Salesforce Einstein Platform Services. (Vision/Language)
* Read this in other languages:[日本語](README.ja.md)
## Install
* (Command) Run the following command in the root directory of your Node-RED install.
```
npm install -s node-red-contrib-atelierhi-eps 
```
* (Node-RED GUI) Install package from an "Manage palatte" menu.
```
node-red-contrib-atelierhi-eps
```
## Initial Setup
* Drag & Drop "Einstein Platform Services" node from parette to an flow design workspace.
* Double click the node dropped then input "Account ID" & "Private Key" fields.
* If you don't have an account id & private key for the Einstein Platform Serviecs, you are able to get them from https://api.einstein.ai/signup.

## Sample Flow
### API Usage
![API Usage](_res/eps_node-red_testapiusage_flow.png)
1. Drag & drop "inject" node.
2. Drag & drop "function" node.
    * Name: "Test Api Usage"
    * Function: 
```
msg.eps = {};
msg.eps.feature = "APIUSAGE";
return msg;
```
3. Drag & drop "Einstein Platform Services" node.
    * Account ID: Set your account id.
    * Private Key: Set your private key.
4. Drag & drop "debug" node.
5. Connect "inject" to "function", "function" to "Einstein Platform Services" and "Einstein Platform Services" to
 "debug".
6. Click "Deploy" then click button of "inject" node.
7. You can see a response of "API Usage" api call in a "debug" tab on the right side.

### Image Recognition (URL)
![Image Recognition(URL)](_res/eps_node-red_testimageurl_flow.png)

1. Drag & drop "inject" node.
2. Drag & drop "function" node.
    * Name: "Test Image Classification"
    * Function: 
```
msg.eps = {};
msg.eps.feature = "IMAGECLASSIFICATION";
msg.eps.modelid = "FoodImageClassifier";
msg.eps.sampleLocation = "https://upload.wikimedia.org/wikipedia/commons/d/d3/Supreme_pizza.jpg";
return msg;
```
3. Drag & drop "Einstein Platform Services" node. (You can reuse the same "Einstein Platform Services" node already deployed.)
    * Account ID: Set your account id.
    * Private Key: Set your private key.
4. Drag & drop "debug" node.
5. Connect "inject" to "function", "function" to "Einstein Platform Services" and "Einstein Platform Services" to
 "debug".
6. Click "Deploy" then click button of "inject" node.
7. You can see a response of "Image Classification" api call in a "debug" tab on the right side. (Einstein platform service will probably respond that it is a pizza!)

### Image Recognition (Base64string)
![Image Recognition(Base64string)](_res/eps_node-red_testbase64_flow.png)

Create image file selection web page.  

1. Drag & drop "http" node.
    * Method: "GET"
    * URL: "/eps_imagerecognition"
2. Drag & drop "template" node.
    * Template
```
<html>
    <head>
        <title>Einstein Vision with Node-RED</title>
    </head>
    <body>
        <h1>Einstein Vision with Node-RED</h1>
        <h2>Select an image file</h2>
        <form  action="/eps_imagerecognition" method="post" enctype="multipart/form-data">
            <input type="file" name="imagedata" accept="image/*" />
            <input type="submit" value="Predict"/>
        </form>
    </body>
</html>
```
3. Drag & drop "http response" node.
4. Connect "http" to "template" and "template" to "http response".  

Create recieve data and response flow.  

1. Drag & drop "http" node.
  * Method: "POST"
  * URL: "eps_imagerecognition"
2. Drag & drop "function" node.
  * Name: "File to base64"
  * Function:
```
msg.eps = {};
msg.eps.sampleBase64Content = msg.req.files[0].buffer.toString('base64');
return msg;
```
3. Drag & drop "Einstein Platform Services". (You can reuse the same "Einstein Platform Services" node already deployed.)
    * Account ID: Set your account id.
    * Private Key: Set your private key.
4. Drag & drop "http response" node.
5. Connect "http" to "function", "function" to "Einstein Platform Services" and "Einstein Platform Services" to
 "http response".
6. Click "Deploy".
7. Access "[[YOUR_NODE-RED_URL]]/eps_imagerecognition" using web browser.
8. Select an image file then click "Predict" button.
9. You can see raw response. 

## Parameters
### node
* Name
    * Set display name.
* URL
    * Set Einstein Platform Services API endpoint URL.
* Default Feature
    * Node use this feature if node can not define which feature use from an input paramters.
    * Values
        * IMAGECLASSIFICATION (<-default)
        * OBJECTDETECTION
        * SENTIMENT
        * INTENT
* Default ModelId
    * Node use this model id if node can not define which model id use from an input patameters.(Default: GeneralImageClassifier)
* Account ID
    * Set Einstein Platform Services's account id.
* Private Key
    * Set Einstein Platform Services's private key.

### Input
* msg.eps.feature
    * Define feature to use.
    * Values.
        * APIUSAGE
        * IMAGECLASSIFICATION
        * OBJECTDETECTION
        * SENTIMENT
        * INTENT
* msg.eps.modelid
    * Define modelid to use.
* msg.eps.sampleBase64Content
    * Use this parameter if you select  IMAGECLASSIFICATION/OBJECTDETECTION feature.
    * Set a character string encoded image with base64.
* msg.eps.sampleLocation to predict
    * Use this parameter if you select.  IMAGECLASSIFICATION/OBJECTDETECTION feature
    * Set a image url to predict.
* msg.eps.document
    * Use this parameter if you select SENTIMENT/INTENT feature.
    * Set a text to predict.

### Output
* msg.payload
    * Einstein Platform Services raw response or node execution error. 