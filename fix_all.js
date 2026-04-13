const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

// target app and components directories
const targets = [
  path.join(__dirname, 'app'),
  path.join(__dirname, 'components'),
  path.join(__dirname, 'lib')
];

targets.forEach(dir => {
  walkDir(dir, function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let newContent = content
        // Roles replacement
        .replace(/\['admin', 'moderator', 'owner'\]/g, "['admin', 'jd', 'md']")
        .replace(/\['moderator', 'owner'\]/g, "['admin', 'jd', 'md']")
        // Name replacement
        .replace(/hospitalName:\s*"MCH"/g, 'hospitalName: "Mother Care Hospital"')
        .replace(/hospitalName:\s*"Mothers Care Hospital"/g, 'hospitalName: "Mother Care Hospital"')
        .replace(/>\s*MCH\s*<\/div>/g, '>Mother Care Hospital</div>')
        .replace(/alt="MCH Logo"/g, 'alt="Mother Care Hospital Logo"');
      
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  });
});

console.log('Fix script completed.');
