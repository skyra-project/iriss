import { registerCommands } from '#lib/utilities/register-commands';
import { envParseInteger, envParseString, setup } from '@skyra/env-utilities';
import { Client, container } from '@skyra/http-framework';
import { init, load } from '@skyra/http-framework-i18n';
import { setInvite, setRepository } from '@skyra/shared-http-pieces';
import '@skyra/shared-http-pieces/register';
import { createBanner } from '@skyra/start-banner';
import { yellow, bold, yellowBright } from 'colorette';
import { PrismaClient } from '@prisma/client';

container.prisma = new PrismaClient();

setRepository('iris');
setInvite('948377113457745990', '34359822400');

setup(new URL('../src/.env', import.meta.url));

await load(new URL('../src/locales', import.meta.url));
await init({ fallbackLng: 'en-US', returnNull: false, returnEmptyString: false });

const client = new Client();
await client.load();

void registerCommands();

const address = envParseString('HTTP_ADDRESS', '0.0.0.0');
const port = envParseInteger('HTTP_PORT', 3000);
await client.listen({ address, port });

console.log(
	createBanner({
		logo: [
			bold(yellowBright(String.raw`_________`)),
			bold(yellowBright(String.raw`\__   __/`)),
			yellowBright(String.raw`   ) (`),
			yellow(String.raw`   | |`),
			yellow(String.raw`   | |`),
			yellow(String.raw`   | |`),
			yellowBright(String.raw`___) (___`),
			bold(yellowBright(String.raw`\_______/`))
		],
		name: [
			bold(yellowBright(String.raw`d888888b d8888b. d888888b .d8888.`)),
			bold(yellowBright(String.raw`  '88'   88  '8D   '88'   88'  YP`)),
			yellowBright(String.raw`   88    88oobY'    88    '8bo.`),
			yellowBright(String.raw`   88    88'8b      88      'Y8b.`),
			yellow(String.raw`  .88.   88 '88.   .88.   db   8D`),
			yellow(String.raw`Y888888P 88   YD Y888888P '8888Y'`)
		],
		extra: [`Listening on ${address}:${port}`]
	})
);
