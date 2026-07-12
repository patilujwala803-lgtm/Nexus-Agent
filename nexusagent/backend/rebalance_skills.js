import fs from 'fs';

const skills = [
  "writing", "research", "data", "code", "translation", 
  "summarization", "copywriting", "seo", "descriptions", 
  "editing", "fact-checking", "testing", "compliance", 
  "negotiation", "judging"
];

const filePath = 'e:/Nexus Agent/nexusagent/backend/src/economy/taskTemplates.ts';
let content = fs.readFileSync(filePath, 'utf-8');

let skillIndex = 0;
const newContent = content.replace(/requiredSkill:\s*"([^"]+)"/g, (match, p1) => {
  const skill = skills[skillIndex % skills.length];
  skillIndex++;
  return `requiredSkill: "${skill}"`;
});

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log(`Replaced ${skillIndex} requiredSkill fields evenly.`);
