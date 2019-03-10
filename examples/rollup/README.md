# rollup-example

Example application using essential Apollo Client and React Apollo packages, bundled with [Rollup](https://rollupjs.org) in the best ways we know how.

The goal of this application is to get a precise, real-world measurement of the total bundle footprint of essential Apollo packages, using a modern bundler, including the weight of dependencies (but excluding `react` and `react-dom`), while also taking into account the overlap between shared dependencies, which is not possible with per-package tools like [bundlephobia.com](https://bundlephobia.com/result?p=apollo-client@2.5.1).

If you run
```bash
cd react-apollo/examples/rollup
npm install
npm run analyze
```
in this application, [`source-map-explorer`](http://npmjs.org/package/source-map-explorer) will show you a breakdown of everything in the bundle that we think should be attributed to using Apollo Client and React Apollo.

When this app was first created, the total stood at about 143KB (minified but *not* compressed with gzip, since that's how `source-map-explorer` works). After gzip, the total was 39KB.

Of that 143KB, `apollo-client` is the biggest single offender, at 39.5KB, followed closely by `graphql`, at 31.6KB. If we included `react-dom`, it would weigh in at 106KB, but there's not much we can do about that, so we don't bother measuring it. By contrast, Apollo can pick and choose what it imports from the `graphql` package, so the `graphql` package is worth measuring, even though it's not maintained by Apollo.

We welcome anyone and everyone to examine the measurement methodology we're using here, because early feedback about any inaccuracies will make this application much more useful for deciding where and how to invest future bundle reduction energy.

Likewise, we hope the analysis produced by this application will inspire grounded discussion of potential bundle reduction strategies, in addition to helping validate them. Please see [issue #2743](https://github.com/apollographql/react-apollo/issues/2743) for more details about that effort.
