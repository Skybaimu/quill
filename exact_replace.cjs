const fs = require('fs');

const lines = fs.readFileSync('src/components/ContentPanel.vue', 'utf8').split('\n');

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

// Remove lines 233 to 339 (0-indexed: 232 to 338)
// Wait, 339 is line index 338. So we delete (338 - 232 + 1) = 107 lines.
lines.splice(232, 107);

// Now find </script> and insert
let scriptEndIndex = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim() === "</script>") {
    scriptEndIndex = i;
    break;
  }
}

if (scriptEndIndex !== -1) {
  lines.splice(scriptEndIndex, 0, newVditorLogic);
  fs.writeFileSync('src/components/ContentPanel.vue', lines.join('\\n'));
  console.log("Success!");
} else {
  console.log("Failed to find </script>");
}
