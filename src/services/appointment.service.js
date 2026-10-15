const pool = require('../config/database');
const repo = require('../repositories/base.repository');
const v = require('../utils/validate');
const { ApiError } = require('../utils/errors');
const statuses = ['scheduled', 'completed', 'cancelled'];
async function list(patientId, date) {
  const clauses = [], args = [];
  if (patientId !== undefined) { clauses.push('patient_id = ?'); args.push(v.id(patientId)); }
  if (date !== undefined) { assertDate(date); clauses.push('DATE(starts_at) = ?'); args.push(date); }
  const [rows] = await pool.query(`SELECT * FROM appointments ${clauses.length ? 'WHERE '+clauses.join(' AND ') : ''} ORDER BY starts_at DESC`, args);
  return rows;
}
function assertDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new ApiError(400, 'Fecha inválida: use YYYY-MM-DD');
}
async function availability(doctorId, date) {
  const id = v.id(doctorId); assertDate(date);
  const [[doctor]] = await pool.query('SELECT id FROM doctors WHERE id=? AND active=1', [id]);
  if (!doctor) throw new ApiError(404, 'Médico no disponible');
  const [schedules] = await pool.query('SELECT start_time, end_time FROM doctor_schedules WHERE doctor_id=? AND weekday=MOD(WEEKDAY(?) + 1,7) ORDER BY start_time',[id,date]);
  const [occupied] = await pool.query(`SELECT starts_at, duration_minutes FROM appointments WHERE doctor_id=? AND status <> 'cancelled' AND DATE(starts_at)=?`, [id,date]);
  const slots = [];
  for (const schedule of schedules) {
    const toMin = t => Number(String(t).slice(0,2))*60 + Number(String(t).slice(3,5));
    for(let minute=toMin(schedule.start_time);minute+30<=toMin(schedule.end_time);minute+=30) {
      const timestamp = `${date} ${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}:00`;
      const localDate = new Date(`${date}T${timestamp.slice(11)}-05:00`);
      if (localDate.getTime()<=Date.now()) continue;
      const conflict = occupied.some(a => {
        const start = new Date(a.starts_at);
        const st = start.getUTCHours()*60+start.getUTCMinutes()-300;
        const normalized = ((st%1440)+1440)%1440;
        return minute < normalized + a.duration_minutes && minute+30 > normalized;
      });
      if (!conflict) slots.push({ starts_at: timestamp.replace(' ','T'), duration_minutes:30 });
    }
  }
  return {doctor_id:id,date,slots};
}
async function get(id) { const item = await repo.one('appointments', v.id(id)); if (!item) throw new ApiError(404, 'Cita no encontrada'); return item; }
async function create(body) {
  const patientId = v.id(body.patient_id), doctorId = v.id(body.doctor_id), startsAt = v.dateTime(body.starts_at);
  if (new Date(`${startsAt.replace(' ', 'T')}-05:00`).getTime() <= Date.now()) throw new ApiError(400, 'No se permiten citas en fechas pasadas');
  const durationMinutes = v.integer(body.duration_minutes ?? 30, 'duration_minutes');
  if (durationMinutes > 240) throw new ApiError(400, 'Duración máxima: 240 minutos');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[patient]] = await connection.query('SELECT id FROM patients WHERE id = ?', [patientId]);
    const [[doctor]] = await connection.query('SELECT consultation_price, active FROM doctors WHERE id = ? FOR UPDATE', [doctorId]);
    if (!patient || !doctor || !doctor.active) throw new ApiError(400, 'Paciente o médico no disponible');
    const [conflicts] = await connection.query(`SELECT id FROM appointments WHERE doctor_id = ? AND status <> 'cancelled' AND starts_at < DATE_ADD(?, INTERVAL ? MINUTE) AND DATE_ADD(starts_at, INTERVAL duration_minutes MINUTE) > ? LIMIT 1`, [doctorId, startsAt, durationMinutes, startsAt]);
    if (conflicts.length) throw new ApiError(409, 'El médico ya tiene una cita en ese horario');
    const [[withinSchedule]] = await connection.query(`SELECT id FROM doctor_schedules WHERE doctor_id = ? AND weekday = MOD(WEEKDAY(?) + 1, 7) AND TIME(?) >= start_time AND TIME(DATE_ADD(?, INTERVAL ? MINUTE)) <= end_time AND DATE(DATE_ADD(?, INTERVAL ? MINUTE)) = DATE(?) LIMIT 1`, [doctorId, startsAt, startsAt, startsAt, durationMinutes, startsAt, durationMinutes, startsAt]);
    if (!withinSchedule) throw new ApiError(409, 'La cita está fuera del horario de atención del médico');

    const [result] = await connection.query('INSERT INTO appointments (patient_id, doctor_id, starts_at, duration_minutes, price_at_booking, status) VALUES (?, ?, ?, ?, ?, ?)', [patientId, doctorId, startsAt, durationMinutes, doctor.consultation_price, 'scheduled']);
    await connection.commit();
    return get(result.insertId);
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function edit(id, body) {
  const current = await get(id);
  const status = v.choice(body?.status, 'status', statuses);
  if (current.status === 'completed' && status !== 'completed') throw new ApiError(409, 'Una cita atendida no puede reabrirse');
  await repo.update('appointments', Number(id), { status });
  return get(id);
}
async function erase(id) { await get(id); await repo.remove('appointments', Number(id)); }
module.exports = { list, get, create, edit, erase, availability };
