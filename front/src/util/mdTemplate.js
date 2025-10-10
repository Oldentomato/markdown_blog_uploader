
const imageForm = `
\n![이미지 설명](https://example.com/image.png)
`


const quoteForm = `
\n> 💡 Tip: contents...
`

const linkForm = `
\n[링크 설명](https://example.com)
`

const codeForm = `\n\`\`\`javascript
console.log('Hello Markdown!');
\`\`\``;

const codeDiffForm = `\n\`\`\`javascript
// [!code ++]
console.log('Hello Markdown!');

// [!code --:3]
console.log('Hello Markdown!');
console.log('Hello Markdown!');
console.log('Hello Markdown!');
\`\`\``;

export {imageForm, quoteForm, linkForm, codeForm, codeDiffForm}