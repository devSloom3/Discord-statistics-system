const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { updateXP, getXP, getTopXP } = require('./xpDB');
const config = require('./config.json');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function getXPBar(current, total, length = 20) {
  const filled = Math.floor((current / total) * length);
  const empty = length - filled;
  return '🟩'.repeat(filled) + '⬛'.repeat(empty);
}

const prefix = config.prefix || '!';
const allowedChannelIds = ['1389610819515584591', '1321551166206906388', '1382107531656298607'];
const levelUpChannelId = '1321551166206906388'; 

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const guildId = message.guild.id;

  if (!message.content.startsWith(prefix)) {
    updateXP(userId, guildId, 10, async (err, data) => {
      if (err) {
        console.error('XP update error:', err);
        return;
      }

      const { xp, level, levelUp } = data;
      const nextLevelXP = 5 * (level ** 2) + 50 * level + 100;
      const xpBar = getXPBar(xp, nextLevelXP);

      if (levelUp) {
        const imagePath = path.join(__dirname, 'game-banner.jpg');
        const attachment = new AttachmentBuilder(imagePath);

        const embed = new EmbedBuilder()
          .setTitle("🚀 Level Up!")
          .setDescription(`${message.author} has reached **Level ${level}**!`)
          .addFields(
            { name: "Progress", value: `${xp}/${nextLevelXP}` },
            { name: "XP Bar", value: xpBar }
          )
          .setColor(0x9f83dd)
          .setThumbnail(message.author.displayAvatarURL())
          .setImage('attachment://game-banner.jpg');

        const levelUpChannel = message.guild.channels.cache.get(levelUpChannelId);
        if (levelUpChannel) {
          await levelUpChannel.send({ embeds: [embed], files: [attachment] });
        }

        const levelRoles = {
          5: "EPIC Active",
          10: "EPIC Hero",
          15: "EPIC Champion",
          20: "EPIC Master",
          30: "EPIC Legend",
          40: "EPIC Immortal"
        };

        const roleName = levelRoles[level];
        if (roleName) {
          const role = message.guild.roles.cache.find(r => r.name === roleName);
          if (role) {
            const member = await message.guild.members.fetch(userId);
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role);
            }
          }
        }
      }
    });
  }

  if (!message.content.startsWith(prefix)) return;
  if (!allowedChannelIds.includes(message.channel.id)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'rank') {
    getXP(userId, guildId, (err, data) => {
      if (err) {
        console.error('XP get error:', err);
        return message.reply('There was an error fetching your XP.');
      }

      const { xp, level } = data;
      const nextLevelXP = 5 * (level ** 2) + 50 * level + 100;
      const xpBar = getXPBar(xp, nextLevelXP);

      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Rank`)
        .setColor(0x9f83dd)
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: "Level", value: `${level}`, inline: true },
          { name: "XP", value: `${xp} / ${nextLevelXP}`, inline: true },
          { name: "Progress", value: xpBar }
        );

      message.channel.send({ embeds: [embed] });
    });
  }

  if (command === 'top') {
    getTopXP(guildId, 10, async (err, topUsers) => {
      if (err) {
        console.error('Top XP error:', err);
        return message.reply('There was an error fetching top users.');
      }

      let description = '';
      for (let i = 0; i < topUsers.length; i++) {
        const user = await client.users.fetch(topUsers[i].userId).catch(() => null);
        const name = user ? user.username : 'Unknown User';
        description += `**${i + 1}.** ${name} — Level ${topUsers[i].level}, XP: ${topUsers[i].xp}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 10 Users by XP")
        .setColor(0x9f83dd)
        .setDescription(description || 'No data available.');

      message.channel.send({ embeds: [embed] });
    });
  }

  if (command === 'info') {
    const rolesInfo = [
      { level: 5, name: 'EPIC Active' },
      { level: 10, name: 'EPIC Hero' },
      { level: 15, name: 'EPIC Champion' },
      { level: 20, name: 'EPIC Master' },
      { level: 30, name: 'EPIC Legend' },
      { level: 40, name: 'EPIC Immortal' }
    ];

    const embed = new EmbedBuilder()
      .setTitle('📜 EPIC Level Roles Info')
      .setColor(0x9f83dd)
      .setDescription('List of all EPIC ranks and the required level:')
      .setThumbnail(message.guild.iconURL());

    for (const role of rolesInfo) {
      embed.addFields({
        name: `🎖️ ${role.name}`,
        value: `Required Level: **${role.level}**`,
        inline: false
      });
    }

    message.channel.send({ embeds: [embed] });
  }
});

client.login(config.token);








