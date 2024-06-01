const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const youtube = require('youtube-search-api');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const prefix = '/';
const token = '35e856c93e5265e2e134c5202377af44fa0cfea0896269a8c6b6ea35c1a2876e';

let connection;
let player;

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        if (!args.length) {
            return message.channel.send('Você precisa fornecer o nome ou URL de uma música do YouTube!');
        }
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.channel.send('Você precisa estar em um canal de voz para tocar música!');
        }

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                connection.destroy();
                connection = null;
            });
        }

        let url = args[0];
        if (!ytdl.validateURL(url)) {
            // Se não for um URL válido do YouTube, faça uma busca na API do YouTube
            const searchResult = await youtube.GetListByKeyword(args.join(' '), false);
            if (searchResult.items.length === 0) {
                return message.channel.send('Nenhuma música encontrada com essa descrição!');
            }
            url = `https://www.youtube.com/watch?v=${searchResult.items[0].id}`;
        }

        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);
        player = createAudioPlayer();

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            connection.disconnect();
            connection = null;
        });

        message.channel.send(`Tocando agora: ${url}`);
    } else if (command === 'disconnect') {
        if (connection) {
            connection.disconnect();
            connection = null;
            message.channel.send('Desconectado do canal de voz!');
        } else {
            message.channel.send('Eu não estou conectado a nenhum canal de voz!');
        }
    }
});

client.login(token);
