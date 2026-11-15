const { Telegraf, Markup } = require('telegraf');
const { Pool } = require('pg');

const bot = new Telegraf('8800470191:AAEthMQz1WJ21GjFQseZjHxmtznwgE3dEOU');

const ADMIN_ID = 8033102152;

const GROUP_TARGET_ID = '-1003939021804';
const CHANNEL_TARGET_ID = '-1004329031541';

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_oZeM7fWbyr8n@ep-snowy-smoke-b3fh8dic-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

const VIDEO_1_URL = 'https://files.catbox.moe/0e46tb.mp4';
const FOTO_ADMIN_URL = 'https://files.catbox.moe/e6md4h.jpg';

// Fungsi otomatis membuat tabel jika belum ada di database Neon
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bot_storage (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL
            );
        `);
        console.log('Database & tabel bot_storage berhasil dipastikan siap!');
    } catch (err) {
        console.error('Gagal membuat tabel otomatis:', err.message);
    }
}

async function getSupabaseData(key, defaultValue) {
    try {
        const res = await pool.query('SELECT value FROM bot_storage WHERE key = $1', [key]);
        if (res.rows.length > 0) return res.rows[0].value;
        return defaultValue;
    } catch (err) {
        console.error(`Error read DB [${key}]:`, err.message);
        return defaultValue;
    }
}

async function setSupabaseData(key, value) {
    try {
        await pool.query(
            `INSERT INTO bot_storage (key, value) VALUES ($1, $2::jsonb) 
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            [key, JSON.stringify(value)]
        );
    } catch (err) {
        console.error(`Error write DB [${key}]:`, err.message);
    }
}

async function readDB() { 
    let data = await getSupabaseData('main_db', {}); 
    const adminKey = ADMIN_ID.toString();
    if (!data[adminKey]) data[adminKey] = [];
    return data;
}

async function writeDB(data) { 
    await setSupabaseData('main_db', data); 
}

async function readSisaDB() { 
    let data = await getSupabaseData('sisa_db', {}); 
    const adminKey = ADMIN_ID.toString();
    if (!data[adminKey]) data[adminKey] = [];
    return data;
}
async function writeSisaDB(data) { await setSupabaseData('sisa_db', data); }

async function readActivePull() { return await getSupabaseData('active_pull', {}); }
async function writeActivePull(data) { await setSupabaseData('active_pull', data); }

async function readCustomText() { 
    return await getSupabaseData('custom_text', "Teks Tidak Ada"); 
}
async function writeCustomText(newText) { 
    await setSupabaseData('custom_text', newText); 
}

async function saveUser(userId) {
    let users = await getSupabaseData('users_list', []);
    if (!users.includes(userId)) {
        users.push(userId);
        await setSupabaseData('users_list', users);
    }
}

async function getAllUsers() {
    return await getSupabaseData('users_list', []);
}

bot.start(async (ctx) => {
    try {
        if (ctx.chat.type !== 'private') return;

        const userId = ctx.from.id;

        global.activeLiveChat = global.activeLiveChat || {};
        delete global.activeLiveChat[userId];

        // MENU USER
        if (userId !== ADMIN_ID) {
            await saveUser(userId);

            const welcomeText =
                "<b>LAYANAN PUSAT BANTUAN & DATABASE</b>\n\n" +
                "Selamat datang di bot resmi kami. Silakan pilih menu di bawah ini:\n\n" +
                "• <b>Live Chat</b>: Terhubung langsung dengan admin.\n" +
                "• <b>Tutor Panduan</b>: Pelajari cara kerja & aturan blast.";

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('Live Chat', 'menu_live_chat'),
                    Markup.button.callback('Tutor Panduan', 'menu_tutor_panduan')
                ]
            ]);

            return await ctx.replyWithHTML(welcomeText, keyboard);
        }

        // DATA ADMIN
        const db = await readDB();
        const sisaDB = await readSisaDB();
        const allUsers = await getAllUsers();

        const adminKey = ADMIN_ID.toString();

        const totalUtama = (db[adminKey] || []).length;
        const totalSisa = (sisaDB[adminKey] || []).length;
        const totalSemua = totalUtama + totalSisa;
        const totalUsers = allUsers.length;

        const adminMenuText =
    "╭━━━「 PRIVATE DATABASE 」━━━╮\n\n" +
    "📦 DATABASE\n" +
    "├ 数据库总数 : " + totalSemua + " DB 📦\n" +
    "├ 用户总数 : " + totalUsers + " USER 🧑‍🧑‍🧒\n" +
    "└ 系统状态 : 在线\n\n" +
    "╰━━━━━━━━━━━━━━━━━━╯\n\n" +
    "✦ 请选择所需功能。";

        // KEYBOARD ADMIN
        const adminKeyboard = Markup.keyboard([
            ['📋 MENU FITUR'],
            ['/10db', '/20db'],
            ['/setteks', '/cekdb']
        ]).resize().persistent();

        try {
            await ctx.replyWithPhoto(FOTO_ADMIN_URL, {
                caption: adminMenuText,
                parse_mode: 'HTML',
                ...adminKeyboard
            });
        } catch (err) {
            await ctx.replyWithHTML(adminMenuText, adminKeyboard);
        }

    } catch (outerErr) {
        console.log('Error start:', outerErr.message);
    }
});

