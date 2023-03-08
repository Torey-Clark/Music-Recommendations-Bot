const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const logger = require('../utils/logger');
const path = require('node:path');
const Spotify = require('spotify-web-api-node');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recommend')
        .setDescription('Ask for music recommendations.')
        .addSubcommand(subcommand =>
            subcommand.setName('artist')
                .setDescription('Ask for music recommendations based on an artist.')
                .addStringOption(option => 
                    option.setName('artist-1')
                        .setDescription('An artist from which to base the recommendations.')
                        .setRequired(true)
                ).addStringOption(option =>
                    option.setName('artist-2')
                        .setDescription('An artist from which to base the recommendations.')
                        .setRequired(false)
                ).addStringOption(option =>
                    option.setName('artist-3')
                        .setDescription('An artist from which to base the recommendations.')
                        .setRequired(false)
                ).addStringOption(option =>
                    option.setName('artist-4')
                        .setDescription('An artist from which to base the recommendations.')
                        .setRequired(false)
                ).addStringOption(option =>
                    option.setName('artist-5')
                        .setDescription('An artist from which to base the recommendations.')
                        .setRequired(false)
                ).addIntegerOption(option => 
                    option.setName('count')
                        .setDescription('The maximum number of recommendations to show.')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        ).addSubcommand(subcommand => 
            subcommand.setName('song')
                .setDescription('Ask for music recommendations based on a song.')
                .addStringOption(option => 
                    option.setName('song-1')
                        .setDescription('A song from which to base the recommendations.')
                        .setRequired(true)
                ).addStringOption(option => 
                    option.setName('song-2')
                        .setDescription('A song from which to base the recommendations.')
                        .setRequired(false)
                ).addStringOption(option => 
                    option.setName('song-3')
                        .setDescription('A song from which to base the recommendations.')
                        .setRequired(false)
                ).addStringOption(option => 
                    option.setName('song-4')
                        .setDescription('A song from which to base the recommendations.')
                        .setRequired(false)
                ).addStringOption(option => 
                    option.setName('song-5')
                        .setDescription('A song from which to base the recommendations.')
                        .setRequired(false)
                ).addIntegerOption(option => 
                    option.setName('count')
                        .setDescription('The maximum number of recommendations to show.')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        ),
    async execute(interaction) {
        logger.info(`Executing "recommend" command`);

        // Defer a reply since we need to make some HTTP requests
        await interaction.deferReply();

        // Prepate to connect to the Spotify API with our credentials.
        const api = new Spotify({
            clientId: process.env.SPOTIFY_ID,
            clientSecret: process.env.SPOTIFY_SECRET,
        });

        // Get the token our bot needs to access the API
        api.clientCredentialsGrant()
            .then((response) => {
                logger.info(`The access token expires in ${response.body['expires_in']}`);
                api.setAccessToken(response.body['access_token']);

                executeCommand(api, interaction);
            }).catch((error) => {
                logger.error(`Something went wrong when retrieving an access token. ${error.message}`);
                interaction.editReply(`Something went wrong. Please try again later.`);
            });
    }
}

/**
 * Executes the command
 * @param {SpotifyWebApi} api reference to the spotify web api
 * @param {CommandInteraction} interaction the interaction that trigged this command
 */
async function executeCommand(api, interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`Executing "${subcommand}" subcommand`);

    const recommendationLimit = interaction.options.getInteger('count') ?? 3;
    logger.debug(`Limiting recommendations to the top ${recommendationLimit} results.`);

    const searchOptions = {
        limit: 1,
    };
    const recommendationOptions = {
        limit: recommendationLimit,
    };

    if (subcommand === 'artist') {
        // Get the artist we need to search for
        const queries = [];
        for (let i = 1; i <= 5; i++) {
            const query = interaction.options.getString(`artist-${i}`);
            if (query) {
                queries.push(query);
            }
        }

        logger.debug({
            queries: queries
        }, `Artist list`);

        new Promise((resolve) => {
            const promises = [];
            // Create a promise for finding the id of each artist
            queries.forEach((artist, _index, _artists) => {
                promises.push(
                    api.searchArtists(artist, searchOptions)
                        .then(response => getArtistId(response))
                        .then(artistId => artistId)
                );
            });
            const artistIds = Promise.all(promises);
            return resolve(artistIds);
        }).then(artistIds => {
            recommendationOptions.seed_artists = artistIds;
            return api.getRecommendations(recommendationOptions);
        }).then(response => {
            sendRecommendations(response, interaction, recommendationLimit)
        }).catch(async (error) => {
            logger.error(`There was a problem getting some recommendations for ${query}. Error: ${error}`);
            interaction.editReply(`There was a problem finding some recommendations for you.`);
        });
    } else if (subcommand === 'song') {
        // Collect the songs that are the basis for the recommendations.
        const queries = [];
        for (let i = 1; i <= 5; i++) {
            const query = interaction.options.getString(`song-${i}`);
            if (query) {
                queries.push(query);
            }
        }

        logger.debug({
            queries: queries,
        }, `Song list`);

        new Promise((resolve) => {
            const promises = [];
            // Create a promise for finding the id for each song
            queries.forEach((song, _index, _songs) => {
                promises.push(
                    api.searchTracks(song, searchOptions)
                        .then(response => getSongId(response))
                        .then(songId => songId)
                );
            });
            const songIds = Promise.all(promises);
            return resolve(songIds);
        }).then(songIds => {
            recommendationOptions.seed_tracks = songIds;
            return api.getRecommendations(recommendationOptions);
        }).then(response => {
            sendRecommendations(response, interaction, recommendationLimit)
        }).catch((error) => {
            logger.error(`There was a problem getting some recommendations for ${query}. Error: ${error}`);
            interaction.editReply(`There was a problem finding some recommendations for you.`);
        });
    } else {
        logger.warn(`Cannot parse subcommand "${subcommand}"`);
        await interaction.editReply(`${subcommand} is not a valid option. Please choose on of the following: artist, song.`);
    }
}

