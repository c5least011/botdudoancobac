const { Client: SelfClient } = require('discord.js-selfbot-v13');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const http = require('http');

// 1. Khai báo bot
const spy = new SelfClient({ checkUpdate: false });
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

const NEKO_ID = '1248205177589334026';
const LIMIT = 40;
let targetGuildId = null;

// 2. Khởi tạo data
if (!fs.existsSync('history.json')) {
    fs.writeFileSync('history.json', JSON.stringify({ logs: [], stats: { tai: 0, xiu: 0, chan: 0, le: 0, total: 0 } }));
}

// 3. Port Render
http.createServer((req, res) => {
    res.write("Bot is running!");
    res.end();
}).listen(8080);

// 4. Cấu hình log lỗi toàn cục (Để biết Render bị gì)
process.on('unhandledRejection', (reason) => {
    console.log('❌ Lỗi hệ thống:', reason);
});

// 5. Logic Start (Tách riêng 2 con để k bị treo chùm)
const start = () => {
    console.log("--- ĐANG KHỞI CHẠY BOT ---");

    bot.login("MTQ2OTkxNTE5MjUwOTk4ODkyNQ.G-t1_d.LWX_qBLgei2tGeswj19qxoQpMBGadyMk-ewKhQ")
        .then(() => console.log("✅ Bot thường OK!"))
        .catch(e => console.error("❌ Bot thường tạch:", e.message));

    spy.login("MTQxNjQ0NTUxNTUyNDIxMDg0Mg.GhxiJF.r0Z0GFUNjqE7yN0fScb0cFNziq1XT_4mk3kT48")
        .then(() => console.log("✅ Selfbot OK!"))
        .catch(e => console.error("❌ Selfbot tạch (IP Render bị chặn/Captcha):", e.message));
};

start();

// 6. Selfbot Logic - Quét data chuẩn bằng Regex
spy.on('messageCreate', async (msg) => {
    if (msg.guildId !== targetGuildId || msg.author.id !== NEKO_ID) return;

    const content = msg.content || (msg.embeds[0]?.description) || "";
    
    // Regex bắt đúng kết quả nằm sau dấu : và trong dấu **
    const txMatch = content.match(/Tài\/Xỉu:\s*\*\*(Tài|Xỉu)\*\*/i);
    const clMatch = content.match(/Chẵn\/Lẻ:\s*\*\*(Chẵn|Lẻ)\*\*/i);

    if (!txMatch || !clMatch) return;

    const type1 = txMatch[1]; 
    const type2 = clMatch[1];

    try {
        let data = JSON.parse(fs.readFileSync('history.json'));
        data.logs.push({ type1, type2 });

        if (data.logs.length > LIMIT) data.logs.shift();

        // Tính lại stats
        data.stats = data.logs.reduce((acc, log) => {
            acc.total++;
            log.type1 === 'Tài' ? acc.tai++ : acc.xiu++;
            log.type2 === 'Chẵn' ? acc.chan++ : acc.le++;
            return acc;
        }, { tai: 0, xiu: 0, chan: 0, le: 0, total: 0 });

        fs.writeFileSync('history.json', JSON.stringify(data, null, 2));
        console.log(`[Spy] Đã húp ván: ${type1} - ${type2} (Tổng: ${data.logs.length})`);
    } catch (e) {
        console.error("Lỗi ghi file r m ơi");
    }
});

// 7. Bot Logic
bot.on('ready', async () => {
    const commands = [
        { name: 'setup', description: 'Setup server rình', integration_types: [1], contexts: [0, 1, 2] },
        { name: 'tx', description: 'Dự đoán kết quả', integration_types: [1], contexts: [0, 1, 2] }
    ];
    await bot.application.commands.set(commands);
    console.log('Bot dự đoán ready!');
});

bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'setup') {
        const gid = interaction.guildId;
        if (!gid) return interaction.reply({ content: 'Lệnh này dùng trong server thôi.', ephemeral: true });
        
        targetGuildId = gid;
        return interaction.reply({ content: `✅ Đã rình server này. (ID: ${gid})`, ephemeral: true });
    }

    if (interaction.commandName === 'tx') {
        if (interaction.guildId !== targetGuildId) return interaction.reply({ content: 'Sai server rình r.', ephemeral: true });

        const data = JSON.parse(fs.readFileSync('history.json'));
        if (data.logs.length < 5) return interaction.reply({ content: `Ít data quá (${data.logs.length} ván), từ từ v.`, ephemeral: true });

        // Dự đoán theo tỉ lệ thực tế
        const getRes = (win, total) => (Math.random() * 100 < (win / total) * 100);
        const predict1 = getRes(data.stats.tai, data.stats.total) ? 'Tài' : 'Xỉu';
        const predict2 = getRes(data.stats.chan, data.stats.total) ? 'Chẵn' : 'Lẻ';

        await interaction.reply({
            content: `🕵️ **Dự báo (${data.logs.length} ván):**\n- Cửa: **${predict1}**\n- Kiểu: **${predict2}**\n- Tỉ lệ Tài: \`${((data.stats.tai/data.stats.total)*100).toFixed(0)}%\` | Chẵn: \`${((data.stats.chan/data.stats.total)*100).toFixed(0)}%\``,
            ephemeral: true
        });
    }
});