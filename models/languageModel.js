var mongoose = require('mongoose');

var LanguageNames = new mongoose.Schema({
    language: { type: String, required: true },
    name:     { type: String, required: false }
});

var Language = new mongoose.Schema({
    isoCode: { type: String, required: true, unique: true },
    iso6392b: { type: String, required: false },
    iso6392t: { type: String, required: false },
    names: [LanguageNames]
});

module.exports = mongoose.model('Language', Language);