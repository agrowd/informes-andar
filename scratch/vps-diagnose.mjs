import { Client } from 'ssh2';

const conn = new Client();

const COMMANDS = [
  'echo "=== ACTIVE LISTENING PORTS ==="',
  'ss -tlnp 2>&1',
  'echo "=== CURL TEST ON PORT 8000 ==="',
  'curl -I http://localhost:8000 2>&1 || echo "CURL FAILED"',
  'echo "=== DONE ==="'
].join(' ; ');

conn.on('ready', () => {
  console.log('✅ SSH Connected');
  conn.exec(COMMANDS, (err, stream) => {
    if (err) { console.error('Exec error:', err); conn.end(); return; }
    let output = '';
    stream.on('close', () => { console.log(output); conn.end(); });
    stream.on('data', (data) => { output += data.toString(); });
    stream.stderr.on('data', (data) => { output += data.toString(); });
  });
});

conn.on('error', (err) => {
  console.error('❌ SSH error:', err.message);
  process.exit(1);
});

conn.connect({
  host: '149.50.128.73',
  port: 5782,
  username: 'root',
  password: 'FedeServer.8888',
  readyTimeout: 10000
});
