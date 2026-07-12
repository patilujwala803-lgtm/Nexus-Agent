import fs from 'fs';

const filePath = 'e:/Nexus Agent/nexusagent/backend/src/economy/taskTemplates.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace taskVariant: "court" or "guild" or "subcontract" with "normal"
content = content.replace(/taskVariant:\s*"(court|guild|subcontract)"/g, 'taskVariant: "normal"');

// Remove forceCourt, forceGuild, forceSubcontract lines
content = content.replace(/\s*forceCourt:\s*true,?/g, '');
content = content.replace(/\s*forceGuild:\s*true,?/g, '');
content = content.replace(/\s*forceSubcontract:\s*true,?/g, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Sanitized taskTemplates.ts variants and forced flags.');
