var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var Gyms = new mongoose.Schema({
    gym_info: {},
    type_workout: []
});

module.exports = mongoose.model('Gyms', Gyms);
