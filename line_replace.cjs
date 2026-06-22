const fs = require('fs');

// Read the file line by line
const lines = fs.readFileSync('src/components/ContentPanel.vue', 'utf8').split('\n');

// The safe new logic
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

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith("const vditorInstance = shallowRef(null)")) {
    startIndex = i;
  }
  if (startIndex !== -1 && i > startIndex) {
    if (lines[i] === "    vditorInstance.value = null" && lines[i+1] === "  }" && lines[i+2] === "})") {
      endIndex = i + 2;
      break;
    }
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  // Remove the old block
  lines.splice(startIndex, endIndex - startIndex + 1);
  
  // Find </script>
  let scriptEndIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === "</script>") {
      scriptEndIndex = i;
      break;
    }
  }
  
  if (scriptEndIndex !== -1) {
    // Insert new logic BEFORE </script>
    lines.splice(scriptEndIndex, 0, newVditorLogic);
    fs.writeFileSync('src/components/ContentPanel.vue', lines.join('\\n'));
    console.log("Successfully moved vditor logic safely via lines.");
  } else {
    console.log("Could not find </script>");
  }
} else {
  console.log("Could not find start/end bounds.");
}
