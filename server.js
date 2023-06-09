const express = require('express');
const proxy = require('express-http-proxy');
const {URLSearchParams} = require('url');

function extractUrlParameters(urlString) {
  const parsedUrl = new URLSearchParams(urlString);
  const params = Object.fromEntries(parsedUrl.entries());
  return params;
}

function constructObject(channel, subdivision, postcode, searchLocation, pageSize, page, propertyType, minimumPrice, maximumPrice, surroundingSuburbs, replaceProjectWithFirstChild) {
  const obj = {
    channel: channel,
    localities: [
      {
        subdivision: subdivision,
        postcode: postcode,
        searchLocation: searchLocation
      }
    ],
    pageSize: pageSize,
    page: page,
    filters: {
      propertyTypes: [propertyType],
      priceRange: {
        minimum: minimumPrice,
        maximum: maximumPrice
      },
      surroundingSuburbs: surroundingSuburbs,
      replaceProjectWithFirstChild: replaceProjectWithFirstChild
    }
  };
  return obj;
}

const app = express();
app.use(express.static('public'));
app.use('/', proxy('https://services.realestate.com.au/services/listings/search', {
  proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
    if (srcReq.url.indexOf('/?') !== -1) {
      const params = extractUrlParameters(srcReq.url.replace('/?',''));
      const paramObject = constructObject(
        params.channel,
        params.subdivision,
        params.postcode,
        params.searchLocation,
        params.pageSize,
        params.page,
        params.propertyType,
        params.minimumPrice,
        params.maximumPrice,
        params.surroundingSuburbs,
        params.replaceProjectWithFirstChild
      );
      srcReq.url = '/services/listings/search?query=' + JSON.stringify(paramObject);
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
        let trimmedData = data.tieredResults[0].results;
        let returnJSON = {
          totalListings: data.totalResultsCount,
          currentPage: data.resolvedQuery.page,
          pageSize: data.resolvedQuery.pageSize,
          results: null
        };
        for (const id in trimmedData) {
         if (trimmedData.hasOwnProperty(id)) {
           delete trimmedData[id].standard;
           delete trimmedData[id].midtier;
           delete trimmedData[id].lister;
           delete trimmedData[id].featured;
           delete trimmedData[id]['_links'];
           delete trimmedData[id].signature;
           delete trimmedData[id].channel;
           delete trimmedData[id].advertising;
           delete trimmedData[id].showAgencyLogo;
           delete trimmedData[id].listers;
           delete trimmedData[id].productDepth;
           delete trimmedData[id].calculator;
           delete trimmedData[id].address.subdivisionCode;
           delete trimmedData[id].address.showAddress;
           delete trimmedData[id].address.locality;
           delete trimmedData[id].agency;
           delete trimmedData[id].isSoldChannel;
           delete trimmedData[id].isBuyChannel;
           delete trimmedData[id].signatureProject;
           delete trimmedData[id].listingId;
           delete trimmedData[id].classicProject;
           delete trimmedData[id].agencyListingId;
           delete trimmedData[id].mainImage;
           delete trimmedData[id].dateAvailable.dateDisplay;
           delete trimmedData[id].modifiedDate;
           delete trimmedData[id].isRentChannel;
           delete trimmedData[id].applyOnline;
         }
        }
        const imgParam = req.url.match('[?&]images=([^&]+)');
        if (imgParam) {
          const numImages = parseInt(imgParam[1]);
          if(numImages > 0){
            for (let key in trimmedData) {
              if (trimmedData.hasOwnProperty(key)) {
                const images = trimmedData[key].images;
                if (Array.isArray(images) && images.length > numImages) {
                  trimmedData[key].images = images.slice(0, numImages);
                }
              }
            }
          }
          else{
            for (let key in trimmedData) {
              if (trimmedData.hasOwnProperty(key)) {
                delete trimmedData[key].images;
              }
            }
          }
        }
        else{
            for (let key in trimmedData) {
              if (trimmedData.hasOwnProperty(key)) {
                delete trimmedData[key].images;
              }
            }
        }
        returnJSON.results = trimmedData;
        return JSON.stringify(returnJSON);
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