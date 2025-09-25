const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));

// For any request that doesn't match one above, send back the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open your browser and navigate to http://localhost:${PORT}`);
});