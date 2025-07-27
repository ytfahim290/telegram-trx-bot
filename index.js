const { Telegraf } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf('6018768805:AAEJ8__hFKbG8NnUPTCG4nXEfDyllNVMPEk');
const NOWNODES_API_KEY = '129da110-17eb-4ce3-bcf4-358cb594f172';
const TRON_API = `https://trx.nownodes.io`;

const ADMIN_ID = 1209855867;
const REQUIRED_CHANNEL = '@BOT_TOKENFF';

const users = {};

function checkMembership(userId) {
  return axios.get(`https://api.telegram.org/bot${bot.token}/getChatMember`, {
    params: {
      chat_id: REQUIRED_CHANNEL,
      user_id: userId,
    },
  }).then(res => {
    const status = res.data.result.status;
    return ['member', 'creator', 'administrator'].includes(status);
  }).catch(() => false);
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;

  const isMember = await checkMembership(userId);
  if (!isMember) {
    return ctx.reply(`❌ You must join our channel first:\n👉 ${REQUIRED_CHANNEL}`);
  }

  users[userId] = {
    balance: 0,
    referredBy: null,
  };

  ctx.reply(`🎉 Welcome to the TRX Betting Bot!\n\nUse /deposit, /withdraw, /bet, /refer, or /balance.`);
});

bot.command('balance', (ctx) => {
  const userId = ctx.from.id;
  const balance = users[userId]?.balance || 0;
  ctx.reply(`💰 Your balance: ${balance} TRX`);
});

bot.command('refer', (ctx) => {
  const userId = ctx.from.id;
  ctx.reply(`👥 Your referral link:\nt.me/${ctx.me}?start=${userId}`);
});

bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  let msg = `👑 Admin Panel\n\nUsers:\n`;
  for (const uid in users) {
    msg += `ID: ${uid}, Balance: ${users[uid].balance} TRX\n`;
  }

  ctx.reply(msg);
});

bot.launch();