bot.hears('📋 MENU FITUR', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.reply('Akses ditolak.');
    }

    const menu = `
╭━━━「 ⚙️ ADMIN PANEL 」━━━╮

📦 DATABASE
├ /adddb — Tambah nomor
├ /cleardb — Reset database
├ /sisa — Tambah nomor cadangan
├ /sisadb — Ambil database sisa
├ /ceksisa — Cek database sisa
├ /clearsisa — Hapus database sisa
├ /setteks — Atur teks
└ /info — Broadcast informasi

╰━━━━━━━━━━━━━━━━━━╯

✦ Silakan pilih command yang ingin digunakan.
`;

    await ctx.reply(menu);
});

bot.command('info', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID || ctx.chat.type !== 'private') return;
    const botUsername = ctx.botInfo ? ctx.botInfo.username : 'bot_kamu';
    const infoMessage = "<b>INFORMASI RESMI DARI ADMIN</b>\n\n• <b>DB Ready Lagi Yaa!</b> Gas yang mau blast, langsung ke PM.\n• <b>Kendala Chat / Limit?</b> Gunakan fitur Live Chat.\n• <b>Informasi Rules?</b> Kunjungi bot @dbblast_bot";
    const infoKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.url('Live Chat', 'https://t.me/' + botUsername),
            Markup.button.url('Rules Bot', 'https://t.me/dbblast_bot')
        ]
    ]);

    let groupSuccess = false, channelSuccess = false, userSuccessCount = 0;
    try { await ctx.telegram.sendMessage(GROUP_TARGET_ID, infoMessage, { parse_mode: 'HTML', ...infoKeyboard }); groupSuccess = true; } catch (e) {}
    try { await ctx.telegram.sendMessage(CHANNEL_TARGET_ID, infoMessage, { parse_mode: 'HTML', ...infoKeyboard }); channelSuccess = true; } catch (e) {}

    const allUsers = await getAllUsers();
    for (const userId of allUsers) {
        try {
            await ctx.telegram.sendMessage(userId, infoMessage, { parse_mode: 'HTML', ...infoKeyboard });
            userSuccessCount++;
            await new Promise(r => setTimeout(r, 50));
        } catch (e) {}
    }
    await ctx.replyWithHTML("<b>Broadcast Selesai!</b>\nGrup: " + (groupSuccess ? '✅' : '❌') + " | Saluran: " + (channelSuccess ? '✅' : '❌') + " | User: " + userSuccessCount);
});

bot.action('menu_live_chat', async (ctx) => {
    const userId = ctx.from.id;
    global.activeLiveChat = global.activeLiveChat || {};
    global.activeLiveChat[userId] = true;
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('Akhiri', 'akhiri_live_chat')]]);
    await ctx.editMessageText("<b>LIVE CHAT AKTIF</b>\n\nKetik pesan atau kendala kamu di sini. Admin akan segera membalas.", { parse_mode: 'HTML', ...keyboard }).catch(() => ctx.replyWithHTML('<b>LIVE CHAT AKTIF</b>', keyboard));
    ctx.answerCbQuery('Live Chat aktif!');
});

