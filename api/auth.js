import crypto from 'node:crypto';
import { hasAuthConfiguration, hasValidSession, setSessionCookie, clearSessionCookie } from '../lib/serverAuth.js';
function safeEqual(a,b){const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));return left.length===right.length&&crypto.timingSafeEqual(left,right);}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'){
  const configured=hasAuthConfiguration();
  const reportsConfigured=Boolean(process.env.AZURE_COSMOS_ENDPOINT&&process.env.AZURE_COSMOS_KEY&&process.env.AZURE_COSMOS_DATABASE&&process.env.AZURE_COSMOS_CONTAINER);
  return res.status(200).json({configured,authenticated:configured&&hasValidSession(req),geminiConfigured:Boolean(process.env.GEMINI_API_KEY),reportsConfigured,missing:[...(!process.env.INSIGHTBOARD_APP_PASSWORD?['INSIGHTBOARD_APP_PASSWORD']:[]),...(!process.env.INSIGHTBOARD_SESSION_SECRET?['INSIGHTBOARD_SESSION_SECRET']:[]),...(!process.env.GEMINI_API_KEY?['GEMINI_API_KEY']:[])]});
 }
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body||'{}');}catch{return res.status(400).json({error:'Invalid JSON request body.'});}}body=body||{};
 if(body.action==='logout'){clearSessionCookie(req,res);return res.status(200).json({configured:hasAuthConfiguration(),authenticated:false});}
 if(!hasAuthConfiguration())return res.status(503).json({error:'Set INSIGHTBOARD_APP_PASSWORD and INSIGHTBOARD_SESSION_SECRET in Vercel first.'});
 if(!safeEqual(body.password,process.env.INSIGHTBOARD_APP_PASSWORD))return res.status(401).json({error:'Incorrect project access password.'});
 setSessionCookie(req,res);
 return res.status(200).json({configured:true,authenticated:true,geminiConfigured:Boolean(process.env.GEMINI_API_KEY),reportsConfigured:Boolean(process.env.AZURE_COSMOS_ENDPOINT&&process.env.AZURE_COSMOS_KEY&&process.env.AZURE_COSMOS_DATABASE&&process.env.AZURE_COSMOS_CONTAINER)});
}
