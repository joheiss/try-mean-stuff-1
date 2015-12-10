var mongoose = require('mongoose');

var GeoName = new mongoose.Schema({
    common: { type: String, required: false },
    official: { type: String, required: false },
});

var GeoNative = new mongoose.Schema({
    language: { type: String, required: true },
    names: [GeoName]
});

var GeoCountryName = new mongoose.Schema({
    common: { type: String, required: true },
    official: { type: String, required: false },
    nativeNames: [GeoNative]
});

var GeoLanguage = new mongoose.Schema({
    isoCode:  { type: String, required: true },
    iso6392t: { type: String, required: true },
    iso6392b: { type: String, required: true },
    name:     { type: String, required: true },
});

var GeoCountryNameTranslation = new mongoose.Schema({
    language: { type: String, required: true },
    names:    {
        common:   { type: String, required: true },
        official: { type: String, required: true },
    }
});

var Geo = new mongoose.Schema({
    cca2: { type: String, required: true, unique: true },
    cca3: { type: String, required: true, unique: true },
    ccn3: { type: String, required: false },
    cioc: { type: String, required: false },
    names: {
        official: { type: String, required: true },
        common:   { type: String, required: true },
        natives:  [
            {
                language: { type: String, required: false },
                names: {
                    common: {type: String, required: false},
                    official: {type: String, required: false}
                }
            }
        ]
    },
    tld: [String],
    currencies: [String],
    callingCodes: [String],
    capital: { type: String, required: false },
    altSpellings: [String],
    region: { type: String, required: false },
    subregion: { type: String, required: false },
    languages: [
        {
            isoCode:  { type: String, required: false },
            iso6392t: { type: String, required: false },
            iso6392b: { type: String, required: false },
            name:     { type: String, required: false }
        }
    ],
    translations: [
        {
            language: { type: String, required: true },
            names: {
                common: {type: String, required: true},
                official: {type: String, required: true}
            }
        }
    ],
    coords: [Number],
    demonym: { type: String, required: false },
    landlocked: { type: Boolean, required: false },
    borders: [String],
    area: { type: Number, required: false }
});

module.exports = mongoose.model('Geo', Geo);