bot.action('akhiri_live_chat', async (ctx) => {
    const userId = ctx.from.id;
    global.activeLiveChat = global.activeLiveChat || {};
    delete global.activeLiveChat[userId];
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('Menu Utama', 'kembali_main_menu')]]);
    await ctx.editMessageText("<b>Live Chat Ditutup</b>\n\nKetik /start untuk mulai kembali.", { parse_mode: 'HTML', ...keyboard }).catch(() => ctx.replyWithHTML('Ditutup', keyboard));
    ctx.answerCbQuery('Diakhiri.');
});

bot.action('menu_tutor_panduan', async (ctx) => {
    const userId = ctx.from.id;
    global.activeLiveChat = global.activeLiveChat || {};
    delete global.activeLiveChat[userId];
    const publicText = "<b>PANDUAN & ATURAN BLAST</b>\n\n1. WhatsApp wajib tanpa timer.\n2. Salin nomor dan teks.\n3. Kirim pesan ke tujuan.\n4. <b>Wajib rekam layar</b> dari awal sampai selesai.";
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('Oke Paham', 'oke_paham_1')], [Markup.button.callback('Menu Utama', 'kembali_main_menu')]]);
    await ctx.deleteMessage().catch(() => {});
    try { await ctx.replyWithVideo(VIDEO_1_URL); } catch (e) {}
    await ctx.replyWithHTML(publicText, keyboard);
    ctx.answerCbQuery();
});

bot.action('kembali_main_menu', async (ctx) => {
    const userId = ctx.from.id;
    global.activeLiveChat = global.activeLiveChat || {};
    delete global.activeLiveChat[userId];
    const welcomeText = "<b>LAYANAN PUSAT BANTUAN & DATABASE</b>\n\nSilakan pilih menu di bawah ini:";
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('Live Chat', 'menu_live_chat'), Markup.button.callback('Tutor Panduan', 'menu_tutor_panduan')]]);
    await ctx.editMessageText(welcomeText, { parse_mode: 'HTML', ...keyboard }).catch(() => ctx.replyWithHTML(welcomeText, keyboard));
    ctx.answerCbQuery();
});

bot.action('oke_paham_1', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('Paham', 'final_admin')]]);
    await ctx.editMessageText("<b>WARNING:</b> Wajib rekam layar saat pengerjaan. Tidak ikut rules = Tidak di-payment!", { parse_mode: 'HTML', ...keyboard });
    ctx.answerCbQuery();
});

bot.action('final_admin', async (ctx) => {
    await ctx.editMessageText("Silakan chat admin blast:\n👉 <b>@Kibooshii</b>", { parse_mode: 'HTML' });
    ctx.answerCbQuery();
});

global.chatSessionMap = global.chatSessionMap || {};
bot.on('message', async (ctx, next) => {
    if (ctx.chat.type !== 'private') return;
    const userId = ctx.from.id;

    if (userId === ADMIN_ID) {
        const repliedMessage = ctx.message.reply_to_message;
        if (repliedMessage) {
            const targetUserId = global.chatSessionMap[repliedMessage.message_id.toString()];
            if (targetUserId) {
                const adminText = ctx.message.text || ctx.message.caption || '[Media]';
                try {
                    await ctx.telegram.sendMessage(targetUserId, "<b>Admin:</b>\n" + adminText, { parse_mode: 'HTML' });
                    return ctx.replyWithHTML('<b>Terkirim!</b>');
                } catch (e) {
                    return ctx.replyWithHTML('Gagal: ' + e.message);
                }
            }
        }
        return next();
    }

    if (ctx.message.text && ctx.message.text.startsWith('/')) return next();
    global.activeLiveChat = global.activeLiveChat || {};
    if (!global.activeLiveChat[userId]) return next(); 

    const username = ctx.from.username ? '@' + ctx.from.username : ctx.from.first_name;
    try {
        const headerSent = await ctx.telegram.sendMessage(ADMIN_ID, "<b>BOT DB BLAST:</b>\nLive Chat dari " + username + " (<code>" + userId + "</code>):\n\nBalas pesan ini:", { parse_mode: 'HTML' });
        const forwarded = await ctx.forwardMessage(ADMIN_ID);
        global.chatSessionMap[forwarded.message_id.toString()] = userId;
        global.chatSessionMap[headerSent.message_id.toString()] = userId;
    } catch (e) {}
});

const adminOnly = (ctx, next) => {
    if (!ctx.from) return;
    if (ctx.from.id === ADMIN_ID) return next();
    return ctx.reply('Akses ditolak.');
};

