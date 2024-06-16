const { Client, GatewayIntentBits, MessageEmbed } = require('discord.js');
const Database = require('better-sqlite3');
const config = require('./config.json');

const token = process.env.BOT_TOKEN;
const prefix = config.prefix;
const maxLevel = 35;

const levelXPRequirements = {
    1: 50, 2: 250, 3: 500, 4: 750, 5: 1000, 6: 2500, 7: 5000, 8: 7500, 9: 10000,
    10: 15000, 11: 20000, 12: 25000, 13: 30000, 14: 35000, 15: 40000, 16: 45000,
    17: 50000, 18: 62500, 19: 75000, 20: 100000, 21: 125000, 22: 150000, 23: 175000,
    24: 200000, 25: 250000, 26: 300000, 27: 400000, 28: 500000, 29: 750000, 30: 1000000,
    31: 1250000, 32: 1500000, 33: 1750000, 34: 2000000, 35: 2500000,
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const db = new Database('levels.sqlite');

db.prepare(`
    CREATE TABLE IF NOT EXISTS levels (
        guildId TEXT,
        userId TEXT,
        xp INTEGER,
        level INTEGER,
        PRIMARY KEY (guildId, userId)
    )
`).run();

const getUserLevels = db.prepare('SELECT * FROM levels WHERE guildId = ? AND userId = ?');
const insertUserLevels = db.prepare('INSERT INTO levels (guildId, userId, xp, level) VALUES (?, ?, ?, ?)');
const updateUserLevels = db.prepare('UPDATE levels SET xp = ?, level = ? WHERE guildId = ? AND userId = ?');
const getTopLevels = db.prepare('SELECT * FROM levels WHERE guildId = ? ORDER BY xp DESC LIMIT 10');

client.on('ready', () => {
    console.log('Connected');
    client.user.setActivity('Coding', { type: 'WATCHING' });
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'test') {
        message.channel.send("Bot command working!");
    }

    if (command === 'whois') {
        let person = args.join(' ') || message.author;

        if (typeof person === 'string' && person.startsWith('<@') && person.endsWith('>')) {
            person = person.slice(2, -1);
            if (person.startsWith('!')) {
                person = person.slice(1);
            }
        }

        try {
            const member = await message.guild.members.fetch(person);
            const user = member.user;

            const embed = new MessageEmbed()
                .setColor('#000000')
                .setTitle(`${user.tag}`)
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: "Member", value: `${user}`, inline: false },
                    { name: "Roles", value: `${member.roles.cache.map(r => r).join(' ')}`, inline: false },
                    { name: "Joined Server", value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`, inline: true },
                    { name: "Joined Discord", value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`, inline: true }
                )
                .setFooter('User ID:', user.id) // Correctly sets the footer
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.reply("Failed to fetch information.");
        }
    }

    if (command === 'rank') {
        let userId; // Will store the user ID to get rank for

        // Check if the second argument is a valid mention
        if (message.mentions.users.size > 0) {
            userId = message.mentions.users.first().id;
        } else {
            userId = args[0]; // If no mention, assume the second argument is a user ID
        }

        if (!userId) {
            userId = message.author.id; // If no valid user ID found, default to author's rank
        }

        const guildId = message.guild.id;

        let userLevels = getUserLevels.get(guildId, userId);

        if (!userLevels) {
            message.reply("User not found.");
            return;
        }

        // Calculate XP needed for next level
        let xpNeeded = levelXPRequirements[userLevels.level];

        // Calculate XP progress
        let xpProgress = Math.floor((userLevels.xp / xpNeeded) * 100);

        // Adjust level display
        let nextLevelDisplay = `Level ${userLevels.level}`;
        if (userLevels.level === maxLevel) {
            nextLevelDisplay = "Max Level";
        }
        const embed = new MessageEmbed()
            .setColor('#3498db')
            .setTitle(nextLevelDisplay)
            .setDescription(`Progress: ${xpProgress}% (${userLevels.xp} XP / ${xpNeeded} XP needed)`);

        message.reply({ embeds: [embed] });
    }

    if (command === 'leaderboard') {
        const guildId = message.guild.id;

        const topUsers = getTopLevels.all(guildId);

        if (topUsers.length > 0) {
            const leaderboardEmbed = new MessageEmbed()
                .setColor('#ffcc00')
                .setTitle('Top 10 Leaderboard')
                .setDescription('Top 10 users based on XP:')
                .addFields(
                    topUsers.map((user, index) => ({
                        name: `${index + 1}. Level ${user.level}, XP ${user.xp}`,
                        value: `<@${user.userId}>`,
                        inline: false
                    }))
                );

            message.reply({ embeds: [leaderboardEmbed] });
        } else {
            message.reply('No leaderboard data available.');
        }
    }

    if (command === 'commands') {
        const embed = new MessageEmbed()
            .setColor('#ffcc00')
            .setTitle('Command list')
            .setDescription('List of commands.')
            .addFields(
                {
                    name: 'Whois',
                    value: 'Reveals information about the mentioned user/message author.',
                    inline: false
                },
                {
                    name: 'Rank',
                    value: 'Displays the mentioned user/author\'s level and XP.',
                    inline: false
                },
                {
                    name: 'Leaderboard',
                    value: 'Displays the top 10 users based on XP.',
                    inline: false
                },
                {
                    name: 'Levels',
                    value: 'Displays the list of levels and xp required for each level.',
                    inline: false
                },
                {
                    name: 'Commands',
                    value: 'Displays the lists of commands.',
                    inline: false
                }
            );

        message.reply({ embeds: [embed] });
    }
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    const userId = message.author.id;
    const guildId = message.guild.id;

    let userLevels = getUserLevels.get(guildId, userId);

    if (!userLevels) {
        userLevels = { guildId, userId, xp: 0, level: 1 };
        insertUserLevels.run(guildId, userId, 0, 1);
    }

    userLevels.xp += 10;

    while (userLevels.xp >= levelXPRequirements[userLevels.level]) {
        userLevels.level++;
        message.channel.send(`Congrats ${message.author}, you've leveled up to level ${userLevels.level}!`);

        if (userLevels.level > maxLevel) {
            userLevels.xp = Math.max(1000000, userLevels.xp);
            break;
        }
    }

    updateUserLevels.run(userLevels.xp, userLevels.level, guildId, userId);
});

client.on('messageCreate', (message) => {
    if (message.content === 'Enable ping.') {
        message.channel.send('Pong! (1)');
        let i = 1;

        const interval = setInterval(() => {
            i++;
            message.channel.send(`Pong! (${i})`)
                .then(sentMessage => console.log(`Sent message: ${sentMessage.content}`))
                .catch(console.error);
        }, 60000);

        setTimeout(() => {
            clearInterval(interval);
        }, 60000);
    }
});

client.login(token);