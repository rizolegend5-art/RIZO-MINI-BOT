// Minimal Firebase Realtime Database client — plain REST calls (no SDK/network tools needed here).
// Works with the config the user already has (apiKey + databaseURL). No firebase-admin, no service account.
const axios = require('axios');

const DB_URL = (process.env.FIREBASE_DB_URL || 'https://dj-box-movie-default-rtdb.firebaseio.com').replace(/\/+$/, '');
const AUTH = process.env.FIREBASE_DB_SECRET || '';             // optional legacy secret for full admin access

const url = (p) => `${DB_URL}/${String(p).replace(/^\/+/, '')}.json${AUTH ? `?auth=${encodeURIComponent(AUTH)}` : ''}`;

async function get(p) { try { const r = await axios.get(url(p), { timeout: 8000 }); return r.data; } catch (e) { return null; } }
async function set(p, v) { try { await axios.put(url(p), v, { timeout: 8000 }); return true; } catch (e) { return false; } }
async function update(p, v) { try { await axios.patch(url(p), v, { timeout: 8000 }); return true; } catch (e) { return false; } }
async function push(p, v) { try { const r = await axios.post(url(p), v, { timeout: 8000 }); return r.data && r.data.name; } catch (e) { return null; } }
async function remove(p) { try { await axios.delete(url(p), { timeout: 8000 }); return true; } catch (e) { return false; } }

module.exports = { get, set, update, push, remove, DB_URL };
