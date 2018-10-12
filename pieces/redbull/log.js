const request = require('request');
const timers = require('timers');

var data = [];
setInterval(() => {
    request('https://api.quarqrace.com/api/v1/races/870/summary?format=json', function (error, response, body) {
        if(error) return console.log(error);
        console.log(body + ',');
    });
}, 1000);






