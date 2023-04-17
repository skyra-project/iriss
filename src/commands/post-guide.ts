import { BrandingColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getRegisteredCommand } from '#lib/utilities/command-permissions';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, channelMention, chatInputApplicationCommandMention, userMention } from '@discordjs/builders';
import { isNullish } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import { Command, RegisterCommand, type TransformedArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, getSupportedLanguageT, getSupportedUserLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import { ButtonStyle, MessageFlags } from 'discord-api-types/v10';

const Root = LanguageKeys.Commands.PostGuide;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, Root.RootName, Root.RootDescription)
		.addBooleanOption((option) => applyLocalizedBuilder(option, Root.OptionsHide))
		.addUserOption((option) => applyLocalizedBuilder(option, Root.OptionsTarget))
		.setDMPermission(false)
)
export class UserCommand extends Command {
	private suggestId: string | null = null;

	public override async chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		const command = chatInputApplicationCommandMention('suggest', (this.suggestId ??= (await getRegisteredCommand('suggest')).id));
		const hide = options.hide ?? isNullish(options.target);

		const settings = await this.container.prisma.guild.findFirst({ where: { id: BigInt(interaction.guildId!) }, select: { channel: true } });
		if (!settings?.channel) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewNotConfigured);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const t = hide ? getSupportedUserLanguageT(interaction) : getSupportedLanguageT(interaction);
		const content = hide || !options.target ? undefined : userMention(options.target.user.id);
		const description = t(Root.Message, {
			command,
			channel: channelMention(settings.channel.toString()),
			bot: userMention(envParseString('DISCORD_CLIENT_ID'))
		});
		const embed = new EmbedBuilder().setColor(BrandingColors.Primary).setDescription(description);
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId('suggestions-create').setLabel(t(Root.ButtonSubmit)).setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setURL('https://discord.gg/6gakFR2').setLabel(t(Root.ButtonSupport)).setStyle(ButtonStyle.Link)
		);
		return interaction.reply({ content, embeds: [embed.toJSON()], components: [row.toJSON()], flags: hide ? MessageFlags.Ephemeral : undefined });
	}
}

interface Options {
	hide?: boolean;
	target?: TransformedArguments.User;
}
