const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'app')));
app.use('/app-assets', express.static(path.join(__dirname, 'app-assets')));

app.listen(PORT, () => {
  console.log(`\n🌌 Sistema Solar 3D corriendo en http://localhost:${PORT}\n`);
});
