import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({testDir:'./tests/browser',timeout:90000,expect:{timeout:30000},workers:1,retries:0,reporter:'list',use:{headless:true,launchOptions:existsSync(chrome)?{executablePath:chrome}:{},trace:'retain-on-failure'},webServer:[['web',4310],['contributor',4312],['lecturer',4313],['admin',4314]].map(([app,port])=>({command:`node scripts/start-preview.mjs ${app}`,url:`http://localhost:${port}${app==='web'?'/about':'/'}`,timeout:240000,reuseExistingServer:false}))});
