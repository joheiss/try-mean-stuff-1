var mongoose = require('mongoose');

var CountryNames = new mongoose.Schema({
    language: { type: String, required: true },
    name:     { type: String, required: true }
});

var Country = new mongoose.Schema({
    isoCode: { type: String, required: true, unique: true },
    names: [CountryNames]
});

Country.virtual('id').get(function() { return this._id; });

Country.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Country', Country);