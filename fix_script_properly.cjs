const fs = require('fs');
let content = fs.readFileSync('src/components/ContentPanel.vue', 'utf8');

// The new, safe Vditor logic that avoids race conditions
const newVditorLogic = `

const vditorInstance = shallowRef(null)
let vditorReady = false

function initVditor() {
  if (currentFile.value?.type !== 'markdown') return
  
  if (vditorInstance.value) {
    try {
      vditorInstance.value.destroy()
    } catch(e) {}
    vditorInstance.value = null
  }
  
  vditorReady = false
  
  nextTick(() => {
    const el = document.getElementById('vditor')
    if (!el) return
    
    const isDark = localStorage.getItem('quill-theme') === 'dark'
    
    vditorInstance.value = new Vditor('vditor', {
      height: '100%',
      value: currentFile.value.content || '',
      mode: store.mdEditMode ? 'sv' : 'ir',
      cache: { enable: false },
      cdn: '/vditor',
      theme: isDark ? 'dark' : 'classic',
      preview: {
        theme: {
          current: isDark ? 'dark' : 'light'
        }
      },
      outline: {
        enable: true,
        position: 'left'
      },
      toolbar: [
        'headings', 'bold', 'italic', 'strike', '|',
        'line', 'quote', 'list', 'ordered-list', 'check', '|',
        'code', 'inline-code', 'link', 'table', '|',
        'undo', 'redo', '|',
        'edit-mode', 
        {
          name: 'more',
          toolbar: [
            'fullscreen', 'both', 'outline', 'export',
            'code-theme', 'content-theme'
          ],
        }
      ],
      after: () => {
        vditorReady = true
      },
      input: (val) => {
        if (currentFile.value && currentFile.value.type === 'markdown' && currentFile.value.content !== val) {
          currentFile.value.content = val
          currentFile.value.updatedAt = Date.now()
        }
      }
    })
  })
}

watch(() => currentFile.value?.id, (newId, oldId) => {
  if (newId === oldId) return
  if (currentFile.value?.type === 'markdown') {
    initVditor()
  } else if (vditorInstance.value) {
    try { vditorInstance.value.destroy() } catch(e){}
    vditorInstance.value = null
    vditorReady = false
  }
})

watch(() => store.mdEditMode, (newMode) => {
  if (currentFile.value?.type === 'markdown') {
    initVditor()
  }
})

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'data-theme' && vditorInstance.value && vditorReady) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      vditorInstance.value.setTheme(isDark ? 'dark' : 'classic', isDark ? 'dark' : 'light')
    }
  })
})

onMounted(() => {
  observer.observe(document.documentElement, { attributes: true })
  if (currentFile.value?.type === 'markdown') {
    initVditor()
  }
})

onUnmounted(() => {
  observer.disconnect()
  if (vditorInstance.value) {
    try { vditorInstance.value.destroy() } catch(e){}
    vditorInstance.value = null
    vditorReady = false
  }
})
`;

// Extract bad block
const startIndex = content.indexOf(`import Vditor from 'vditor'`);
if (startIndex !== -1) {
  const endIndexStr = `  if (vditorInstance.value) {\n    vditorInstance.value.destroy()\n    vditorInstance.value = null\n  }\n})`;
  const endIndex = content.indexOf(endIndexStr, startIndex);
  if (endIndex !== -1) {
    const fullEndIndex = endIndex + endIndexStr.length;
    const badBlock = content.substring(startIndex, fullEndIndex);
    content = content.substring(0, startIndex) + content.substring(fullEndIndex);
    console.log('Removed bad block.');
  } else {
    console.log('Could not find end of bad block.');
  }
} else {
  console.log('Could not find start of bad block.');
}

// Ensure imports are at top
if (!content.includes(`import Vditor from 'vditor'`)) {
  content = content.replace("from '../stores/useStore.js'", "from '../stores/useStore.js'\nimport Vditor from 'vditor'\nimport 'vditor/dist/index.css'");
}

// Append new logic at end of setup script
content = content.replace('</script>', newVditorLogic + '\n</script>');

fs.writeFileSync('src/components/ContentPanel.vue', content);
console.log('Saved ContentPanel.vue');
