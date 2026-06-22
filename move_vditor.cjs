const fs = require('fs');
let content = fs.readFileSync('src/components/ContentPanel.vue', 'utf8');

const vditorLogic = `
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const vditorInstance = shallowRef(null)

function initVditor() {
  if (currentFile.value?.type !== 'markdown') return
  nextTick(() => {
    const el = document.getElementById('vditor')
    if (!el) return
    
    // Check if the current theme is dark
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
      input: (val) => {
        if (currentFile.value && currentFile.value.content !== val) {
          currentFile.value.content = val
          currentFile.value.updatedAt = Date.now()
        }
      }
    })
  })
}

watch(() => currentFile.value?.type, (newType) => {
  if (newType !== 'markdown' && vditorInstance.value) {
    vditorInstance.value.destroy()
    vditorInstance.value = null
  } else if (newType === 'markdown' && !vditorInstance.value) {
    initVditor()
  }
})

watch(() => currentFile.value?.content, (newContent) => {
  if (currentFile.value?.type !== 'markdown') return
  
  if (!vditorInstance.value) {
    initVditor()
  } else if (vditorInstance.value.getValue() !== newContent) {
    vditorInstance.value.setValue(newContent || '')
  }
})

watch(() => store.mdEditMode, (newMode) => {
  if (currentFile.value?.type === 'markdown' && vditorInstance.value) {
    const content = vditorInstance.value.getValue()
    if (currentFile.value.content !== content) {
      currentFile.value.content = content
      currentFile.value.updatedAt = Date.now()
    }
    vditorInstance.value.destroy()
    vditorInstance.value = null
    initVditor()
  }
})

// Listen to theme changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'data-theme' && vditorInstance.value) {
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
    vditorInstance.value.destroy()
    vditorInstance.value = null
  }
})
`;

// Extract imports from vditorLogic and place them at the top
const importsToKeepAtTop = `import Vditor from 'vditor'\nimport 'vditor/dist/index.css'`;
const logicToMove = vditorLogic.replace(importsToKeepAtTop, '');

// First, safely remove the old vditorLogic block
content = content.replace(vditorLogic, '');

// Wait, the new logic needs to go at the END of </script> or just before it.
// Also the imports need to stay at the top.
// Wait, if we completely replace vditorLogic with '', the imports are also gone.
// So let's insert the imports right after useStore.js import
content = content.replace(/from '\.\.\/stores\/useStore\.js'/, "from '../stores/useStore.js'\n" + importsToKeepAtTop);

// Then insert the logic just before </script>
content = content.replace('</script>', logicToMove + '\n</script>');

fs.writeFileSync('src/components/ContentPanel.vue', content);
console.log('Moved successfully!');
