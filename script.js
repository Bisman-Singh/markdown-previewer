const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const copyBtn = document.getElementById('copy-btn');
const clearBtn = document.getElementById('clear-btn');
const toast = document.getElementById('toast');

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, c => map[c]);
}

function parseMarkdown(md) {
  let html = '';
  const lines = md.split('\n');
  let i = 0;
  let inCodeBlock = false;
  let codeContent = '';
  let inList = false;
  let listType = '';

  function closeList() {
    if (inList) {
      html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
      inList = false;
      listType = '';
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += '<pre><code>' + escapeHtml(codeContent.replace(/^\n/, '')) + '</code></pre>\n';
        codeContent = '';
        inCodeBlock = false;
      } else {
        closeList();
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      i++;
      continue;
    }

    if (line.trim() === '') {
      closeList();
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      html += `<h${level}>${parseInline(headingMatch[2])}</h${level}>\n`;
      i++;
      continue;
    }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) {
      closeList();
      html += '<hr>\n';
      i++;
      continue;
    }

    const blockquoteMatch = line.match(/^>\s?(.*)/);
    if (blockquoteMatch) {
      closeList();
      let bqContent = blockquoteMatch[1];
      i++;
      while (i < lines.length && lines[i].match(/^>\s?(.*)/)) {
        bqContent += '\n' + lines[i].match(/^>\s?(.*)/)[1];
        i++;
      }
      html += '<blockquote>' + bqContent.split('\n').map(l => `<p>${parseInline(l)}</p>`).join('') + '</blockquote>\n';
      continue;
    }

    const ulMatch = line.match(/^[\s]*[-*+]\s+(.*)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList();
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${parseInline(ulMatch[1])}</li>\n`;
      i++;
      continue;
    }

    const olMatch = line.match(/^[\s]*\d+\.\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList();
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${parseInline(olMatch[1])}</li>\n`;
      i++;
      continue;
    }

    closeList();
    html += `<p>${parseInline(line)}</p>\n`;
    i++;
  }

  if (inCodeBlock) {
    html += '<pre><code>' + escapeHtml(codeContent) + '</code></pre>\n';
  }
  closeList();

  return html;
}

function parseInline(text) {
  text = escapeHtml(text);

  // inline code (must come before bold/italic to avoid conflicts)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // bold + italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');

  // strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

  return text;
}

function renderPreview() {
  const md = editor.value;
  preview.innerHTML = parseMarkdown(md);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

editor.addEventListener('input', renderPreview);

editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    renderPreview();
  }
});

copyBtn.addEventListener('click', () => {
  const html = preview.innerHTML;
  if (!html.trim()) {
    showToast('Nothing to copy!');
    return;
  }
  navigator.clipboard.writeText(html).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = html;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied to clipboard!');
  });
});

clearBtn.addEventListener('click', () => {
  editor.value = '';
  preview.innerHTML = '';
  editor.focus();
});

const defaultMarkdown = `# Welcome to Markdown Previewer

## Features

This previewer supports **many** markdown features. Try them out!

### Text Formatting

You can write **bold text**, *italic text*, and ***bold italic*** too.
Even ~~strikethrough~~ works!

### Links & Code

Visit [GitHub](https://github.com) for more info.

Inline \`code\` looks like this. Here's a code block:

\`\`\`
function greet(name) {
  return "Hello, " + name + "!";
}
console.log(greet("World"));
\`\`\`

### Lists

- First item
- Second item
- Third item

1. Ordered one
2. Ordered two
3. Ordered three

### Blockquote

> The best way to predict the future is to invent it.
> — Alan Kay

---

*Start editing on the left to see your changes here!*`;

editor.value = defaultMarkdown;
renderPreview();