bot.command('setteks', adminOnly, async (ctx) => {
    const text = ctx.message.text.replace('/setteks', '').trim();
    if (!text) return ctx.replyWithHTML("<b>Teks Saat Ini:</b>\n\n" + (await readCustomText()));
    await writeCustomText(text);
    ctx.replyWithHTML('Berhasil memperbarui teks panduan!');
});

bot.command('adddb', adminOnly, async (ctx) => {
    const text = ctx.message.text.replace('/adddb', '').trim();
    if (!text) return ctx.replyWithHTML('Contoh: <code>/adddb 628111 628222</code>');
    const numbers = text.match(/\b\d{8,15}\b/g) || [];
    if (numbers.length === 0) return ctx.replyWithHTML('Nomor tidak valid.');

    const db = await readDB();
    const adminKey = ADMIN_ID.toString();
    if (!db[adminKey]) db[adminKey] = [];
    db[adminKey] = db[adminKey].concat(numbers);
    await writeDB(db);
    ctx.replyWithHTML("Ditambahkan <code>" + numbers.length + "</code> nomor.\nTotal: <b>" + db[adminKey].length + "</b>");
});

bot.hears(/^\/(\d+)db$/, adminOnly, async (ctx) => {
    const db = await readDB();
    const adminKey = ADMIN_ID.toString();
    const userNumbers = db[adminKey] || []; 
    const sisaDB = await readSisaDB();
    const jumlahSisa = (sisaDB[adminKey] || []).length;
    const commandNumber = parseInt(ctx.match[1]); 

    if (commandNumber <= 0) return ctx.replyWithHTML('Angka tidak valid.');
    if (userNumbers.length === 0) return ctx.replyWithHTML('Database Utama Kosong.');

    const actualPullCount = commandNumber > userNumbers.length ? userNumbers.length : commandNumber;
    const selectedNumbers = userNumbers.splice(0, actualPullCount);
    db[adminKey] = userNumbers;
    await writeDB(db); 

    const maxDigits = actualPullCount.toString().length;

    let formattedChunks = [];
    for (let i = 0; i < selectedNumbers.length; i += 10) {
        const chunk = selectedNumbers.slice(i, i + 10);
        let chunkLines = [];
        chunk.forEach((num, index) => {
            const currentNumberIndex = (i + index + 1).toString();
            const paddedNumber = currentNumberIndex.padStart(maxDigits, ' ');
            
            // Otomatis menambahkan tanda '+' di depan nomor jika belum ada
            const formattedNum = num.startsWith('+') ? num : '+' + num;

            chunkLines.push('│      ' + paddedNumber + '  │  <code>' + formattedNum + '</code>');
        });
        formattedChunks.push(chunkLines.join('\n'));
    }

    const outputText = "╭── 📦 <b>EXPORT DB UTAMA (" + actualPullCount + " Data)</b>\n│\n" + formattedChunks.join('\n│\n') + "\n│\n╰── 📊 <b>Sisa:</b> " + userNumbers.length + " | <b>Belum Selesai:</b> " + jumlahSisa + "\n\n⚠️ <b>Batas Waktu:</b> 30 menit!";
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('🔄 Tarik Kembali', 'tarik_db'), Markup.button.callback('✅ Selesai', 'done_db')]]);

    ctx.replyWithHTML(outputText, keyboard).then(async (sentMessage) => {
        const activePull = await readActivePull();
        const customText = await readCustomText();
        
        if (customText) {
            ctx.replyWithHTML(customText).then(async (textMessage) => {
                activePull[sentMessage.message_id.toString()] = { 
                    numbers: selectedNumbers, 
                    textMsgId: textMessage.message_id 
                };
                await writeActivePull(activePull);
            });
        } else {
            activePull[sentMessage.message_id.toString()] = { 
                numbers: selectedNumbers, 
                textMsgId: null 
            };
            await writeActivePull(activePull);
        }
    });
});

bot.action('tarik_db', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('Akses ditolak.');
    const adminKey = ADMIN_ID.toString();
    const messageId = ctx.callbackQuery.message.message_id.toString();
    const activePull = await readActivePull();
    const data = activePull[messageId];

    if (!data || !data.numbers || data.numbers.length === 0) return ctx.answerCbQuery('Data sudah diproses.');

    const db = await readDB();
    if (!db[adminKey]) db[adminKey] = [];
    db[adminKey].unshift(...data.numbers);
    await writeDB(db);

    if (data.textMsgId) ctx.telegram.deleteMessage(ctx.chat.id, data.textMsgId).catch(() => {});
    delete activePull[messageId];
    await writeActivePull(activePull);

    await ctx.editMessageText("<b>NOMOR DIKEMBALIKAN</b>\nTotal: <code>" + data.numbers.length + "</code> nomor.", { parse_mode: 'HTML' });
    ctx.answerCbQuery('Berhasil dikembalikan!');
});

