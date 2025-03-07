require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const express = require("express");
const multer = require("multer");

// Initialize MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Define MongoDB Schema
const RequestSchema = new mongoose.Schema({
  userId: String,
  username: String,
  first_name: String,
  last_name: String,
  chat_id: String,
  request: String,
  file_url: String,
  timestamp: { type: Date, default: Date.now },
});

const Request = mongoose.model("Request", RequestSchema);

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Express server to keep bot alive
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(3000, () => console.log("🌐 Web server running..."));

// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Store user request progress
const userSteps = {};

// Pricing calculator
const pricing = {
  basic_bot: 50,
  api_integration: 30,
  automation: 40,
  custom_ui: 25,
  database_support: 35,
  web_dashboard: 45,
  payment_integration: 40,
  analytics: 30,
  hosting: 20,
  maintenance: 15,
};

// Quote builder questions sequence
const quoteBuilderQuestions = [
  {
    question: "What type of bot do you need?",
    options: [
      { text: "Basic Telegram Bot", value: "basic_bot" },
      { text: "Advanced Bot with Custom UI", value: "basic_bot,custom_ui" },
      {
        text: "E-commerce Bot",
        value: "basic_bot,custom_ui,payment_integration",
      },
    ],
  },
  {
    question: "Do you need API integrations?",
    options: [
      { text: "Yes", value: "api_integration" },
      { text: "No", value: "" },
    ],
  },
  {
    question: "Do you need database support?",
    options: [
      { text: "Yes", value: "database_support" },
      { text: "No", value: "" },
    ],
  },
  {
    question: "Do you need a web dashboard?",
    options: [
      { text: "Yes", value: "web_dashboard" },
      { text: "No", value: "" },
    ],
  },
  {
    question: "Do you need ongoing maintenance?",
    options: [
      { text: "Yes", value: "maintenance" },
      { text: "No", value: "" },
    ],
  },
];

// Inline keyboard options
const serviceOptions = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🤖 Custom Bots", callback_data: "custom_bots" },
        { text: "🔄 Automation", callback_data: "automation" },
      ],
      [
        { text: "📊 API Integration", callback_data: "api_integration" },
        { text: "📝 Request a Bot", callback_data: "request_bot" },
      ],
      [
        { text: "💰 Get Pricing", callback_data: "pricing" },
        { text: "🧮 Interactive Quote", callback_data: "quote_builder" },
      ],
      [{ text: "💬 Contact Us", callback_data: "contact" }],
    ],
  },
};

// Helper function to send quote builder questions
function sendQuoteBuilderQuestion(chatId, userId) {
  const questionData = quoteBuilderQuestions[userSteps[userId].currentQuestion];

  const options = questionData.options.map((option) => {
    return [
      {
        text: option.text,
        callback_data: `quote_${option.value}`,
      },
    ];
  });

  bot.sendMessage(
    chatId,
    `*Question ${userSteps[userId].currentQuestion + 1}/${
      quoteBuilderQuestions.length
    }*\n\n${questionData.question}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: options,
      },
    }
  );
}

// Handle messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // Handle pricing selection
  if (userSteps[userId] && userSteps[userId].step === "pricing_selection") {
    let selectedFeatures = text.split(",").map((f) => f.trim());
    let totalPrice = selectedFeatures.reduce(
      (sum, feature) => sum + (pricing[feature] || 0),
      0
    );

    bot.sendMessage(chatId, `💰 Estimated Price: *$${totalPrice}*`, {
      parse_mode: "Markdown",
    });
    delete userSteps[userId];
    return;
  }

  // Handle request form input
  if (userSteps[userId] === "waiting_for_request") {
    const requestData = new Request({
      userId,
      username: msg.from.username || "No Username",
      first_name: msg.from.first_name || "",
      last_name: msg.from.last_name || "",
      chat_id: chatId,
      request: text,
    });

    await requestData.save();

    // Send Email Notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: "New Bot Request Received",
      text: `New bot request from ${msg.from.first_name} (@${msg.from.username}):\n\n${text}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log("Email error:", err);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    bot.sendMessage(
      chatId,
      "✅ Your request has been submitted! You can also upload files related to your project."
    );
    delete userSteps[userId];
    return;
  }

  if (text.toLowerCase() === "/start") {
    bot.sendMessage(
      chatId,
      "🚀 *Welcome to the Bot Development Service!*\n\n" +
        "What kind of bot are you looking for? Select an option below:",
      { parse_mode: "Markdown", ...serviceOptions }
    );
  } else {
    bot.sendMessage(chatId, "I didn't understand that. Use /start to begin.");
  }
});

