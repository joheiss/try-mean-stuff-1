var mongoose = require('mongoose');

var LanguageNames = new mongoose.Schema({
    language: { type: String, required: true },
    name:     { type: String, required: true }
});

var Language = new mongoose.Schema({
    isoCode: { type: String, required: true, unique: true },
    iso6392b: { type: String, required: false },
    iso6392t: { type: String, required: false },
    names: [LanguageNames]
});

Language.virtual('id').get(function() { return this._id; });

Language.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Language', Language);