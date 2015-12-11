var express = require('express');
var router = express.Router();
var buffer = require('../buffers/buffer');
var Country = require('../models/countryModel');
var Currency = require('../models/currencyModel');
var Language = require('../models/languageModel');
var Geo = require('../models/geoModel');
var _ = require('lodash');

// send results
var sendResults = function (res, model, records, language) {

    var results = findByLanguage(model, records, language);
    res.status(200).send(results);
};

// find / filter by iso code
var findByIsoCode = function (records, code) {
    return [_.find(records, {'isoCode': code})];
};

// find / filter by language
var findByLanguage = function (model, records, language) {

    var foundRecords = [],
        foundRecord,
        fields;

    if (language !== undefined) {
        fields = model.schema.paths;
        _.forEach(records, function(record) {
            foundRecord = {};
            _.forOwn(fields, function(value, key) {
                if (key === "names") {
                    foundRecord[key] = [_.find(record[key], {'language': language})];
                } else {
                    foundRecord[key] = record[key];
                }
            });
            foundRecords.push(foundRecord);
        });
        return foundRecords;
    } else {
        return records;
    }
};

// get and send data
var getAndSendData = function (res, model, language, bufferedRecords, code) {

    var records,
        query;


    if (bufferedRecords) {
        // retrieve data from buffer - if exists
        records = bufferedRecords;
        if (code) {
            records = findByIsoCode(records, code);
        }
        sendResults(res, model, records, language);
    } else {
        // retrieve data from database
        query = {};
        if (code) {
            query = { isoCode: code };
        }
        model.find(query)
            .exec()
            .then(function (records) {
                bufferedRecords = records;
                sendResults(res, model, records, language);
            }, function (err) {
                res.status(400).send(err);
            });
    }
};

// get and send geo data
var getAndSendGeos = function(res, code) {

    var query = {};

    // prepare query - there must be a better as identifying the parameters by their length ... searching
    if (code) {
        if (code.length === 2) {
            query = {cca2: code};
        } else if (code.length === 3) {
            query = {cca3: code};
        } else if (code.length > 3){
            query = {"names.common": code};
        }
    }

    // retrieve data from database
    Geo.find(query)
        .exec()
        .then(function (geos) {
            res.status(200).send(geos);
        }, function (err) {
            res.status(400).send(err);
        });
};

// GET countries
router.get('/countries', function (req, res, next) {

    getAndSendData(res, Country, req.query.lang, buffer.countries);
});

// GET country by ISO code
router.get('/countries/:code', function (req, res, next) {

    getAndSendData(res, Country, req.query.lang, buffer.countries, req.params.code);
});

// GET geos
router.get('/geos', function (req, res, next) {

    getAndSendGeos(res);
});

// GET geos by ISO code
router.get('/geos/:code', function (req, res, next) {

    getAndSendGeos(res, req.params.code);
});

// GET currencies
router.get('/currencies', function (req, res, next) {

    getAndSendData(res, Currency, req.query.lang, buffer.currencies);
});

// GET currencies by ISO code
router.get('/currencies/:code', function (req, res, next) {

    getAndSendData(res, Currency, req.query.lang, buffer.currencies, req.params.code);
});

// GET languages
router.get('/languages', function (req, res, next) {

    getAndSendData(res, Language, req.query.lang, buffer.languages);
});

// GET language by ISO code
router.get('/languages/:code', function (req, res, next) {

    getAndSendData(res, Language, req.query.lang, buffer.languages, req.params.code);
});

module.exports = router;
