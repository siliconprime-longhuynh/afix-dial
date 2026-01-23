let device;

// 1. Startup & Login function
async function startup() {
  const identity = document.getElementById('identity').value;

  if (!identity) {
    log("Please enter an identity (e.g. phone number)!", true);
    return;
  }

  log(`Fetching token for ${identity}...`);
  
  let token;
  try {
    const response = await fetch('/.netlify/functions/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identity }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`);
    }
    
    const data = await response.json();
    // The API returns { token: "..." } or similar
    token = data.token || data.accessToken || (typeof data === 'string' ? data : null);
    
    if (!token && typeof data === 'object') {
      // Fallback if the token is nested or the whole object is the token
      token = data.token || data.accessToken;
    }

    if (!token) {
      throw new Error("Token not found in response");
    }
    
    log("Token fetched successfully! Initializing device...");
  } catch (err) {
    log("Error fetching token: " + err.message, true);
    return;
  }

  try {
    // --- INITIALIZE SDK V2 ---
    device = new Twilio.Device(token.trim(), {
      codecPreferences: ['opus', 'pcmu'],
      warnings: false
    });

    // Listen for successful registration
    device.on('registered', () => {
      log(`${identity} logged in successfully! Ready to receive calls.`);
    });

    // Listen for errors
    device.on('error', (error) => {
      log(`Twilio Error: ${error.message}`, true);
      console.error(error);
    });

    // Listen for connected calls
    device.on('connect', (conn) => {
      log("In a call...");
    });

    // Listen for disconnected calls
    device.on('disconnect', (conn) => {
      log("Call ended");
    });

    // Listen for INCOMING calls
    device.on('incoming', (connection) => {
      log(`Incoming call from ${connection.parameters.From}!`);
      if (confirm(`Accept call from ${connection.parameters.From}?`)) {
        connection.accept();
      } else {
        connection.reject();
      }
    });

    // Register device with Twilio
    await device.register();

  } catch (err) {
    log("System error: " + err.message, true);
  }
}

// 2. Make call function
async function makeCall() {
  if (!device) {
    log("You are not logged in!", true);
    return;
  }

  const receiver = document.getElementById('phoneNumber').value;
  if (!receiver) {
    log("Please enter a phone number!", true);
    return;
  }

  const params = { To: receiver };
  log(`Calling ${receiver}...`);

  // Connect call in SDK v2
  await device.connect({ params: params });
}

// 3. Hang up function
function hangup() {
  if (device) {
    device.disconnectAll();
  }
}

function log(msg, isError = false) {
  const el = document.getElementById('status');
  el.innerText = "Status: " + msg;
  el.className = isError ? "status error" : "status";
  console.log(msg);
}

// --- SMS LOGIC ---
let lastMessageCount = 0;

function startSmsPolling() {
  setInterval(fetchMessages, 5000);
  fetchMessages();
}

async function fetchMessages() {
  try {
    const res = await fetch('/get_messages');
    const messages = await res.json();

    if (messages.length > lastMessageCount) {
      renderMessages(messages);
      lastMessageCount = messages.length;
    }
  } catch (e) {
    console.error("Error fetching messages:", e);
  }
}

function renderMessages(messages) {
  const container = document.getElementById('sms-list');

  if (messages.length === 0) {
    container.innerHTML = '<div style="color: #888; font-style: italic;">No messages yet...</div>';
    return;
  }

  let html = '';
  [...messages].reverse().forEach(msg => {
    const isOutbound = msg.direction === 'outbound';
    const cssClass = isOutbound ? 'sms-outbound' : 'sms-inbound';
    const senderLabel = isOutbound ? `Sent to: ${msg.to}` : `From: ${msg.from}`;

    html += `
                  <div class="sms-item ${cssClass}">
                      <div class="sms-sender">${senderLabel}</div>
                      <div class="sms-body">${msg.body}</div>
                  </div>
              `;
  });
  container.innerHTML = html;
}