// Handle button clicks
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data === "custom_bots") {
    bot.sendMessage(
      chatId,
      "✅ *Custom Bots:* We build tailored Telegram bots.",
      { parse_mode: "Markdown" }
    );
  } else if (data === "automation") {
    bot.sendMessage(
      chatId,
      "✅ *Automation Bots:* We automate your workflows.",
      { parse_mode: "Markdown" }
    );
  } else if (data === "api_integration") {
    bot.sendMessage(chatId, "✅ *API Integration:* Connect your bot to APIs.", {
      parse_mode: "Markdown",
    });
  } else if (data === "contact") {
    bot.sendMessage(
      chatId,
      "📩 *Contact us:* @yourusername or email@example.com",
      { parse_mode: "Markdown" }
    );
  } else if (data === "request_bot") {
    bot.sendMessage(chatId, "📝 *Please describe your bot requirements.*", {
      parse_mode: "Markdown",
    });
    userSteps[userId] = "waiting_for_request"; // Set user step to request mode
  } else if (data === "pricing") {
    bot.sendMessage(
      chatId,
      "💰 *Pricing Calculator*\n" +
        "Choose features for your bot (comma-separated):\n" +
        "- `basic_bot` ($50)\n" +
        "- `api_integration` ($30)\n" +
        "- `automation` ($40)\n" +
        "- `custom_ui` ($25)\n" +
        "- `database_support` ($35)\n" +
        "- `web_dashboard` ($45)\n" +
        "- `payment_integration` ($40)\n" +
        "- `analytics` ($30)\n" +
        "- `hosting` ($20)\n" +
        "- `maintenance` ($15/month)",
      { parse_mode: "Markdown" }
    );
    userSteps[userId] = { step: "pricing_selection" };
  } else if (data === "quote_builder") {
    // Start the quote builder flow
    userSteps[userId] = {
      step: "quote_builder",
      currentQuestion: 0,
      selectedFeatures: [],
    };

    // Send first question
    sendQuoteBuilderQuestion(chatId, userId);
  } else if (data.startsWith("quote_")) {
    // Handle quote builder selection
    if (!userSteps[userId] || userSteps[userId].step !== "quote_builder") {
      bot.sendMessage(
        chatId,
        "Sorry, something went wrong. Please start again with /start"
      );
      return;
    }

    // Parse the selected option
    const selectedValue = data.replace("quote_", "");

    // Add selection to user's features if it's not empty
    if (selectedValue) {
      const features = selectedValue.split(",");
      features.forEach((feature) => {
        if (
          !userSteps[userId].selectedFeatures.includes(feature) &&
          feature !== ""
        ) {
          userSteps[userId].selectedFeatures.push(feature);
        }
      });
    }

    // Move to next question
    userSteps[userId].currentQuestion++;

    // If we have more questions, send the next one
    if (userSteps[userId].currentQuestion < quoteBuilderQuestions.length) {
      sendQuoteBuilderQuestion(chatId, userId);
    } else {
      // No more questions, calculate price
      const totalPrice = userSteps[userId].selectedFeatures.reduce(
        (sum, feature) => sum + (pricing[feature] || 0),
        0
      );

      let featuresList = "";
      userSteps[userId].selectedFeatures.forEach((feature) => {
        const price = pricing[feature] || 0;
        const formattedFeature = feature
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        featuresList += `- ${formattedFeature}: $${price}\n`;
      });

      // Send the final quote
      bot.sendMessage(
        chatId,
        `💰 *Your Custom Quote*\n\n` +
          `Selected Features:\n${featuresList}\n` +
          `*Total Price: $${totalPrice}*\n\n` +
          `Would you like to proceed with this quote?`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Request This Bot", callback_data: "request_bot" },
                { text: "🔄 Start Over", callback_data: "quote_builder" },
              ],
              [{ text: "🏠 Back to Main Menu", callback_data: "main_menu" }],
            ],
          },
        }
      );

      // Reset user steps
      delete userSteps[userId];
    }
  } else if (data === "main_menu") {
    bot.sendMessage(
      chatId,
      "🚀 *Welcome to the Bot Development Service!*\n\n" +
        "What kind of bot are you looking for? Select an option below:",
      { parse_mode: "Markdown", ...serviceOptions }
    );
  }
});

// Handle file uploads
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.document.file_id;

  const fileLink = await bot.getFileLink(fileId);

  const requestData = new Request({
    userId: msg.from.id,
    username: msg.from.username || "No Username",
    first_name: msg.from.first_name || "",
    last_name: msg.from.last_name || "",
    chat_id: chatId,
    file_url: fileLink,
  });

  await requestData.save();

  bot.sendMessage(chatId, "📎 File received! We will review it.");
});
