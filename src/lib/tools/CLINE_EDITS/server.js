// server.js
const express = require('express');
const searchRoutes = require('./searchRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', searchRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
