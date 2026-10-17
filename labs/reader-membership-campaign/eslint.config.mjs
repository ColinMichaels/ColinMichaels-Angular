import {fixupConfigRules} from '@eslint/compat';
import {config} from '@remotion/eslint-config-flat';

// Preserve Remotion and React rules while adapting legacy plugin APIs to ESLint 10.
export default fixupConfigRules(config);
