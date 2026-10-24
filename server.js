require('./src/server/config');
const app = require('./src/server/app');
const { initializeDatabase } = require('./src/server/database');
const { initTokenizer } = require('./src/server/translate');

initializeDatabase();

initTokenizer(error => {
  if (error) {
    console.error('Kuromoji init failed:', error);
    process.exit(1);
  }

  console.log('Kuromoji tokenizer initialized.');

  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
});