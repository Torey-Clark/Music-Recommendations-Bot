/**
 * This file is used to update the slash commands of this bot.
 */
require('dotenv').config();

const { REST, Routes } = require('discord.js');

const fs = require('node:fs');
const logger = require('./utils/logger');

const commands = [];
// Grab all command files from the commands directory
const commandFiles = fs.readdirSync('./commands').filter((file) => {
    return file.endsWith('.js');
});

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST modules
const rest = new REST({
    version: '10',
}).setToken(process.env.BOT_TOKEN);

// Deploy the commands
(async () => {
    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            {
                body: commands,
            },
        );

        logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        logger.info(error);
    }
})();
