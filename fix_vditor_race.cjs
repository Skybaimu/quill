const fs = require('fs');
let content = fs.readFileSync('src/components/ContentPanel.vue', 'utf8');

// We will replace the entire vditor logic block with a safer, race-condition-free version
const newVditorLogic = `
import Vditor from 'vditor'
import 'vditor/dist/index.css'

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

// Extract the old logic.
// The old logic starts with "import Vditor from 'vditor'" and ends with "  }\n})\n"
// We will simply use regex to replace it.
const regex = /import Vditor from 'vditor'[\s\S]*?vditorInstance\.value = null\n  }\n}\)/;
content = content.replace(regex, newVditorLogic.trim());

fs.writeFileSync('src/components/ContentPanel.vue', content);
console.log('Fixed vditor logic safely.');
