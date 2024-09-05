const { Client, IntentsBitField, GuildMember, Role, TextChannel, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json'); 
const { allowedDomains } = require('./config.json');

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildMessages] });

const serverOwnerID = '1268562577080713282'; // ID создателя сервера
let logChannel = null; 

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Получаем гильдию
  const guild = client.guilds.cache.first();

  // Проверяем, есть ли канал для логов
  logChannel = await guild.channels.cache.find(channel => channel.name === 'bot-logs' && channel.type === 'GUILD_TEXT');
  if (!logChannel) {
    // Создаем канал, если он не существует
    try {
      logChannel = await guild.channels.create({
        name: 'bot-logs',
        type: 'GUILD_TEXT',
        permissionOverwrites: [
          {
            id: client.user.id, // ID вашего бота
            allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel], // Разрешения бота
          },
          {
            id: serverOwnerID, // ID создателя сервера
            allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel], // Разрешения создателя сервера
          },
          {
            id: guild.id, // ID гильдии
            deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel], // Запрет на отправку сообщений и просмотр канала для всех остальных
          },
        ],
      });
      console.log('Канал для логов создан.');
    } catch (error) {
      console.error('Ошибка при создании канала для логов:', error);
    }
  } else {
    console.log('Канал для логов найден.');
  }
});
// Логирование событий
async function logEvent(title, description, color = 'BLUE') {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
  if (logChannel) {
    logChannel.send({ embeds: [embed] });
  }
}

// Обработка новых участников
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) { // Проверка, является ли участник ботом
    try {
      await member.kick(); // Удаление бота
      logEvent('Новый бот', `Бот ${member.user.tag} был удален.`);
    } catch (error) {
      console.error(`Ошибка при удалении бота: ${error}`);
    }
  } else {
    // ... ваша логика для обработки новых пользователей
  }
});

// Обработка удаления новых ролей
client.on('roleCreate', async (role) => {
  // Проверка, создал ли роль создатель сервера
  if (role.guild.ownerId !== serverOwnerID) {
    try {
      await role.delete(); // Удаление роли
      logEvent('Новая роль', `Роль ${role.name} была удалена.`);
    } catch (error) {
      console.error(`Ошибка при удалении роли: ${error}`);
    }
  }
});

// Обработка удаления новых каналов
client.on('channelCreate', async (channel) => {
  // Проверка, создал ли канал создатель сервера
  if (channel.guild.ownerId !== serverOwnerID) {
    try {
      await channel.delete(); // Удаление канала
      logEvent('Новый канал', `Канал ${channel.name} был удален.`);
    } catch (error) {
      console.error(`Ошибка при удалении канала: ${error}`);
    }
  }
});

// Обработка сообщений
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Игнорируем сообщения ботов

  // Проверка на ссылки
  if (message.content.includes('http') || message.content.includes('www.')) {
    const url = message.content.match(/(https?:\/\/[^\s]+)/g)?.[0];
    if (url) {
      const domain = new URL(url).hostname; // Получение домена
      if (!allowedDomains.includes(domain)) { // Проверка разрешенного домена
        try {
          await message.delete(); // Удаление сообщения
          await message.author.send('Ссылки на этом сервере запрещены.');
          await message.member.ban({ reason: 'Непроверенная ссылка' }); // Баним пользователя
          logEvent('Непроверенная ссылка', `Пользователь ${message.author.tag} забанен за отправку непроверенной ссылки.`);
        } catch (error) {
          console.error(`Ошибка при обработке непроверенной ссылки: ${error}`);
        }
      }
    }
  }
});

client.login(token);
