import { container } from '@skyra/http-framework';
import { Logger } from '@skyra/logger';

container.logger = new Logger();

declare module '@sapphire/pieces' {
	interface Container {
		logger: Logger;
	}
}
