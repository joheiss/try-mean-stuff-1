var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({dest: './uploads'});
var csvparse = require('csv-parse');
var fs = require('fs');
var Country = require('../models/countryModel');
var Language = require('../models/languageModel');
var Currency = require('../models/currencyModel');
var Geo = require('../models/geoModel');
var _ = require('lodash');
var buffer = require('../buffers/buffer');

// import country file
router.post('/import/countries', upload.any(), parseFile);

// import language file
router.post('/import/languages', upload.any(), parseFile);

// import currency file
router.post('/import/currencies', upload.any(), parseFile);

// import geo data
router.get('/import/geo', function (req, res, next) {

    var url = 'mongodb://localhost:27017/jovisco-test';
    var dbclient = require('mongodb').MongoClient;
    dbclient.connect(url, function (err, db) {
        if (err) {
            res.status(500).send(err);
            return err;
        }
        db.collection('oldgeos').find().toArray(function (err, docs) {
            if (err) {
                console.log("ERR: " + err);
                return err;
            }
            // convert old geo docs to new geo docs
            convertOld2NewGeo(docs);
            db.close();
            res.status(200).send();
        });
    });
});

// parse file
function parseFile(req, res, next) {

    var records = [];

    var filePath = req.files[0].path;

    function onNewRecord(record) {
        records.push(record);
    }

    function onError(error) {
        res.status(500).send(err);
    }

    function done(linesRead) {
        res.status(200).send(linesRead);
    }

    // determine collection name based on URL path
    var collName;
    if (req.path.indexOf("/countries") !== -1) {
        collName = "countries";
    } else if (req.path.indexOf("/languages") !== -1) {
        collName = "languages";
    } else if (req.path.indexOf("/currencies") !== -1) {
        collName = "currencies";
    } else {
        onError({err: "Unknown collection"});
    }

    var columns = true;
    parseCSVFile(filePath, columns, collName, onNewRecord, onError, done);

}

// parse CSV file
function parseCSVFile(sourceFilePath, columns, collName, onNewRecord, onError, onDone) {

    var source = fs.createReadStream(sourceFilePath);

    var linesRead = 0;

    var parser = csvparse({
        delimiter: ';',
        columns: columns
    });

    var decimals,
        hexas,
        symbol;

    parser.on("readable", function () {
        var record;
        while (record = parser.read()) {
            if (collName === "countries") {
                // save new country
                var country = new Country({
                    isoCode: record.isoCode,
                    names: [
                        {language: "de", name: record.name_de},
                        {language: "en", name: record.name_en},
                        {language: "fr", name: record.name_fr},
                        {language: "es", name: record.name_es}
                    ]
                });
                country.save(function (err) {
                    console.log(err);
                });
            } else if (collName === "languages") {
                // save new language
                var language = new Language({
                    isoCode: record.isoCode,
                    iso6392b: record.iso6392b,
                    iso6392t: record.iso6392t,
                    names: [
                        {language: "de", name: record.name_de},
                        {language: "en", name: record.name_en},
                        {language: "fr", name: record.name_fr},
                        {language: "es", name: record.name_es},
                        {language: "it", name: record.name_it},
                        {language: "pt", name: record.name_pt},
                        {language: "native", name: record.name_native}
                    ]
                });
                language.save(function (err) {
                    console.log(err);
                });
            } else if (collName === "currencies") {
                console.log(record);
                // prepare unicode stuff
                decimals = [];
                decimals = record.symbolUnicodeDecimals.split(",");
                hexas = [];
                hexas = record.symbolUnicodeHex.split(",");
                symbol = record.symbol;
                if (decimals.length > 0 && (!symbol || symbol.indexOf("?") !== -1 || symbol === " ")) {
                    symbol = String.fromCharCode.apply(symbol, decimals);
                }
                // save new currency
                var currency = new Currency({
                    isoCode: record.isoCode,
                    isoNumber: record.isoNumber,
                    minorUnit: record.minorUnit,
                    symbol: symbol,
                    symbolUnicodeDecimals: _.cloneDeep(decimals),
                    symbolUnicodeHex: _.cloneDeep(hexas),
                    names: [
                        {language: "de", name: record.name_de, shortName: record.shortname_de},
                        {language: "en", name: record.name_en, shortName: record.shortname_en},
                        {language: "fr", name: record.name_fr, shortName: record.shortname_fr},
                        {language: "es", name: record.name_es, shortName: record.shortname_es}
                    ]
                });
                currency.save(function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
            linesRead++;
            onNewRecord(record);
        }
    });

    parser.on("error", function (err) {
        onError(err);
    });

    parser.on("end", function () {
        onDone(linesRead);
    });

    source.pipe(parser);

}

// country name constructor
function CountryName(language, official, common) {

    // make sure constructor works even if new keyword is missing
    var self = this instanceof CountryName ? this : Object.create(CountryName.prototype);
    self.language = language;
    self.names = {};
    self.names.official = official;
    self.names.common = common;
    return self;
}

// language name constructor
function LanguageName(language, name) {

    // make sure constructor works even if new keyword is missing
    var self = this instanceof LanguageName ? this : Object.create(LanguageName.prototype);
    // get some language data from language collection
    var langCode = _.find(buffer.languages, {'iso6392t': language});
    if (langCode) {
        self.isoCode = langCode.isoCode;
        self.iso6392b = langCode.iso6392b;
    }
    self.iso6392t = language;
    self.name = name;
    return self;
}

// convert old geo data to new geo data
var convertOld2NewGeo = function (docs) {

    var translations, languages, natives;

    docs.forEach(function (doc) {
        // get translations
        translations = [];
        for (var prop in doc.translations) {
            if (doc.translations.hasOwnProperty(prop)) {
                translations.push(new CountryName(prop,
                    doc.translations[prop].official,
                    doc.translations[prop].common));
            }
        }
        // get languages
        languages = [];
        for (var prop in doc.languages) {
            if (doc.languages.hasOwnProperty(prop)) {
                languages.push(new LanguageName(prop, doc.languages[prop]));
            }
        }
        // get natives
        natives = [];
        for (var prop in doc.name.native) {
            if (doc.name.native.hasOwnProperty(prop)) {
                natives.push(new CountryName(prop,
                    doc.name.native[prop].official,
                    doc.name.native[prop].common));
            }
        }
        // create new geo document and save it to new collection
        createNewGeoDoc(doc, translations, languages, natives);
    });
};

// create new geo document and save it to (new) collection
var createNewGeoDoc = function (doc, translations, languages, natives) {

    // create new geo document
    var geo = new Geo({
        cca2: doc.cca2,
        ccn3: doc.ccn3,
        cca3: doc.cca3,
        cioc: doc.cioc,
        names: {
            official: doc.name.official,
            common: doc.name.common,
            natives: _.cloneDeep(natives)
        },
        tld: _.cloneDeep(doc.tld),
        currencies: _.cloneDeep(doc.currency),
        callingCodes: _.cloneDeep(doc.callingCode),
        capital: doc.capital,
        altSpellings: _.cloneDeep(doc.altSpellings),
        region: doc.region,
        subregion: doc.subregion,
        translations: _.cloneDeep(translations),
        languages: _.cloneDeep(languages),
        coords: _.cloneDeep(doc.latlng),
        demonym: doc.demonym,
        landlocked: doc.landlocked,
        borders: _.cloneDeep(doc.borders),
        area: doc.area
    });
    // save new geo document
    geo.save(function (err) {
        if (err) {
            console.log(err);
            return err;
        }
    });
};

module.exports = router;