bot.action('done_db', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('Akses ditolak.');
    const messageId = ctx.callbackQuery.message.message_id.toString();
    const activePull = await readActivePull();
    const data = activePull[messageId];

    if (data && data.textMsgId) ctx.telegram.deleteMessage(ctx.chat.id, data.textMsgId).catch(() => {});
    if (activePull[messageId]) {
        delete activePull[messageId];
        await writeActivePull(activePull);
    }
    await ctx.editMessageText('<b>STATUS: SELESAI</b>', { parse_mode: 'HTML' });
    ctx.answerCbQuery('Selesai!');
});

bot.command('cekdb', adminOnly, async (ctx) => {
    const db = await readDB();
    const adminKey = ADMIN_ID.toString();
    ctx.replyWithHTML("<b>Sisa DB Utama:</b> <code>" + (db[adminKey] || []).length + "</code> nomor.");
});

bot.command('cleardb', adminOnly, async (ctx) => {
    const db = await readDB();
    const adminKey = ADMIN_ID.toString();
    db[adminKey] = []; 
    await writeDB(db);
    ctx.replyWithHTML('DB Utama dikosongkan.');
});

bot.command('sisa', adminOnly, async (ctx) => {
    const text = ctx.message.text.replace(/^\/sisa/, '').trim();
    if (!text) return ctx.replyWithHTML('Contoh: <code>/sisa 628111 628222</code>');
    const numbers = text.match(/\b\d{8,15}\b/g) || [];
    if (numbers.length === 0) return ctx.replyWithHTML('Nomor tidak valid.');

    const sisaDB = await readSisaDB();
    const adminKey = ADMIN_ID.toString();
    if (!sisaDB[adminKey]) sisaDB[adminKey] = [];
    sisaDB[adminKey] = sisaDB[adminKey].concat(numbers);
    await writeSisaDB(sisaDB);
    ctx.replyWithHTML("Disimpan ke Sisa DB: <code>" + numbers.length + "</code> nomor.");
});

bot.command('sisadb', adminOnly, async (ctx) => {
    const sisaDB = await readSisaDB();
    const adminKey = ADMIN_ID.toString();
    const numbers = sisaDB[adminKey] || [];
    if (numbers.length === 0) return ctx.replyWithHTML('Sisa Database Kosong.');

    sisaDB[adminKey] = [];
    await writeSisaDB(sisaDB);

    let output = "╭── 📦 <b>EXPORT SEMUA SISA DB</b>\n";
    numbers.forEach((num, idx) => { 
        const formattedNum = num.startsWith('+') ? num : '+' + num;
        output += '│ ' + (idx + 1) + '. <code>' + formattedNum + '</code>\n'; 
    });
    output += "╰── 📊 <b>Total:</b> " + numbers.length + " nomor.";
    ctx.replyWithHTML(output);
});

bot.command('ceksisa', adminOnly, async (ctx) => {
    const sisaDB = await readSisaDB();
    const adminKey = ADMIN_ID.toString();
    ctx.replyWithHTML("<b>Sisa Database:</b> <code>" + (sisaDB[adminKey] || []).length + "</code> nomor.");
});

bot.command('clearsisa', adminOnly, async (ctx) => {
    const sisaDB = await readSisaDB();
    const adminKey = ADMIN_ID.toString();
    sisaDB[adminKey] = [];
    await writeSisaDB(sisaDB);
    ctx.replyWithHTML('Sisa Database dikosongkan.');
});

// Penanganan Error Global agar Bot tidak Crash Loop di Pterodactyl
process.once('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.once('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown:', error);
});

// Menjalankan inisialisasi tabel otomatis sebelum bot online
initDatabase().then(() => {
    bot.launch().then(() => {
        console.log('Bot Telegram Berhasil Dijalankan dengan Neon Database!');
    }).catch((err) => {
        console.log('Gagal Launch Bot:', err);
    });
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
