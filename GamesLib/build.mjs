import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/gameslib.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'gameslib',
  outfile: 'dist/gameslib.js',
  minify: !isWatch,
  sourcemap: isWatch,
  target: ['es2020'],
  define: {
    WS_DEV_URL: isWatch ? '"ws://localhost:3000/"' : '""'
  }
};

if (isWatch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Watching GamesLib...');
} else {
  await esbuild.build(options);
}
