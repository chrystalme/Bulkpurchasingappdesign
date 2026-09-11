// Ad-hoc UI verification: admin Platform Transactions page.
// Logs in through the real API from inside the page, then drives the real app.
import { Cdp, sleep, findBrowserWs } from './cdp.mjs';

const APP = 'http://localhost:5173';
const report = {};

const wsUrl = await findBrowserWs();
const cdp = await new Cdp(wsUrl).connect();
await cdp.newPage(APP);

// Wait for the SPA to mount.
for (let i = 0; i < 40; i++) {
  const ready = await cdp.eval('document.readyState');
  const hasRoot = await cdp.eval('Boolean(document.querySelector("#root, #app, body > div"))');
  if (ready === 'complete' && hasRoot) break;
  await sleep(250);
}
await sleep(1500);
report.initialTitle = await cdp.eval('document.title');
report.initialTextSample = (await cdp.eval('document.body.innerText')).slice(0, 300);

// Authenticate as admin via the real login endpoint, exactly like the app does.
report.login = await cdp.eval(`(async () => {
  const r = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@savetogether.com', password: 'password123' }),
  });
  const d = await r.json();
  const token = d.accessToken || d.token;
  if (token) localStorage.setItem('auth_token', token);
  if (d.refreshToken) localStorage.setItem('refresh_token', d.refreshToken);
  return { status: r.status, success: d.success, role: d.user && d.user.role, hasToken: Boolean(token) };
})()`);

// Point the persisted navigation state at the Platform Transactions screen.
await cdp.eval(`(() => {
  localStorage.setItem('persist:navigation', JSON.stringify({
    currentScreen: 'transaction-history',
    selectedGroupId: null,
    _persist: { version: -1, rehydrated: false },
  }));
  return true;
})()`);

await cdp.navigate(APP);
await sleep(4000);

report.screenText = await cdp.eval('document.body.innerText');
report.heading = await cdp.eval(`(() => {
  const h = document.querySelector('h1');
  return h ? h.innerText : null;
})()`);
report.tableRowCount = await cdp.eval(`document.querySelectorAll('table tbody tr').length`);
report.headers = await cdp.eval(`Array.from(document.querySelectorAll('table thead th')).map(th => th.innerText.trim())`);
report.rows = await cdp.eval(`Array.from(document.querySelectorAll('table tbody tr')).map(tr =>
  Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()))`);
report.hasNoTransactions = await cdp.eval(`document.body.innerText.includes('No transactions found')`);
report.platformBadge = await cdp.eval(`document.body.innerText.includes('Platform-wide view')`);
report.invalidDatesShown = await cdp.eval(`document.body.innerText.includes('Invalid Date')`);

await cdp.screenshot('/tmp/ui_admin_transactions.png');

// Open the View dialog on the first row.
report.viewClicked = await cdp.eval(`(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'View');
  if (!btn) return false;
  btn.click();
  return true;
})()`);
await sleep(1200);
report.dialogText = await cdp.eval(`(() => {
  const d = document.querySelector('[role="dialog"]');
  return d ? d.innerText : null;
})()`);
await cdp.screenshot('/tmp/ui_admin_transaction_detail.png');

console.log(JSON.stringify(report, null, 2));
cdp.close();
