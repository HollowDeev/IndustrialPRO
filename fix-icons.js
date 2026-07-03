const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('material-symbols-outlined')) {
    // Add notranslate class
    let newContent = content.replace(/material-symbols-outlined(?!\s+notranslate)/g, 'material-symbols-outlined notranslate');
    
    // Also add translate="no" to the tag if it's a span or i. This is a bit trickier with regex but we can do a naive replace:
    // We will just rely on the notranslate class, which is fully supported by Google Translate.
    
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      modifiedCount++;
      console.log('Fixed:', file);
    }
  }
});

console.log('Total files fixed:', modifiedCount);
