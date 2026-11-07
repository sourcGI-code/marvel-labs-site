import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
// Use an installed esbuild: node --import ... or pass its module path as the argument.
const esbuild=await import(process.argv[2]||'esbuild');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=JSON.parse(await readFile(path.join(root,'tools/site-styles.json'),'utf8'));
let css='';for(const entry of files)css+='\n'+(entry.inline||await readFile(path.join(root,entry.file),'utf8'));
css=css.replaceAll('assets/lato-regular.woff2','assets/lato-latin-regular.woff2').replaceAll('assets/lato-bold.woff2','assets/lato-latin-bold.woff2');
const result=await esbuild.transform(css,{loader:'css',minify:true,target:['chrome109','edge109','safari16'],legalComments:'none'});
await writeFile(path.join(root,'site-main.css'),result.code);
console.log(`Combined ${files.length} style sources into ${result.code.length} bytes.`);
