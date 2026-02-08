const { Client: SelfClient } = require('discord.js-selfbot-v13');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const http = require('http');

// 1. Khai báo biến TRƯỚC (Để tránh lỗi ReferenceError)
const spy = new SelfClient();
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

const NEKO_ID = '1248205177589334026';
const LIMIT = 40;
let targetGuildId = null;

// 2. Khởi tạo data
if (!fs.existsSync('history.json')) {
    fs.writeFileSync('history.json', JSON.stringify({ logs: [], stats: { tai: 0, xiu: 0, chan: 0, le: 0, total: 0 } }));
}

// 3. Port để Render ko die
http.createServer((req, res) => {
    res.write("Bot is running!");
    res.end();
}).listen(8080);

// 4. Logic Start (Để ở đây sau khi đã khai báo spy/bot)
const start = async () => {
    console.log("--- ĐANG KHỞI CHẠY BOT ---");

    // Login con Bot thường trước, k đợi con Selfbot
    bot.login("MTQ2OTkxNTE5MjUwOTk4ODkyNQ.G-t1_d.LWX_qBLgei2tGeswj19qxoQpMBGadyMk-ewKhQ")
        .then(() => console.log("✅ Bot thường đã lên!"))
        .catch(e => console.error("❌ Bot thường sai Token:", e.message));

    // Login Selfbot sau, tạch cũng k sao
    spy.login("MTQxNjQ0NTUxNTUyNDIxMDg0Mg.GhxiJF.r0Z0GFUNjqE7yN0fScb0cFNziq1XT_4mk3kT48")
        .then(() => console.log("✅ Selfbot đã lên!"))
        .catch(e => console.error("❌ Selfbot kẹt login:", e.message));
};

start();

// 5. Selfbot Logic
spy.on('messageCreate', async (msg) => {
    if (msg.guildId !== targetGuildId || msg.author.id !== NEKO_ID) return;

    const content = msg.content || (msg.embeds[0]?.description) || "";
    
    // Dùng Regex bắt chữ sau dấu : và nằm trong cặp dấu **
    // Kết quả trả về sẽ là chữ nằm đúng vị trí đó
    const txMatch = content.match(/Tài\/Xỉu:\s*\*\*(Tài|Xỉu)\*\*/i);
    const clMatch = content.match(/Chẵn\/Lẻ:\s*\*\*(Chẵn|Lẻ)\*\*/i);

    if (!txMatch || !clMatch) return; // K tìm thấy đúng định dạng thì cút

    const type1 = txMatch[1]; // Nó sẽ lấy đúng chữ 'Tài' hoặc 'Xỉu'
    const type2 = clMatch[1]; // Nó sẽ lấy đúng chữ 'Chẵn' hoặc 'Lẻ'

    let data = JSON.parse(fs.readFileSync('history.json'));

    data.logs.push({ type1, type2 });

    if (data.logs.length > LIMIT) data.logs.shift();

    // Reset stats và tính lại từ logs
    data.stats = data.logs.reduce((acc, log) => {
        acc.total++;
        log.type1 === 'Tài' ? acc.tai++ : acc.xiu++;
        log.type2 === 'Chẵn' ? acc.chan++ : acc.le++;
        return acc;
    }, { tai: 0, xiu: 0, chan: 0, le: 0, total: 0 });

    fs.writeFileSync('history.json', JSON.stringify(data, null, 2));
    console.log(`[Spy] Đã húp ván: ${type1} - ${type2}`);
});

// 6. Bot Logic
bot.on('ready', async () => {
    const commands = [
        { 
            name: 'setup', 
            description: 'Setup server rình', 
            integration_types: [1], 
            contexts: [0, 1, 2] 
        },
        { 
            name: 'tx', 
            description: 'Dự đoán kết quả', 
            integration_types: [1], 
            contexts: [0, 1, 2] 
        }
    ];
    await bot.application.commands.set(commands);
    console.log('Bot dự đoán ready!');
});

bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'setup') {
        const currentGuildId = interaction.guildId;
        if (!currentGuildId) return interaction.reply({ content: 'Lệnh này phải dùng trong Server.', ephemeral: true });
        
        if (!spy.guilds.cache.has(currentGuildId)) {
            return interaction.reply({ content: '❌ Selfbot ko có trong server này.', ephemeral: true });
        }

        targetGuildId = currentGuildId;
        return interaction.reply({ content: '✅ Đã setup thành công server này cho Selfbot.', ephemeral: true });
    }

    if (interaction.commandName === 'tx') {
        if (interaction.guildId !== targetGuildId) return interaction.reply({ content: 'Chưa setup server này hoặc sai server rình.', ephemeral: true });

        const data = JSON.parse(fs.readFileSync('history.json'));
        if (data.logs.length < 5) return interaction.reply({ content: `Chưa đủ data (Có ${data.logs.length} ván)`, ephemeral: true });

        const getRes = (win, total) => (Math.random() * 100 < (win / total) * 100);
        const predict1 = getRes(data.stats.tai, data.stats.total) ? 'Tài' : 'Xỉu';
        const predict2 = getRes(data.stats.chan, data.stats.total) ? 'Chẵn' : 'Lẻ';

        await interaction.reply({
            content: `🕵️ **Dự báo (Data ${data.logs.length} ván):**\n- Kết quả: **${predict1}**\n- Kiểu: **${predict2}**`,
            ephemeral: true
        });
    }
});