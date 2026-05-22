require('dotenv').config();
const app  = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n================================================');
  console.log(`  🚀  EKBMS API Server running`);
  console.log(`  📡  Port      : ${PORT}`);
  console.log(`  🌍  Env       : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  🔗  Health    : http://localhost:${PORT}/api/health`);
  console.log('================================================\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  server.close(async () => {
    await pool.end();
    console.log('Server and DB connections closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  server.close(() => process.exit(1));
});
