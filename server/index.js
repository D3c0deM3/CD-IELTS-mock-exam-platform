const express = require('express');
const app = express();
const usersRoute = require('./routes/users');
require('dotenv').config();

app.use(express.json());
app.use('/api/users', usersRoute);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
