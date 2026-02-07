import Quill from 'quill';
import locales from './locales/locales';

const editor = {
  quill: null,
  colorsAreEnabled: true,
  suggestionsAreEnabled: true,
  translations: {},

  // --- VOCABULARY LIST (Local DSA Speed Layer) ---
  vocabulary: [
    "project", "computer", "science", "engineering", "algorithm", "editor", 
    "dyslexia", "text", "speech", "image", "write", "right", "knight", "night",
    "the", "and", "you", "that", "was", "for", "are", "with", "his", "they",
    "hello", "world", "welcome", "student", "teacher", "school", "university",
    "assignment", "exam", "result", "grade", "class", "lesson", "homework",
    "high", "what", "where", "when", "why", "how", "meaning", "definition"
  ],

  init: (selector, toolbarSelector, locale) => {
    if (typeof locale === 'undefined' || !locales.has(locale)) {
        locale = locales.default();
    }
    editor.translations = locales.get(locale);

    const icons = Quill.import('ui/icons');
    icons['bold'] = `<b>${editor.translations.toolbar.bold}</b>`;
    icons['italic'] = `<b>${editor.translations.toolbar.italic}</b>`;
    icons['underline'] = `<b>${editor.translations.toolbar.underline}</b>`;
    icons['strike'] = `<b>${editor.translations.toolbar.strike}</b>`;
    icons['list'] = `<b>${editor.translations.toolbar.list}</b>`;
    icons['image'] = `
<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" ><path d="M0 0h24v24H0z" fill="none"/><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
    `;

    const quill = editor.quill = new Quill(selector, {
      theme: 'snow',
      modules: { toolbar: toolbarSelector },
      placeholder: 'Type here...',
    });

    quill.root.setAttribute('spellcheck', false);
    quill.focus();

    // 1. SETUP UI
    editor.createSuggestionBar(selector);

    // 2. TOGGLE LISTENER
    const toggleBtn = document.getElementById('toggle-suggestions');
    if (toggleBtn) {
        toggleBtn.addEventListener('change', (e) => {
            editor.suggestionsAreEnabled = e.target.checked;
            const bar = document.getElementById('suggestion-bar');
            if (bar) bar.style.display = e.target.checked ? 'flex' : 'none';
        });
    }

    // --- FILE OPERATIONS ---
    
    // New File
    const newBtn = document.getElementById('btn-editor-new');
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            if(confirm("Create new file? Unsaved changes will be lost.")) {
                editor.quill.setText('');
            }
        });
    }

    // Save .txt
    const saveBtn = document.getElementById('btn-editor-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            editor.saveAsTxt();
        });
    }

    // Open File
    const openBtn = document.getElementById('btn-editor-open');
    const fileInput = document.getElementById('file-opener');
    
    if (openBtn && fileInput) {
        openBtn.addEventListener('click', () => {
            fileInput.click(); 
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const contents = e.target.result;
                editor.quill.setText(contents); 
                editor.applyColors(); 
            };
            reader.readAsText(file);
            fileInput.value = ''; 
        });
    }

    // --- EVENT LISTENERS ---
    quill.on('selection-change', function(range, oldRange, source) {
        if (range) editor.handleSuggestion(range.index);
    });

    let typingTimer;
    quill.on('text-change', function (delta, oldDelta, source) {
      if (source != 'user') return;
      editor.applyColors();
      
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
          const range = editor.quill.getSelection();
          if (range) editor.handleSuggestion(range.index);
      }, 500); 
    });

    editor.applyColors();
    editor.dealWithCopyPaste();
  },

  // --- SAVE AS TXT ---
  saveAsTxt: () => {
      const text = editor.quill.getText();
      const blob = new Blob([text], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `DxEditor-Note-${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  },

  createSuggestionBar: (selector) => {
      const editorDiv = document.querySelector(selector);
      const bar = document.createElement('div');
      bar.id = 'suggestion-bar';
      
      Object.assign(bar.style, {
          padding: '15px',
          backgroundColor: '#f8fafc',
          borderTop: '2px solid #cbd5e1',
          color: '#334155',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          marginTop: '0px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: '50px',
          transition: 'all 0.3s ease'
      });
      
      bar.innerHTML = '<span>💡 AI Dictionary Ready</span>';
      editorDiv.parentNode.insertBefore(bar, editorDiv.nextSibling);
  },

  handleSuggestion: async (cursorIndex) => {
      if (!editor.suggestionsAreEnabled) return;

      const text = editor.quill.getText();
      let start = cursorIndex;
      while(start > 0 && /[\w]/.test(text[start-1])) start--;
      let end = cursorIndex;
      while(end < text.length && /[\w]/.test(text[end])) end++;

      const currentWord = text.substring(start, end).trim();
      const bar = document.getElementById('suggestion-bar');
      
      if(currentWord.length < 2) {
          bar.innerHTML = '<span style="opacity: 0.6;">(Type or click a word...)</span>';
          return;
      }

      if(bar.dataset.lastWord === currentWord) return;
      bar.dataset.lastWord = currentWord;

      bar.innerHTML = `<span>🔍 Analyzing <b>${currentWord}</b>...</span>`;

      // 1. Local Check
      if (editor.vocabulary.includes(currentWord.toLowerCase())) {
          editor.showCorrect(currentWord);
          return;
      }

      // 2. Internet Check
      const definition = await editor.fetchDefinition(currentWord);

      if (definition) {
          editor.updateBarUI('correct', currentWord, definition);
      } else {
          // 3. Fallback DSA Suggestion
          const suggestion = editor.getBestMatch(currentWord);
          if (suggestion) {
             const suggDef = await editor.fetchDefinition(suggestion);
             editor.updateBarUI('wrong', suggestion, suggDef, start, currentWord.length);
          } else {
             bar.innerHTML = `<span>❌ Unknown word. No suggestions found.</span>`;
          }
      }
  },

  showCorrect: async (word) => {
      const def = await editor.fetchDefinition(word);
      editor.updateBarUI('correct', word, def);
  },

  updateBarUI: (type, word, definition, startIdx = 0, len = 0) => {
      const bar = document.getElementById('suggestion-bar');
      
      if (type === 'correct') {
          bar.innerHTML = `
            <div style="display:flex; flex-direction:column;">
                <span style="color: #059669; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                   ✅ Correct: <b>${word}</b>
                </span>
                <span style="font-size: 13px; color: #334155; margin-top:4px;">
                   📖 ${definition || "Definition found online."}
                </span>
            </div>
          `;
      } else if (type === 'wrong') {
          bar.innerHTML = `
            <div style="display:flex; flex-direction:column;">
                <span style="color: #d97706; font-weight: bold;">
                   💡 Did you mean: <u style="cursor: pointer;" id="btn-fix-word">${word}</u>?
                </span>
                <span style="font-size: 13px; color: #475569; margin-top:4px; font-style: italic;">
                   📖 ${definition || "Definition found online."}
                </span>
            </div>
          `;
          
          const btn = document.getElementById('btn-fix-word');
          if(btn) {
              btn.onclick = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  editor.quill.deleteText(startIdx, len);
                  editor.quill.insertText(startIdx, word);
                  // Fix Cursor Position
                  setTimeout(() => {
                      editor.quill.focus();
                      editor.quill.setSelection(startIdx + word.length, 0);
                  }, 10);
              };
          }
      }
  },

  fetchDefinition: async (word) => {
      try {
          const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
          if(!response.ok) return null; 
          const data = await response.json();
          return data[0]?.meanings[0]?.definitions[0]?.definition || null;
      } catch (e) {
          return null; 
      }
  },

  getBestMatch: (inputWord) => {
      let bestWord = null;
      let minDistance = Infinity;
      const lowerInput = inputWord.toLowerCase();
      editor.vocabulary.forEach(word => {
          const dist = editor.calculateEditDistance(lowerInput, word);
          if (dist < minDistance && dist <= 2) {
              minDistance = dist;
              bestWord = word;
          }
      });
      return bestWord;
  },

  applyColors: () => {
    let quill = editor.quill;
    quill.formatText(0, quill.getText().length, {color: '#333'});
    if (!editor.colorsAreEnabled) return;
    const toColor = editor.translations.editor.colors;
    let text = quill.getText();
    if (text.length === 0) return;
    let pattern, indice;
    for (pattern of toColor) {
      let indices = editor.getIndicesOf(pattern.regex, text);
      if (0 == indices.length) continue;
      for (indice of indices) {
        quill.formatText(indice.start, indice.len, { color: pattern.color }, true);
        quill.removeFormat(indice.end, 0);
      }
    }
  },

  toggleColor: (enabled) => {
    editor.colorsAreEnabled = enabled;
    editor.applyColors();
  },

  dealWithCopyPaste: () => {
    editor.quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
      let ops = [];
      delta.ops.forEach(op => {
        if (op.insert && typeof op.insert === 'string') {
          ops.push({ insert: op.insert });
        }
      });
      delta.ops = ops;
      return delta;
    });
  },

  getAllText: () => { return editor.quill.getText(); },
  
  getSelectedText: () => {
    let selection = editor.quill.getSelection();
    if (!selection) return editor.getAllText();
    let selectedContent = editor.quill.getContents(selection.index, selection.length);
    let tempContainer = document.createElement('div');
    let tempQuill = new Quill(tempContainer);
    tempQuill.setContents(selectedContent);
    let text = tempContainer.querySelector('.ql-editor').innerText;
    tempContainer.remove();
    return text;
  },

  setText(text) { editor.quill.setText(text); },

  // DSA: Rabin-Karp
  getIndicesOf: (searchStr, text) => {
    if (searchStr.length === 3 && searchStr.startsWith('(') && searchStr.endsWith(')')) {
       const char = searchStr[1];
       let indices = [];
       for(let i=0; i<text.length; i++) {
           if(text[i].toLowerCase() === char) indices.push({start: i, len: 1, end: i+1});
       }
       return indices;
    }
    let patterns = [];
    let cleanStr = searchStr.replace(/\\b/g, ''); 
    if (cleanStr.includes('|')) patterns = cleanStr.replace(/[()]/g, '').split('|');
    else patterns = [cleanStr.replace(/[()]/g, '')];

    let indices = [];
    const d = 256, q = 101; 

    const searchPattern = (pat, txt) => {
        let M = pat.length, N = txt.length;
        if (M === 0) return;
        let i, j, p = 0, t = 0, h = 1;

        for (i = 0; i < M - 1; i++) h = (h * d) % q;
        for (i = 0; i < M; i++) {
            p = (d * p + pat.charCodeAt(i)) % q;
            t = (d * t + txt.charCodeAt(i)) % q;
        }
        for (i = 0; i <= N - M; i++) {
            if (p === t) {
                for (j = 0; j < M; j++) if (txt[i + j] !== pat[j]) break;
                if (j === M) indices.push({ start: i, end: i + M, len: M });
            }
            if (i < N - M) {
                t = (d * (t - txt.charCodeAt(i) * h) + txt.charCodeAt(i + M)) % q;
                if (t < 0) t = (t + q);
            }
        }
    };
    patterns.forEach(pat => searchPattern(pat, text));
    return indices;
  },

  // DSA: Levenshtein
  calculateEditDistance: (str1, str2) => {
      const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
      for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
      for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
      for (let j = 1; j <= str2.length; j += 1) {
          for (let i = 1; i <= str1.length; i += 1) {
              const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
              track[j][i] = Math.min(
                  track[j][i - 1] + 1, 
                  track[j - 1][i] + 1, 
                  track[j - 1][i - 1] + indicator,
              );
          }
      }
      return track[str2.length][str1.length];
  }
};

export default editor;