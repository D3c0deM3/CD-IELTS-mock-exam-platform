const mysql = require("mysql2/promise");

// Ensure dotenv is loaded before accessing env variables
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const parseDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl) return {};

  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
};

const databaseUrlConfig = parseDatabaseUrl(
  process.env.JAWSDB_URL ||
    process.env.CLEARDB_DATABASE_URL ||
    process.env.MYSQL_URL
);

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || databaseUrlConfig.host || "127.0.0.1",
  port: process.env.MYSQL_PORT
    ? Number(process.env.MYSQL_PORT)
    : databaseUrlConfig.port || 3306,
  user: process.env.MYSQL_USER || databaseUrlConfig.user || "root",
  password: process.env.MYSQL_PASSWORD || databaseUrlConfig.password || "",
  database: process.env.MYSQL_DATABASE || databaseUrlConfig.database || "cd_mock",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
