const fs = require('fs');

const filePath = 'src/components/ContentPanel.vue';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove TOC button
const tocBtnPattern = /^\s*<button class="action-btn" v-if="currentFile\.type === 'markdown' && \(!isPwdFile \|\| isGlobalUnlocked\(\)\) && mdToc\.length > 0 && !store\.mdEditMode" @click="store\.mdTocCollapsed = !store\.mdTocCollapsed" :title="store\.mdTocCollapsed \? '展开大纲' : '收起大纲'">[\s\S]*?大纲\s*<\/button>\n/m;
content = content.replace(tocBtnPattern, '');

// 2. Replace md-wrapper
const mdWrapperPattern = /(<!-- Markdown file -->\s*<template v-else-if="currentFile\.type === 'markdown'">)\s*<div class="md-wrapper"[\s\S]*?<\/div>\s*<\/template>/;
const vditorReplacement = `$1\n        <div id="vditor" class="vditor-container" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; width: 100%; min-height: 0;"></div>\n      </template>`;
content = content.replace(mdWrapperPattern, vditorReplacement);

// 3. Add vditor imports and logic right after the useStore import
const scriptStartPattern = /(} from '\.\.\/stores\/useStore\.js')/;
const vditorLogic = `$1
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
})`;
content = content.replace(scriptStartPattern, vditorLogic);

// 4. Clean up mdToc
content = content.replace(/ && mdToc\.length > 0/g, '');

const lines = content.split('\\n');
let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Start skipping at marked import
  if (line.includes("import { marked } from 'marked'")) {
    skip = true;
    newLines.push("import hljs from 'highlight.js'");
    newLines.push("import 'highlight.js/styles/atom-one-dark.css'");
    newLines.push("import { open } from '@tauri-apps/plugin-shell'");
    continue;
  }
  
  if (skip) {
    // End skipping at markedHighlight block end
    if (line.trim() === '}') {
       if (lines[i+1] && lines[i+1].trim() === '}))') {
          // This is the end of markedHighlight
       }
    }
    if (line.trim() === '}))' && lines[i-1] && lines[i-1].trim() === '}') {
      skip = false;
      continue;
    }
    // Also skip the marked rendering logic (lines 485 to 658 approx)
    continue;
  }
  
  // Skip the Markdown rendering blocks
  if (line.trim() === '// Markdown rendering') {
    skip = true;
    continue;
  }
  
  if (skip && line.trim() === '// Block operations') {
    skip = false;
    newLines.push(line);
    continue;
  }
  
  if (!skip) {
    newLines.push(line);
  }
}

fs.writeFileSync(filePath, newLines.join('\\n'), 'utf8');
console.log("Replaced with line-by-line script successfully!");
