require('dotenv').config();

const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const logger = require('./utils/logger');

const client = new Client({
    intents: [
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.on(Events.Debug, (msg) => {
    logger.debug(msg);
}).on(Events.Warn, (msg) => {
    logger.warn(msg);
}).on(Events.Error, (msg) => {
    logger.error(msg);
});

process.on('unhandledRejection', error => {
    logger.error(`Unhandled promise rejection ${JSON.stringify(error)}`);
})

client.login(process.env.BOT_TOKEN);

// Collect the commands
client.commands = new Collection();
const commandsPath = path.resolve('commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => {
    return file.endsWith('.js');
});
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        logger.debug(`Adding command ${command.data.name}`);
        client.commands.set(command.data.name, command);
    } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Collect the events
const eventsPath = path.resolve('events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => {
    return file.endsWith('.js');
});
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => {
            event.execute(...args);
        });
    } else {
        client.on(event.name, (...args) => {
            event.execute(...args);
        });
    }
}