/**
 * Gets the ID of the first artist from Spotify's response
 * @param {JSON} response the response object from Spotify's endpoint for searching for artists
 * @returns Promise
 */
function getArtistId(response) {
    // Return the artist or song ID
    return new Promise((resolve) => {
        logger.debug(`Response: ${JSON.stringify(response)}`);
        resolve(response.body.artists.items[0].id);
    });
}

/**
 * Gets the ID of the first song from Spotify's response
 * @param {JSON} response the response object from Spotify's endpoint for searching for songs
 * @returns Promise
 */
function getSongId(response) {
    // Return the artist or song ID
    return Promise.resolve(response.body.tracks.items[0].id);
}

/**
 * Sends the recommendations to the user.
 * @param {JSON} response the response object from Spotify's recommendations endpoint
 * @param {CommandInteraction} interaction the interation that triggered this command
 * @param {Integer} recommendationLimit the user requested limit of recommendations
 * @returns Promise
 */
function sendRecommendations(response, interaction, recommendationLimit) {
    let baseText = generateBaseText(interaction);

    const tracks = response.body.tracks;
    const totalFoundRecommendations = response.body.tracks.length;

    // Create the embeds
    const embeds = createEmbeds(tracks);

    if (totalFoundRecommendations === 0) {
        return interaction.editReply(`I couldn't find any recommendations for this ${subcommand}.`);
    }

    if (totalFoundRecommendations === recommendationLimit) {
        if (totalFoundRecommendations === 1) {
            return interaction.editReply({
                content: `${baseText}, here is a song you might enjoy.`,
                embeds: embeds,
            });
        }
        
        return interaction.editReply({
            content: `${baseText}, here are ${totalFoundRecommendations} songs for you to try.`,
            embeds: embeds,
        });
    }

    if (totalFoundRecommendations === 1) {
        return interaction.editReply({
            content: `${baseText}, I only found one song to recommend.`,
            embeds: embeds,
        });
    }

    return interaction.editReply({
        content: `${baseText}, I found ${totalFoundRecommendations} songs that are similar`,
        embeds: embeds,
    });
}

/**
 * Generates informative text that is included in the reply.
 * @param {CommandInteraction} interaction the interaction that triggered this command
 * @returns String
 */
function generateBaseText(interaction) {
    const subcommand = interaction.options.getSubcommand();
    let baseText = '';
    if (subcommand === 'artist' || subcommand === 'song') {
        baseText = `Based on the following ${subcommand}s: `;
        let optionName = `${subcommand}`;
        const options = [];
        for (let i = 1; i <= 5; i++) {
            const option = interaction.options.getString(`${optionName}-${i}`);
            if (option) {
                options.push(option);
            }
        }
        options.forEach((option, index, options) => {
            if (index === options.length - 1) {
                baseText += `and ${option}`;
            } else {
                baseText += `${option}, `
            }
        });
    } else {
        baseText = `Based on the options you gave`;
        logger.debug(`recommend-music::sendRecommendations(response = ${response}, interaction = ${interaction}, recommendationLimit = ${recommendationLimit}) | Cannot generate base text for the subcommand ${subcommand}`);
    }

    return baseText;
}

/**
 * Creates the embeds that are sent with the reply.
 * @param {Array} tracks a list a tracks
 * @returns Array - a list of embeds
 */
function createEmbeds(tracks) {
    const embeds = [];
    tracks.forEach((track, index, _tracks) => {
        // Get the track duration for the embed
        const durationMinutes = Math.floor(track.duration_ms / (60 * 1000));
        const durationSeconds = Math.floor(track.duration_ms / 1000 % 60);

        // Get the smallest image for the embed image
        logger.debug(`Building embed #${index + 1}`);
        let smallestImage;
        track.album.images.forEach((image, _index, _images) => {
            if (
                smallestImage === undefined ||
                smallestImage['height'] * smallestImage['width'] > image['height'] * image['width']
            ) {
                smallestImage = image;
            }
        });
        logger.debug(`Smallest image is h:${smallestImage['height']} x w:${smallestImage['width']}`);

        const embed = new EmbedBuilder()
            .setColor('Random')
            .setTitle(track.name)
            .setURL(track.external_urls.spotify)
            .setImage(track.album.images[0].url)
            .setAuthor({
                name: track.artists[0].name,
            }).setDescription(`Listen to ${track.name} on Spotify.`)
            .setThumbnail()
            .addFields({
                name: 'Artist',
                value: track.artists[0].name,
            }, {
                name: 'Album',
                value: track.album.name,
            }, {
                name: 'Length',
                value: `${durationMinutes}:${durationSeconds}`,
            }).setTimestamp();
        embeds.push(embed);
    });

    return embeds;
}