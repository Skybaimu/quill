const fs = require('fs');
let content = fs.readFileSync('src/components/ContentPanel.vue', 'utf8');

// The block we want to match and remove from the top
const regex = /import Vditor from 'vditor'[\s\S]*?vditorReady = false\n  }\n}\)/;

const match = content.match(regex);
if (match) {
  const block = match[0];
  content = content.replace(block, ''); // Remove from top
  
  // Keep the imports at the top
  const imports = `import Vditor from 'vditor'\nimport 'vditor/dist/index.css'`;
  content = content.replace("from '../stores/useStore.js'", "from '../stores/useStore.js'\n" + imports);
  
  // Remove the imports from the block
  const logic = block.replace(imports, '').trim();
  
  // Put the logic at the end of the script
  content = content.replace('</script>', logic + '\n</script>');
  
  fs.writeFileSync('src/components/ContentPanel.vue', content);
  console.log('Successfully moved to the bottom!');
} else {
  console.error('Could not find the block to move!');
}
