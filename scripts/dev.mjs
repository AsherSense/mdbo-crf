import http from 'node:http';
import worker from '../dist/server/index.js';
import { database } from './sqlite-adapter.mjs';
const DB=database('.local.sqlite');
http.createServer(async(req,res)=>{const url='http://127.0.0.1:4173'+req.url;const chunks=[];for await(const b of req)chunks.push(b);const response=await worker.fetch(new Request(url,{method:req.method,headers:{...req.headers,'oai-authenticated-user-id':'local-test-user','oai-authenticated-user-email':'test@example.invalid'},body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}),{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}).listen(4173,'127.0.0.1',()=>console.log('Local test only: http://127.0.0.1:4173'));
