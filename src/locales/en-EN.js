export default {
    "name": "🇬🇧 English",
    "toolbar": {
        "bold": "Bold",
        "italic": "Italic",
        "underline": "Underline",
        "strike": "Strike",
        "list": "List",
    },
    "layout": {
        "speak": "Read Aloud",
        "listen": "Dictate",
        "syllabes": "Syllables",
        "print": "Print PDF",
        "colors": "Dyslexia Helpers",
        "spelling": "Spellcheck",
        "contribute": "About",
        "upload": "Scan Image",
        "crop": "Crop",
        "cancel": "Cancel",
    },
    "editor": {
        "welcome": "Welcome! Try typing 'knight', 'write', 'column', or 'walk' to see the helpers.",
        "colors": [
            // --- 1. SILENT LETTERS (Greyed Out) ---
            // These rules detect letters that should not be pronounced.
            
            // Silent 'k' (as in 'knight', 'knee', 'know')
            {regex: "\\b(k)n", color: '#9CA3AF'}, 

            // Silent 'w' (as in 'write', 'wrong', 'wrist')
            {regex: "\\b(w)r", color: '#9CA3AF'},

            // Silent 'gh' (as in 'night', 'high', 'fight')
            {regex: "i(gh)", color: '#9CA3AF'},

            // Silent 'b' (at the end of words like 'lamb', 'comb', 'thumb')
            {regex: "m(b)\\b", color: '#9CA3AF'},

            // Silent 'l' (as in 'walk', 'talk', 'calf')
            {regex: "a(l)[kf]", color: '#9CA3AF'},

            // Silent 't' (as in 'castle', 'listen', 'whistle')
            {regex: "s(t)le\\b", color: '#9CA3AF'},
            {regex: "s(t)en\\b", color: '#9CA3AF'},

            // Silent 'g' (as in 'gnat', 'gnaw')
            {regex: "\\b(g)n", color: '#9CA3AF'},


            // --- 2. CONFUSING SEQUENCES (Context Sensitive) ---
            
            // Nasal Pair: Only highlights when M and N appear TOGETHER.
            // Helps with: 'column', 'hymn', 'damn', 'enmity'
            // Does NOT highlight 'mom' or 'nine'.
            {regex: "(mn|nm)", color: '#059669'}, // Green


            // --- 3. SHAPE CONFUSION (Always Highlight) ---
            // These letters are visually confusing regardless of context.
            
            {regex: "(b)", color: '#2563EB'}, // Blue
            {regex: "(d)", color: '#DC2626'}, // Red
            {regex: "(p)", color: '#7C3AED'}, // Purple
            {regex: "(q)", color: '#D97706'}, // Orange
        ]
    }
}