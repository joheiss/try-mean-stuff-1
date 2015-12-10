var mongoose = require('mongoose');

var CurrencyNames = new mongoose.Schema({
    language:  { type: String, required: true },
    shortName: { type: String, required: false },
    name:      { type: String, required: false }
});

var Currency = new mongoose.Schema({
    isoCode:    { type: String, required: true, unique: true },
    isoNumber : { type: String, required: true, unique: true },
    names:      [CurrencyNames],
    minorUnit:  { type: Number, required: true },
    symbol:     { type: String, required: false },
    symbolUnicodeDecimals: [Number],
    symbolUnicodeHex: [String]
});

module.exports = mongoose.model('Currency', Currency);