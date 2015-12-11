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

  function onError(err) {
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

  parser.on("readable", function () {
    var record;
    while (record = parser.read()) {
      if (collName === "countries") {
        loadCountry(record);
      } else if (collName === "languages") {
        loadLanguage(record);
      } else if (collName === "currencies") {
        loadCurrency(record);
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

// convert old geo data to new geo data
function convertOld2NewGeo(docs) {

  var translations, languages, natives;

  _.forEach(docs, function (doc) {
    // get translations
    translations = [];
    _.forOwn(doc.translations, function (value, key) {
      translations.push(new CountryName(key,
        doc.translations[key].official,
        doc.translations[key].common));
    });
    // get languages
    languages = [];
    _.forOwn(doc.languages, function (value, key) {
      languages.push(new LanguageName(key, doc.languages[key]));
    });
    // get natives
    natives = [];
    _.forOwn(doc.name.native, function (value, key) {
      natives.push(new CountryName(key,
        doc.name.native[key].official,
        doc.name.native[key].common));
    });
    // create new geo document and save it to new collection
    createNewGeoDoc(doc, translations, languages, natives);
  });
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

// create new geo document and save it to (new) collection
function createNewGeoDoc(doc, translations, languages, natives) {

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

// load country
function loadCountry(record) {

  // create country object
  var country = new Country({
    isoCode: record.isoCode,
    names: [
      {language: "de", name: record.name_de},
      {language: "en", name: record.name_en},
      {language: "fr", name: record.name_fr},
      {language: "es", name: record.name_es}
    ]
  });

  // check if country already exists
  Country.findOne({isoCode: country.isoCode})
    .exec()
    .then(function (doc) {
      if (doc) {
        // update country - only the differences should be updated - need an object compare
        doc.names = country.names;
        doc.save();
      } else {
        // create country
        country.save(function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
    }, function (err) {
      res.status(500).send(err);
    });
}

// load currency
function loadCurrency(record) {

  var decimals,
    hexas,
    symbol;

  // prepare unicode stuff
  decimals = record.symbolUnicodeDecimals.split(",");
  hexas = record.symbolUnicodeHex.split(",");
  symbol = record.symbol;
  if (decimals.length > 0 && (!symbol || symbol.indexOf("?") !== -1 || symbol === " ")) {
    symbol = String.fromCharCode.apply(symbol, decimals);
  }

  // create currency
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

  // check if currency already exists
  Currency.findOne({isoCode: currency.isoCode})
    .exec()
    .then(function (doc) {
      if (doc) {
        // update currency - only the differences should be updated - need an object compare
        doc.isoNumber = currency.isoNumber;
        doc.minorUnit = currency.minorUnit;
        doc.symbol = currency.symbol;
        doc.symbolUnicodeDecimals = currency.symbolUnicodeDecimals;
        doc.symbolUnicodeHex = currency.symbolUnicodeHex;
        doc.names = currency.names;
        doc.save();
      } else {
        // create currency
        currency.save(function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
    }, function (err) {
      res.status(500).send(err);
    });
}

// load language
function loadLanguage(record) {

  // create language
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

  // check if language already exists
  Language.findOne({isoCode: language.isoCode})
    .exec()
    .then(function (doc) {
      if (doc) {
        // update language - only the differences should be updated - need an object compare
        doc.iso6392b = language.iso6392b;
        doc.iso6392t = language.iso6392t;
        doc.names = language.names;
        doc.save();
      } else {
        // create language
        language.save(function (err) {
          if (err) {
            console.log(err);
          }
        });
      }
    }, function (err) {
      res.status(500).send(err);
    });
}

module.exports = router;
