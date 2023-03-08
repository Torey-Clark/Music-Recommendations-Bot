const { Events } = require('discord.js');

const logger = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        logger.info(`Received interaction ${interaction}`);
        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            logger.warn(`No command matching ${interaction.commandName} was found.`);
            await interaction.reply(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.error(error);
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true,
            });
        }
    }
}