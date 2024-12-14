const esbuild = require('esbuild');
const { copy } = require('esbuild-plugin-copy');

esbuild.build({
  entryPoints: [
    '/background.ts',
    '/popup.ts',
    '/dashboard.ts'
  ],
  bundle: true,
  outdir: 'dist/js',
  format: 'esm',
  target: 'es2020',
  platform: 'browser',
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
  plugins: [
    copy({
      resolveFrom: 'cwd',
      assets: {
        from: ['src/images/*'],
        to: ['dist/images'],
      },
    }),
    copy({
      resolveFrom: 'cwd',
      assets: {
        from: ['src/css/*'],
        to: ['dist/css'],
      },
    }),
    copy({
      resolveFrom: 'cwd',
      assets: {
        from: ['src/*.html', 'src/manifest.json'],
        to: ['dist'],
      },
    }),
  ],
}).catch(() => process.exit(1));
