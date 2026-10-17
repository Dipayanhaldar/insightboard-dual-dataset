import crypto from 'node:crypto';
import { requireSession } from '../lib/serverAuth.js';
function getCosmosConfig(){const endpoint=process.env.AZURE_COSMOS_ENDPOINT?.replace(/\/+$/,'');const key=process.env.AZURE_COSMOS_KEY;const database=process.env.AZURE_COSMOS_DATABASE||'insightboard';const container=process.env.AZURE_COSMOS_CONTAINER||'reports';return endpoint&&key?{endpoint,key,database,container}:null;}
async function cosmosRequest(config,method,resourceType,resourceLink,path,body,extraHeaders={}){
 const date=new Date().toUTCString();const signingText=method.toLowerCase()+'\n'+resourceType.toLowerCase()+'\n'+resourceLink.toLowerCase()+'\n'+date.toLowerCase()+'\n\n';
 const signature=crypto.createHmac('sha256',Buffer.from(config.key,'base64')).update(signingText).digest('base64');const authorization=encodeURIComponent('type=master&ver=1.0&sig='+signature);
 const response=await fetch(config.endpoint+'/'+path,{method,headers:{Authorization:authorization,'x-ms-date':date,'x-ms-version':'2018-12-31',Accept:'application/json',...extraHeaders},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json().catch(()=>({}));if(!response.ok){const detail=result?.message||result?.Message||('Azure Cosmos DB returned HTTP '+response.status+'.');throw new Error(detail.slice(0,350));}return result;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});if(!requireSession(req,res))return;
 const config=getCosmosConfig();if(!config)return res.status(503).json({error:'Saved report history is not configured. Add AZURE_COSMOS_ENDPOINT and AZURE_COSMOS_KEY in Vercel.'});
 const resourceLink='dbs/'+config.database+'/colls/'+config.container;const documentPath=resourceLink+'/docs';
 try{
  if(req.method==='POST'){
   let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body||'{}');}catch{return res.status(400).json({error:'Invalid JSON request body.'});}}
   const answer=typeof body?.answer==='string'?body.answer.trim().slice(0,8000):'';if(!answer)return res.status(400).json({error:'A non-empty AI summary is required.'});
   const doc={id:crypto.randomUUID(),ownerId:'insightboard',createdAt:new Date().toISOString(),datasetName:String(body.datasetName||'Dataset').slice(0,150),question:String(body.question||'').slice(0,1200),answer,metrics:body.metrics&&typeof body.metrics==='object'?body.metrics:{}};
   const result=await cosmosRequest(config,'POST','docs',resourceLink,documentPath,doc,{'Content-Type':'application/json','x-ms-documentdb-partitionkey':JSON.stringify(['insightboard'])});
   return res.status(201).json({saved:true,report:result});
  }
  const querySpec={query:'SELECT TOP 25 c.id, c.ownerId, c.createdAt, c.datasetName, c.question, c.answer, c.metrics FROM c WHERE c.ownerId = @ownerId ORDER BY c.createdAt DESC',parameters:[{name:'@ownerId',value:'insightboard'}]};
  const result=await cosmosRequest(config,'POST','docs',resourceLink,documentPath,querySpec,{'Content-Type':'application/query+json','x-ms-documentdb-isquery':'True','x-ms-documentdb-query-enablecrosspartition':'True','x-ms-documentdb-partitionkey':JSON.stringify(['insightboard'])});
  return res.status(200).json({reports:result.Documents||[]});
 }catch(error){return res.status(502).json({error:'Report storage error: '+String(error.message||error).slice(0,300)+' Check the database, container and partition key (/ownerId).'});}
}
