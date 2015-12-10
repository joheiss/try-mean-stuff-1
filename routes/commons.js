var express = require('express');
var router = express.Router();
var buffer = require('../buffers/buffer');
var Country = require('../models/countryModel');
var Language = require('../models/languageModel');
var Geo = require('../models/geoModel');
var _ = require('lodash');

// send countries
var sendCountries = function (countries, language, res) {

    // countries = filterByLanguage(countries, language);
    countries = findCountriesByLanguage(countries, language);
    res.status(200).send(countries);
};

// send languages
var sendLanguages = function (languages, language, res) {

    languages = findLanguageByLanguage(languages, language);
    res.status(200).send(languages);
};

// find by country code
var findCountryByCountryCode = function (countries, code) {
    return [_.find(countries, {'isoCode': code})];
};

// find by countries by language
var findCountriesByLanguage = function (countries, language) {

    if (language !== undefined) {
        var foundCountries = [];
        countries.forEach(function (country) {
            var foundCountry = {};
            foundCountry.isoCode = country.isoCode;
            foundCountry.names = [_.find(country.names, {'language': language})];
            foundCountries.push(foundCountry);
        });
        return foundCountries;
    } else {
        return countries;
    }
};

// find by language code
var findLanguageByLanguageCode = function (languages, code) {
    return [_.find(languages, {'isoCode': code})];
};

// find language by language
var findLanguageByLanguage = function (languages, language) {

    if (language !== undefined) {
        var foundLanguages = [];
        languages.forEach(function (lang) {
            var foundLanguage = {};
            foundLanguage.isoCode = lang.isoCode;
            foundLanguage.iso6392b = lang.iso6392b;
            foundLanguage.iso6392t = lang.iso6392t;
            foundLanguage.names = [_.find(lang.names, {'language': language})];
            foundLanguages.push(foundLanguage);
        });
        return foundLanguages;
    } else {
        return languages;
    }
};
// GET countries
router.get('/countries', function (req, res, next) {

    if (buffer.countries) {
        sendCountries(buffer.countries, req.query.lang, res);
    } else {
        Country.find()
            .exec()
            .then(function (countries) {
                buffer.countries = countries;
                sendCountries(countries, req.query.lang, res);
            }, function (err) {
                res.status(400).send(err);
            });
    }
});

// GET country by ISO code
router.get('/countries/:code', function (req, res, next) {

    if (buffer.countries) {
        var countries = findCountryByCountryCode(buffer.countries, req.params.code);
        sendCountries(countries, req.query.lang, res);
    } else {
        Country.find({isoCode: req.params.code})
            .exec()
            .then(function (countries) {
                buffer.countries = countries;
                sendCountries(countries, req.query.lang, res);
            }, function (err) {
                res.status(400).send(err);
            });
    }
});

// GET geos
router.get('/geos', function (req, res, next) {

    Geo.find()
        .exec()
        .then(function (geos) {
            res.status(200).send(geos);
        }, function (err) {
            res.status(400).send(err);
        });
});

// GET geos by ISO code
router.get('/geos/:code', function (req, res, next) {

    var query;
    if (req.params.code.length === 2) {
        query = { cca2: req.params.code };
    } else if (req.params.code.length === 3) {
        query = { cca3: req.params.code };
    } else {
        query = { "names.common": req.params.code };
    }

    Geo.find(query)
        .exec()
        .then(function (geos) {
            res.status(200).send(geos);
        }, function (err) {
            res.status(400).send(err);
        });
});

// GET languages
router.get('/languages', function (req, res, next) {

    if (buffer.languages) {
        sendLanguages(buffer.languages, req.query.lang, res);
    } else {
        Language.find()
            .exec()
            .then(function (languages) {
                buffer.languages = languages;
                sendLanguages(languages, req.query.lang, res);
            }, function (err) {
                res.status(400).send(err);
            });
    }
});

// GET language by ISO code
router.get('/languages/:code', function (req, res, next) {

    if (buffer.languages) {
        var languages = findLanguageByLanguageCode(buffer.language, req.params.code);
        sendLanguages(languages, req.query.lang, res);
    } else {
        Language.find({isoCode: req.params.code})
            .exec()
            .then(function (languages) {
                buffer.languages = languages;
                sendLanguages(languages, req.query.lang, res);
            }, function (err) {
                res.status(400).send(err);
            });
    }
});

module.exports = router;
