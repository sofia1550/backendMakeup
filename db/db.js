require('dotenv').config();
const mysql = require('mysql');
const util = require('util');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
};

let pool;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 100;
const RECONNECT_DELAY = 5000;

function initializePool() {
  if (connectionAttempts >= MAX_ATTEMPTS) {
    console.error('Se ha superado el número máximo de intentos de reconexión. No se realizarán más intentos.');
    return;
  }

  pool = mysql.createPool(dbConfig);

  pool.on('connection', function (connection) {
    console.log('Conexión a la base de datos establecida con el ID:', connection.threadId);
    connectionAttempts = 0; // Resetea los intentos cuando se establece una conexión exitosa
  });

  pool.on('enqueue', function () {
    console.log('Esperando conexión disponible en el pool');
  });

  pool.on('release', function (connection) {
    console.log('Conexión %d liberada del pool', connection.threadId);
  });

  pool.query = util.promisify(pool.query);

  pool.on('error', function (err) {
    console.error('Error en la conexión:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.error('Intentando reconectar a la base de datos...');
      connectionAttempts++;
      setTimeout(initializePool, RECONNECT_DELAY); // Reintenta la conexión después de un retraso
    } else {
      console.error('Error no relacionado con la reconexión. No se intentará reconectar.');
    }
  });
}

initializePool();

module.exports = pool;
