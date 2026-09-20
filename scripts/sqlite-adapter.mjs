import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
export function database(filename=':memory:'){
const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON');
sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations(name TEXT PRIMARY KEY)');
for(const name of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())if(!sqlite.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)){sqlite.exec(fs.readFileSync('drizzle/'+name,'utf8'));sqlite.prepare('INSERT INTO local_migrations VALUES(?)').run(name)}
return {sqlite,prepare(sql){let args=[];const command={bind(...values){args=values;return command},async all(){const results=sqlite.prepare(sql).all(...args);return {results,success:true}},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){return sqlite.prepare(sql).run(...args)}};return command}}}
