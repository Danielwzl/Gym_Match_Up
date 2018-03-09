var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var Foods = new mongoose.Schema({
    food_pro_cal: []
});

module.exports = mongoose.model('Foods', Foods);
