const fs = require('fs');

const filePath = 'src/components/ContentPanel.vue';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the old TOC button
const tocBtnPattern = /^\s*<button class="action-btn" v-if="currentFile\.type === 'markdown'.*?@click="store\.mdTocCollapsed = !store\.mdTocCollapsed"[\s\S]*?大纲\s*<\/button>\n/m;
content = content.replace(tocBtnPattern, '');

// 2. Replace md-wrapper with vditor
const mdWrapperPattern = /(<!-- Markdown file -->\s*<template v-else-if="currentFile\.type === 'markdown'">)\s*<div class="md-wrapper"[\s\S]*?<\/div>\s*<\/template>/;
const vditorReplacement = `$1\n        <div id="vditor" class="vditor-container" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; width: 100%; min-height: 0;"></div>\n      </template>`;
content = content.replace(mdWrapperPattern, vditorReplacement);

// 3. Remove marked imports and setups, but keep highlight.js and @tauri-apps/plugin-shell
const importsPattern = /import \{ marked \} from 'marked'\nimport \{ markedHighlight \} from 'marked-highlight'\n(import hljs from 'highlight\.js'\nimport 'highlight\.js\/styles\/atom-one-dark\.css'\n)import markedKatex from 'marked-katex-extension'\nimport 'katex\/dist\/katex\.min\.css'\nimport markedAlert from 'marked-alert'\n(import \{ open \} from '@tauri-apps\/plugin-shell')\n\nmarked\.use\(\{[\s\S]*?\}\)\)\n\n/;
content = content.replace(importsPattern, '$1$2\n\n');

// 4. Remove Markdown rendering section until just before // Block operations
const mdRenderingPattern = /\/\/ Markdown rendering\s*const mdTocStr = ref\('\[\]'\)[\s\S]*?\/\/ Block operations/;
content = content.replace(mdRenderingPattern, '// Block operations');

// 5. Add mdEditMode watcher after initVditor
const initVditorWatchPattern = /(watch\(\(\) => currentFile\.value\?\.type, \(newType\) => \{)/;
const mdEditModeWatcher = `watch(() => store.mdEditMode, (newMode) => {
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

$1`;
content = content.replace(initVditorWatchPattern, mdEditModeWatcher);

// 6. Clean up any left over mdToc checks that might crash Vue
content = content.replace(/ && mdToc\.length > 0/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Replacement done!");
