/**
 * Side-effect module: loads the workspace-root .env into process.env BEFORE
 * any module that calls @t3-oss/env-core is imported. Must be the FIRST
 * import in every db script so the side-effect runs first.
 *
 * Why a separate module? ESM hoists all imports, then runs top-level
 * statements in source order. Calling `dotenv.config()` as a top-level
 * statement runs too late — `@goldspire/config/env` has already read
 * process.env by then and frozen the defaults. Module side-effects, on the
 * other hand, run during the import phase in source order, so this file
 * runs before any subsequent `import` line in the consumer.
 */
import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';

loadDotenv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });
