const express = require('express');
const app = express();
const usersRoute = require('./routes/users');
const adminRoute = require('./routes/admin');
const testsRoute = require('./routes/tests');
require('dotenv').config();

app.use(express.json());
app.use('/api/users', usersRoute);
app.use('/api/admin', adminRoute);
app.use('/api/tests', testsRoute);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
