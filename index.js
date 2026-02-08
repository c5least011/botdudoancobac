const { Client: SelfClient } = require('discord.js-selfbot-v13');
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const http = require('http');
const env = require('dotenv').config();

// port
http.createServer((req, res) => {
    res.write("Bot is running!");
    res.end();
}).listen(8080);

const spy = new SelfClient();
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

const NEKO_ID = '1248205177589334026';
const LIMIT = 40;
let targetChannel = null;

// selfbot logic
spy.on('messageCreate', async (msg) => {
    if (msg.author.id !== NEKO_ID) return;

    const content = msg.content || (msg.embeds[0]?.description) || "";
    if (!content.includes('Tài/Xỉu')) return;

    let data = JSON.parse(fs.readFileSync('history.json'));
    
    const isTai = content.includes('Tài');
    const isChan = content.includes('Chẵn');

    const entry = {
        type1: isTai ? 'Tài' : 'Xỉu',
        type2: isChan ? 'Chẵn' : 'Lẻ'
    };

    data.logs.push(entry);

    // auto limit
    if (data.logs.length > LIMIT) {
        data.logs.shift();
    }

    data.stats = data.logs.reduce((acc, log) => {
        acc.total++;
        log.type1 === 'Tài' ? acc.tai++ : acc.xiu++;
        log.type2 === 'Chẵn' ? acc.chan++ : acc.le++;
        return acc;
    }, { tai: 0, xiu: 0, chan: 0, le: 0, total: 0 });

    fs.writeFileSync('history.json', JSON.stringify(data, null, 2));
    console.log(`[Spy] Cập nhật ván mới. Hiện tại: ${data.logs.length}/${LIMIT}`);
});

// bot logic
bot.on('ready', async () => {
    const commands = [
        { name: 'setup', description: 'Setup channel' },
        { name: 'tx', description: 'Dự đoán kết quả' }
    ];
    await bot.application.commands.set(commands);
    console.log('Bot dự đoán ready!');
});

bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'setup') {
        targetChannel = interaction.channelId;
        return interaction.reply({ content: '✅ Đã setup channel.', ephemeral: true });
    }

    if (interaction.commandName === 'tx') {
        if (interaction.channelId !== targetChannel) return interaction.reply({ content: 'Sai channel.', ephemeral: true });

        const data = JSON.parse(fs.readFileSync('history.json'));
        if (data.logs.length < 5) return interaction.reply({ content: `Chưa đủ data (Cần ít nhất 5 ván, hiện có ${data.logs.length})`, ephemeral: true });

        const getRes = (win, total) => (Math.random() * 100 < (win / total) * 100);
        
        const predict1 = getRes(data.stats.tai, data.stats.total) ? 'Tài' : 'Xỉu';
        const predict2 = getRes(data.stats.chan, data.stats.total) ? 'Chẵn' : 'Lẻ';

        await interaction.reply({
            content: `🕵️ **Dự báo (Data ${data.logs.length} ván):**\n- Kết quả: **${predict1}**\n- Kiểu: **${predict2}**`,
            ephemeral: true
        });
    }
});
// Login
spy.login(process.env.TOKEN_ACC_CLONE);
bot.login(process.env.TOKEN_BOT_THUONG);