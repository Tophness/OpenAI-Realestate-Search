const express = require('express');
const proxy = require('express-http-proxy');

const app = express();
app.use(express.static('public'));
app.use('/', proxy('https://services.realestate.com.au/services/listings/search', {
  proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
    if (srcReq.url.indexOf('/?') !== -1 && srcReq.url.indexOf('/services') == -1) {
      srcReq.url = srcReq.url.replace('/?', '/services/listings/search?')
    }
    proxyReqOpts.headers["Access-Control-Allow-Origin"] = "*";
    proxyReqOpts.headers["Access-Control-Allow-Methods"] = "*";
    proxyReqOpts.headers["Access-Control-Allow-Headers"] = "*";
    proxyReqOpts.headers["Access-Control-Allow-Credentials"] = "true";
    return proxyReqOpts;
  },
  userResDecorator: function(proxyRes, proxyResData, req, res) {
    if (req.url.indexOf('?query=') !== -1) {
      const data = JSON.parse(proxyResData.toString('utf8'));
      if (data.tieredResults) {
        const resCount = data.tieredResults[0].count;
        const resTier = data.tieredResults[0].tier;
        let trimmedData = data.tieredResults[0];
        for (const id in trimmedData.results) {
         if (trimmedData.results.hasOwnProperty(id)) {
           delete trimmedData.results[id].standard;
           delete trimmedData.results[id].midtier;
           delete trimmedData.results[id].lister;
           delete trimmedData.results[id].featured;
           delete trimmedData.results[id]['_links'];
           delete trimmedData.results[id].signature;
           delete trimmedData.results[id].channel;
           delete trimmedData.results[id].advertising;
           delete trimmedData.results[id].showAgencyLogo;
           delete trimmedData.results[id].listers;
           delete trimmedData.results[id].productDepth;
           delete trimmedData.results[id].calculator;
           delete trimmedData.results[id].address.subdivisionCode;
           delete trimmedData.results[id].address.showAddress;
           delete trimmedData.results[id].address.locality;
           delete trimmedData.results[id].agency;
           delete trimmedData.results[id].isSoldChannel;
           delete trimmedData.results[id].isBuyChannel;
           delete trimmedData.results[id].signatureProject;
           delete trimmedData.results[id].listingId;
           delete trimmedData.results[id].classicProject;
           delete trimmedData.results[id].agencyListingId;
           delete trimmedData.results[id].mainImage;
           delete trimmedData.results[id].dateAvailable.dateDisplay;
           delete trimmedData.results[id].modifiedDate;
           delete trimmedData.results[id].isRentChannel;
           delete trimmedData.results[id].applyOnline;
         }
        }
        const imgParam = req.url.match('[?&]images=([^&]+)');
        if (imgParam) {
          const numImages = parseInt(imgParam[1]);
          if(numImages > 0){
            for (let key in trimmedData.results) {
              if (trimmedData.results.hasOwnProperty(key)) {
                const images = trimmedData.results[key].images;
                if (Array.isArray(images) && images.length > numImages) {
                  trimmedData.results[key].images = images.slice(0, numImages);
                }
              }
            }
          }
          else{
            for (let key in trimmedData.results) {
              if (trimmedData.results.hasOwnProperty(key)) {
                delete trimmedData.results[key].images;
              }
            }
          }
        }
        else{
            for (let key in trimmedData.results) {
              if (trimmedData.results.hasOwnProperty(key)) {
                delete trimmedData.results[key].images;
              }
            }
        }
        return JSON.stringify(trimmedData);
      }
      else{
         return proxyResData;
      }
    }
    else{
       return proxyResData;
    }
  }
}));

const server = app.listen(443);