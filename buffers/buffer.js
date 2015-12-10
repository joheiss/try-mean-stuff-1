var buffer = {};

buffer.countries = undefined;

buffer.initialize = function() {
    // get all countries
    var Country = require('../models/countryModel');
    Country.find()
        .exec()
        .then(function(countries) {
            buffer.countries = countries;
        }, function(err) {
            console.log(err);
        });

    // get all currencies
    var Currency = require('../models/currencyModel');
    Currency.find()
        .exec()
        .then(function(currencies) {
            buffer.currencies = currencies;
        }, function(err) {
            console.log(err);
        });

    // get all countries
    var Language = require('../models/languageModel');
    Language.find()
        .exec()
        .then(function(languages) {
            buffer.languages = languages;
        }, function(err) {
            console.log(err);
        });
};

module.exports = buffer;