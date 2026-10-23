const pool = require('../config/database');

async function runInTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const outcome = await work(connection);
    await connection.commit();
    return outcome;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { runInTransaction };
