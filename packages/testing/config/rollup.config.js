import { rollup } from '../../../config/rollup.config';

export default rollup({
  name: 'testing',
  extraGlobals: {
    optimism: 'wrap'
  }
});
