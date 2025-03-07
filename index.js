const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Simple authentication middleware
const authenticate = (req, res, next) => {
  const { username, password } = req.query;

  // This is a very basic authentication - in production use proper auth
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    next();
  } else {
    res.status(401).send("Authentication required");
  }
};

// Routes
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Admin dashboard
app.get("/admin", authenticate, async (req, res) => {
  try {
    // Assuming your Request model is available here
    const Request = mongoose.model("Request");
    const requests = await Request.find().sort({ timestamp: -1 });

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bot Admin Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          h1 { color: #333; }
          .request { background: #f5f5f5; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
          .request h3 { margin-top: 0; }
          .timestamp { color: #888; font-size: 0.8em; }
          .actions { margin-top: 10px; }
          .actions button { margin-right: 5px; }
        </style>
      </head>
      <body>
        <h1>Bot Admin Dashboard</h1>
        <h2>Recent Requests</h2>
    `;

    requests.forEach((req) => {
      html += `
        <div class="request">
          <h3>From: ${req.first_name} ${req.last_name} (@${req.username})</h3>
          <div class="timestamp">Received: ${new Date(
            req.timestamp
          ).toLocaleString()}</div>
          <p>${req.request || "No text request"}</p>
          ${
            req.file_url
              ? `<p><a href="${req.file_url}" target="_blank">View Attached File</a></p>`
              : ""
          }
          <div class="actions">
            <button onclick="markAsHandled('${
              req._id
            }')">Mark as Handled</button>
            <button onclick="contactUser('${
              req.chat_id
            }')">Contact User</button>
          </div>
        </div>
      `;
    });

    html += `
        <script>
          function markAsHandled(id) {
            // Add functionality to mark as handled
            alert('Request ' + id + ' marked as handled');
          }
          
          function contactUser(chatId) {
            // Popup to send a message to the user
            const message = prompt('Enter message to send to user:');
            if (message) {
              fetch('/admin/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, message })
              })
              .then(response => response.json())
              .then(data => alert(data.message));
            }
          }
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send("Error loading dashboard: " + err.message);
  }
});

// API endpoint to contact a user
app.post("/admin/contact", authenticate, (req, res) => {
  const { chatId, message } = req.body;
  if (!chatId || !message) {
    return res
      .status(400)
      .json({ message: "Chat ID and message are required" });
  }

  // You'll need to import your bot instance here or use a different way to communicate
  // For now, just return a success message
  res.json({ message: "Message sent successfully!" });
});

// Start the server
app.listen(port, () => {
  console.log(`Admin dashboard running on port ${port}`);
});

module.exports = app; // Export for bot.js to use
