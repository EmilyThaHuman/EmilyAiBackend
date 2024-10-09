const mongoose = require('mongoose');
const { getEnv } = require('../src/utils/api');

const uri = getEnv();

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connection successful');
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Connection error:', err);
  });
