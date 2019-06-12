import { rollup } from '../../../config/rollup.config';

export default rollup({
  name: 'hoc',
  extraGlobals: {
    '@apollo/react-components': 'apolloReactComponents'
  }
});
