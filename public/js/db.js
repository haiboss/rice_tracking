const mysql = require("mysql2");

const db = mysql.createPool({
  host: "10.56.20.83",
  user: "root",
  password: "KietNT@Vnpt",
  database: "NONGSAN",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = db;
