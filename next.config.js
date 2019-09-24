const withCSS = require('@zeit/next-css')

module.exports = withCSS({
  cssModules: true,
  webpack: function(config) {
    return config
  }
})

// // const withSass = require('@zeit/next-sass')
// const withLess = require('@zeit/next-less')

// const isProd = process.env.NODE_ENV === 'production'

// // fix: prevents error when .less files are required by node
// if (typeof require !== 'undefined') {
//   require.extensions['.less'] = file => { }
// }

// module.exports = withLess({
//   cssModules: true,
//   cssLoaderOptions: {
//     importLoaders: 1,
//     localIdentName: "[local]___[hash:base64:5]"
//   }
// })


// const nextConfig = {
//   webpack: (config, { isServer }) => {
//     if (isServer) {
//       const antStyles = /antd\/.*?\/style\/css.*?/;
//       const origExternals = [...config.externals];
//       config.externals = [ // eslint-disable-line
//         (context, request, callback) => { // eslint-disable-line
//           if (request.match(antStyles)) return callback();
//           if (typeof origExternals[0] === 'function') {
//             origExternals[0](context, request, callback);
//           } else {
//             callback();
//           }
//         },
//         ...(typeof origExternals[0] === 'function' ? [] : origExternals),
//       ];

//       config.module.rules.unshift({
//         test: antStyles,
//         use: 'null-loader',
//       });
//     }
//     return config;
//   },
// };