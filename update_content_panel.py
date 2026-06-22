import re

file_path = 'src/components/ContentPanel.vue'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove TOC button
toc_btn_pattern = r'^\s*<button class="action-btn" v-if="currentFile\.type === \'markdown\' && \(!isPwdFile \|\| isGlobalUnlocked\(\)\) && mdToc\.length > 0 && !store\.mdEditMode" @click="store\.mdTocCollapsed = !store\.mdTocCollapsed" :title="store\.mdTocCollapsed \? \'展开大纲\' : \'收起大纲\'">[\s\S]*?大纲\s*</button>\n'
content = re.sub(toc_btn_pattern, '', content, flags=re.MULTILINE)

# 2. Replace md-wrapper
md_wrapper_pattern = r'(<!-- Markdown file -->\s*<template v-else-if="currentFile\.type === \'markdown\'">)\s*<div class="md-wrapper"[\s\S]*?</div>\s*</template>'
vditor_replacement = r'\1\n        <div id="vditor" class="vditor-container" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; width: 100%; min-height: 0;"></div>\n      </template>'
content = re.sub(md_wrapper_pattern, vditor_replacement, content)

# 3. Add vditor logic right after the useStore import
script_start_pattern = r'(} from \'\.\./stores/useStore\.js\')'
vditor_logic = r"""\1
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
})"""
content = re.sub(script_start_pattern, vditor_logic, content)

# 4. Remove marked logic line by line
lines = content.split('\n')
new_lines = []
skip = False

for i in range(len(lines)):
    line = lines[i]
    if line.startswith("import { marked } from 'marked'"):
        skip = True
        new_lines.append("import hljs from 'highlight.js'")
        new_lines.append("import 'highlight.js/styles/atom-one-dark.css'")
        new_lines.append("import { open } from '@tauri-apps/plugin-shell'")
        continue
    
    if skip:
        # Check if we reached the end of markedHighlight block
        if line.strip() == '}))' and lines[i-1].strip() == '}':
            skip = False
        continue
    
    # 5. Skip Markdown rendering block
    if line.strip() == '// Markdown rendering':
        skip = True
        continue
        
    if skip and line.strip() == '// Block operations':
        skip = False
        new_lines.append(line)
        continue
        
    if not skip:
        # Also clean mdToc.length > 0 if there are any
        new_line = line.replace(' && mdToc.length > 0', '')
        new_lines.append(new_line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("Vditor full integration complete (Python)!")
