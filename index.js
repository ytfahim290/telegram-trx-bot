const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

// Your Telegram bot token & NowNodes API key will come from env variables
const TOKEN = process.env.BOT_TOKEN;
const NOWNODES_API_KEY = process.env.NOWNODES_API_KEY;

// Express server to keep bot alive
const app = express();
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TOKEN, { polling: true });

// Simple in-memory user DB (replace with real DB in future)
const users = {};

// Helper function to get user balance or default 0
function getBalance(userId) {
  if (!users[userId]) users[userId] = { balance: 0, volume: 0, locked: 0, refBy: null, joinTime: Date.now() };
  return users[userId].balance;
}

// Start command with joining bonus & referral
bot.onText(/\/start(?: (.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const ref = match[1]; // optional referral code (user id)

  if (!users[chatId]) {
    users[chatId] = { balance: 1, volume: 0, locked: 0, refBy: null, joinTime: Date.now() };
    if (ref && users[ref] && ref != chatId) {
      users[ref].balance += 0.05; // referral bonus
      users[chatId].refBy = ref;
    }
    bot.sendMessage(chatId, "🎉 Welcome! You got 1 TRX as a joining bonus.");
  } else {
    bot.sendMessage(chatId, "You are already registered.");
  }
});

// Check balance
bot.onText(/\/balance/, (msg) => {
  const chatId = msg.chat.id;
  const bal = getBalance(chatId);
  bot.sendMessage(chatId, `💰 Your balance: ${bal.toFixed(4)} TRX`);
});

// Bet big or small command
bot.onText(/\/bet (big|small) (\d+(\.\d+)?)/, (msg, match) => {
  const chatId = msg.chat.id;
  const betSide = match[1];
  const amount = parseFloat(match[2]);

  if (!users[chatId] || users[chatId].balance < amount) {
    return bot.sendMessage(chatId, "❌ Not enough balance.");
  }

  if (amount > 1000) {
    return bot.sendMessage(chatId, "❌ Max bet is 1000 TRX.");
  }
  if (betSide === 'small' && amount > 3) {
    return bot.sendMessage(chatId, "❌ Max bet for small is 3 TRX.");
  }

  let winChance = betSide === 'big' ? 0.10 : 0.49;
  let won = Math.random() < winChance;

  users[chatId].balance -= amount;
  users[chatId].volume += amount;

  if (won) {
    const winAmount = amount * 1.9;
    users[chatId].balance += winAmount;
    bot.sendMessage(chatId, `🎉 You won! You got ${winAmount.toFixed(4)} TRX.`);
  } else {
    bot.sendMessage(chatId, `😞 You lost ${amount.toFixed(4)} TRX.`);
  }
});

// Lock TRX command: /lock <amount>
bot.onText(/\/lock (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const amount = parseInt(match[1]);

  if (!users[chatId] || users[chatId].balance < amount) {
    return bot.sendMessage(chatId, "❌ Not enough balance.");
  }
  if (amount < 100) {
    return bot.sendMessage(chatId, "❌ Minimum lock amount is 100 TRX.");
  }

  users[chatId].balance -= amount;
  users[chatId].locked = amount;
  users[chatId].lockTime = Date.now();

  bot.sendMessage(chatId, `🔒 You locked ${amount} TRX for 1 day. Use /claim to claim rewards.`);
});

// Claim locked TRX reward after 1 day
bot.onText(/\/claim/, (msg) => {
  const chatId = msg.chat.id;
  if (!users[chatId] || users[chatId].locked === 0) {
    return bot.sendMessage(chatId, "❌ You have no locked TRX.");
  }

  const diff = Date.now() - users[chatId].lockTime;
  if (diff < 86400000) {
    return bot.sendMessage(chatId, "❌ You can claim after 1 day.");
  }

  users[chatId].balance += users[chatId].locked + 3; // Return locked + reward
  users[chatId].locked = 0;
  users[chatId].lockTime = 0;

  bot.sendMessage(chatId, "🎉 You claimed your 3 TRX reward plus your locked TRX.");
});

// Withdraw command (manual processing)
bot.onText(/\/withdraw (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const amount = parseInt(match[1]);

  if (!users[chatId] || users[chatId].balance < amount + 3) {
    return bot.sendMessage(chatId, "❌ Not enough balance for withdrawal + fee.");
  }

  if (amount < 10) {
    return bot.sendMessage(chatId, "❌ Minimum withdrawal is 10 TRX.");
  }

  if (users[chatId].volume < amount * 2.5) {
    return bot.sendMessage(chatId, "❌ You must bet at least 2.5x withdrawal amount before withdrawing.");
  }

  users[chatId].balance -= amount + 3;
  bot.sendMessage(chatId, `📤 Withdrawal request for ${amount} TRX received. Processing manually.`);

  // Here you can add manual withdraw logic or admin notification
});

// Start Express server to keep the bot alive on Render
app.get('/', (req, res) => {
  res.send('Telegram TRX Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
