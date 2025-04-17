const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('Current directory:', process.cwd());
console.log('ENV file path:', path.resolve(__dirname, '.env'));
console.log('All env variables:', Object.keys(process.env));
console.log('URI value:', process.env.URI);
console.log('PORT value:', process.env.PORT); 