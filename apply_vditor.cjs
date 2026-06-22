const fs = require('fs');

const filePath = 'src/components/ContentPanel.vue';
let content = fs.readFileSync(filePath, 'utf8');

// Replace md-wrapper with Vditor container
const mdWrapperRegex = /<!-- Markdown file -->\s*<template v-else-if="currentFile\.type === 'markdown'">\s*<div class="md-wrapper"[\s\S]*?<\/div>\s*<\/template>/m;

const vditorContainer = `<!-- Markdown file -->
      <template v-else-if="currentFile.type === 'markdown'">
        <div id="vditor" class="vditor-container" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; width: 100%; min-height: 0;"></div>
      </template>`;

content = content.replace(mdWrapperRegex, vditorContainer);

// Remove the standalone toc button
const tocBtnRegex = /<button class="action-btn" v-if="currentFile\.type === 'markdown' && \(!isPwdFile \|\| isGlobalUnlocked\(\)\) && mdToc\.length > 0 && !store\.mdEditMode" @click="store\.mdTocCollapsed = !store\.mdTocCollapsed" :title="store\.mdTocCollapsed \? '展开大纲' : '收起大纲'">[\s\S]*?大纲\n\s*<\/button>\n/m;
content = content.replace(tocBtnRegex, '');

// Clean up mdToc toggles
content = content.replace(/ && mdToc\.length > 0/g, '');

// Replace script imports
const oldImports = `import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import markedKatex from 'marked-katex-extension'
import 'katex/dist/katex.min.css'
import markedAlert from 'marked-alert'
import { open } from '@tauri-apps/plugin-shell'

marked.use({
  gfm: true,
  breaks: true,
  pedantic: false
})

marked.use(markedKatex({
  throwOnError: false,
  output: 'html'
}))

marked.use(markedAlert())

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  emptyLangClass: 'hljs',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext'
    return hljs.highlight(code, { language }).value
  }
}))`;

const newImports = `import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import { open } from '@tauri-apps/plugin-shell'`;

content = content.replace(oldImports, newImports);

// Remove markdown rendering functions
const mdRenderRegex = /\/\/ Markdown rendering[\s\S]*?(?=\/\/ Block operations)/m;
content = content.replace(mdRenderRegex, '');

// Inject Vditor setup
const useStoreImport = `exportFileAsText, exportFileAsJson, downloadFile
} from '../stores/useStore.js'`;

const vditorSetup = `exportFileAsText, exportFileAsJson, downloadFile
} from '../stores/useStore.js'

import Vditor from 'vditor'
import 'vditor/dist/index.css'

const vditorInstance = shallowRef(null)

function initVditor() {
  if (currentFile.value?.type !== 'markdown') return
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

content = content.replace(useStoreImport, vditorSetup);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Replaced perfectly");
