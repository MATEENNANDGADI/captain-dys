import Quill from 'quill';
import locales from './locales/locales';

const editor = {
  quill: null,
  colorsAreEnabled: true,
  translations: {},
  
  init: (selector, toolbarSelector, locale) => {

    if (typeof locale === 'undefined' || !locales.has(locale)) {
        locale = locales.default();
    }
    editor.translations = locales.get(locale);

    // icons
    const icons = Quill.import('ui/icons');
    icons['bold'] = `<b>${editor.translations.toolbar.bold}</b>`;
    icons['italic'] = `<b>${editor.translations.toolbar.italic}</b>`;
    icons['underline'] = `<b>${editor.translations.toolbar.underline}</b>`;
    icons['strike'] = `<b>${editor.translations.toolbar.strike}</b>`;
    icons['list'] = `<b>${editor.translations.toolbar.list}</b>`;
    icons['image'] = `
<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" ><path d="M0 0h24v24H0z" fill="none"/><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
    `;

    // Initialize WYSIWYG editor
    const quill = editor.quill = new Quill(selector, {
      theme: 'snow',
      modules: {
        toolbar: toolbarSelector,
      },
      placeholder: '...',
    });

    quill.root.setAttribute('spellcheck', false);
    quill.focus();

    if (quill.getLength() === 1) {
      // If is blank, add a Welcome message
      quill.insertText(0, editor.translations.editor.welcome);
    }

    quill.on('text-change', function (delta, oldDelta, source) {
      if (source != 'user') {
        return;
      }
      editor.applyColors();
    });

    editor.applyColors();
    editor.dealWithCopyPaste();
  },

  applyColors: () => {
    // reset format
    let quill = editor.quill;
    quill.formatText(0, quill.getText().length, {color: '#333'});

    if (!editor.colorsAreEnabled) {
      return;
    }

    // Color of letters
    const toColor = editor.translations.editor.colors;
    let text = quill.getText(); 

    if (text.length === 0) {
      return;
    }

    let pattern, indice;

    for (pattern of toColor) {
      // Calls our custom DSA function instead of standard Regex
      let indices = editor.getIndicesOf(pattern.regex, text);

      if (0 == indices.length) {
        continue;
      }

      for (indice of indices) {
        let delta = quill.formatText(indice.start, indice.len, {
          color: pattern.color
        }, true);

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
          ops.push({
            insert: op.insert
          });
        }
      });
      delta.ops = ops;
      return delta;
    });
  },

  getSelectedText: () => {
    let selection = editor.quill.getSelection();

    if (!selection) {
      return editor.getAllText();
    }

    let selectedContent = editor.quill.getContents(selection.index, selection.length);
    let tempContainer = document.createElement('div');
    let tempQuill = new Quill(tempContainer);
    tempQuill.setContents(selectedContent);
    let text = tempContainer.querySelector('.ql-editor').innerText;
    tempContainer.remove();

    return text;
  },

  getAllText: () => {
    return editor.quill.getText();
  },

  setText(text) {
    editor.quill.setText(text);
  },

  // ============================================================
  // CUSTOM DSA IMPLEMENTATION
  // Algorithm 1: Rabin-Karp (Rolling Hash) for O(N) Pattern Matching
  // ============================================================
  getIndicesOf: (searchStr, text) => {
    // Optimization: Handle simple single letters (b, d, p, q) directly for O(N) speed
    if (searchStr.length === 3 && searchStr.startsWith('(') && searchStr.endsWith(')')) {
       // Extract letter from "(b)"
       const char = searchStr[1];
       let indices = [];
       for(let i=0; i<text.length; i++) {
           if(text[i].toLowerCase() === char) {
               indices.push({start: i, len: 1, end: i+1});
           }
       }
       return indices;
    }

    // For sequences like "mn", "nm" or complex rules, use Rabin-Karp
    // 1. Clean the regex string to get raw patterns (e.g., "(mn|nm)" -> ["mn", "nm"])
    let patterns = [];
    let cleanStr = searchStr.replace(/\\b/g, ''); // Remove regex boundaries for raw search
    
    if (cleanStr.includes('|')) {
        patterns = cleanStr.replace(/[()]/g, '').split('|');
    } else {
        patterns = [cleanStr.replace(/[()]/g, '')];
    }

    let indices = [];
    const d = 256; // alphabet size
    const q = 101; // prime number

    // Inner function: The actual Rabin-Karp Algorithm
    const searchPattern = (pat, txt) => {
        let M = pat.length;
        let N = txt.length;
        if (M === 0) return;
        
        let i, j;
        let p = 0; // hash for pattern
        let t = 0; // hash for text
        let h = 1;

        // The value of h would be "pow(d, M-1)%q"
        for (i = 0; i < M - 1; i++)
            h = (h * d) % q;

        // Calculate the hash value of pattern and first window of text
        for (i = 0; i < M; i++) {
            p = (d * p + pat.charCodeAt(i)) % q;
            t = (d * t + txt.charCodeAt(i)) % q;
        }

        // Slide the pattern over text one by one
        for (i = 0; i <= N - M; i++) {
            // Check the hash values of current window of text and pattern
            if (p === t) {
                // If hash matches, check characters one by one
                for (j = 0; j < M; j++) {
                    if (txt[i + j] !== pat[j])
                        break;
                }
                if (j === M) {
                    // Match found
                    indices.push({
                        start: i,
                        end: i + M,
                        len: M
                    });
                }
            }

            // Calculate hash value for next window of text: Remove leading digit, add trailing digit
            if (i < N - M) {
                t = (d * (t - txt.charCodeAt(i) * h) + txt.charCodeAt(i + M)) % q;
                if (t < 0) t = (t + q);
            }
        }
    };

    // Run the algorithm for every sub-pattern
    patterns.forEach(pat => searchPattern(pat, text));
    
    return indices;
  },

  // ============================================================
  // CUSTOM DSA IMPLEMENTATION
  // Algorithm 2: Levenshtein Distance (Dynamic Programming)
  // Used for Word Similarity Suggestions
  // ============================================================
  calculateEditDistance: (str1, str2) => {
      const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));

      for (let i = 0; i <= str1.length; i += 1) { track[0][i] = i; }
      for (let j = 0; j <= str2.length; j += 1) { track[j][0] = j; }

      for (let j = 1; j <= str2.length; j += 1) {
          for (let i = 1; i <= str1.length; i += 1) {
              const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
              track[j][i] = Math.min(
                  track[j][i - 1] + 1, // deletion
                  track[j - 1][i] + 1, // insertion
                  track[j - 1][i - 1] + indicator, // substitution
              );
          }
      }
      return track[str2.length][str1.length];
  }
};

export default editor;