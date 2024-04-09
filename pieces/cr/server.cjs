  
const express = require('express')
const app = express();
var path = require('path');

app.use("/", express.static(path.join(__dirname, "/")));
app.use("/src", express.static(path.join(__dirname, "/src")));

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname + '/'));
});

app.listen(8000, () => {
  console.log('Server on port 8000!')
});