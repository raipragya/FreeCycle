// index.js - FreeCycle backend entry point

const App = require('./App');
const app = new App(process.env.PORT || 3004);

app.start();
