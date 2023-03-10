import { setup } from '#lib/setup/all';
import { registerCommands } from '#lib/utilities/register-commands';
import { envParseInteger, envParseString } from '@skyra/env-utilities';
import { Client, container } from '@skyra/http-framework';
import { init, load } from '@skyra/http-framework-i18n';
import { createBanner } from '@skyra/start-banner';
import gradient from 'gradient-string';

setup();

await load(new URL('../src/locales', import.meta.url));
await init({ fallbackLng: 'en-US', returnNull: false, returnEmptyString: false });

const client = new Client();
await client.load();

void registerCommands();

const address = envParseString('HTTP_ADDRESS', '0.0.0.0');
const port = envParseInteger('HTTP_PORT', 3000);
await client.listen({ address, port });

console.log(
	gradient.morning.multiline(
		createBanner({
			logo: [
				String.raw`       ^ `,
				String.raw`      /A\ `,
				String.raw`     //I\\ `,
				String.raw`    ///I\\\ `,
				String.raw`   ////I\\\\ `,
				String.raw`  /////I\\\\\ `,
				String.raw` //////I\\\\\\ `,
				String.raw`  '////I\\\\' `,
				String.raw`    '//I\\' `,
				String.raw`      'I' `,
				''
			],
			name: [
				String.raw`d888888b d8888b. d888888b .d8888. .d8888.`,
				String.raw`  '88'   88  '8D   '88'   88'  YP 88'  YP`,
				String.raw`   88    88oobY'    88    '8bo.   '8bo.`,
				String.raw`   88    88'8b      88      'Y8b.   'Y8b.`,
				String.raw`  .88.   88 '88.   .88.   db   8D db   8D`,
				String.raw`Y888888P 88   YD Y888888P '8888Y' '8888Y'`
			],
			extra: [
				'',
				`Loaded: ${container.stores.get('commands').size} commands`,
				`      : ${container.stores.get('interaction-handlers').size} interaction handlers`,
				`Listening: ${address}:${port}`
			]
		})
	)
);
container.logger.info('Ready');
