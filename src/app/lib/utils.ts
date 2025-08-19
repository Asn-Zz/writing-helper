export function exportToMarkdown(content: string): void {
    // Create a blob with the content
    const blob = new Blob([content], { type: 'text/markdown' });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `writing_${new Date().toISOString().slice(0, 10)}.md`;

    // Trigger download
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 计算两段文本的差异并生成带有HTML标记的差异
export function generateDiffMarkup(original: string, polished: string): string {
    const diffLines = [];
    const originalLines = original.split('\n');
    const polishedLines = polished.split('\n');
    
    // 非常简单的差异比较 - 行级别
    let i = 0, j = 0;
    
    while (i < originalLines.length || j < polishedLines.length) {
      const origLine = i < originalLines.length ? originalLines[i] : '';
      const polishLine = j < polishedLines.length ? polishedLines[j] : '';
      
      if (origLine === polishLine) {
        // 行相同，不做任何标记
        diffLines.push(origLine);
        i++;
        j++;
      } else {
        // 行不同，标记为已修改
        // 判断行是否被删除、添加或修改
        if (j + 1 < polishedLines.length && originalLines[i] === polishedLines[j + 1]) {
          // 添加行
          diffLines.push(`<ins class="diff-add">${polishLine}</ins>`);
          j++;
        } else if (i + 1 < originalLines.length && polishedLines[j] === originalLines[i + 1]) {
          // 删除行
          diffLines.push(`<del class="diff-del">${origLine}</del>`);
          i++;
        } else {
          // 修改行
          // 简单标记整行
          diffLines.push(`<del class="diff-del">${origLine}</del>`);
          diffLines.push(`<ins class="diff-add">${polishLine}</ins>`);
          i++;
          j++;
        }
      }
    }
    
    return diffLines.join('\n');
}
  
export function objectToQueryString(params: Record<string, any>) {
    return Object.entries(params)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
}