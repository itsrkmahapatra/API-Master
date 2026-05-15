const app = require('./app');
const express = require('express');
const port = 3000;

app.use(express.static(__dirname));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
