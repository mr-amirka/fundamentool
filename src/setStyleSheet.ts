export type TSetStyleSheetDocument = {
  createTextNode(data: string): any;
};

/**
 * Устанавливает CSS‑текст для style‑элемента в документе.
 *
 * Поддерживает как старый IE‑интерфейс (`styleSheet.cssText`),
 * так и современный способ через `textNode`.
 * 
 * @param node - The style element to update.
 * @param text - The CSS text to set.
 * @param document - The document used to create text nodes.
 * @example
 * const style = document.createElement('style');
 * document.head.appendChild(style);
 * setStyleSheet(style, 'body { margin: 0; }', document);
 */
export function setStyleSheet(
  node: HTMLElement, text: string, document: TSetStyleSheetDocument,
): void {
  const styleSheet = (node as any).styleSheet as { cssText: string } | undefined;
  const childNodes = node.childNodes;
  let index = childNodes?.length || 0;

  if (styleSheet) {
    styleSheet.cssText = text;
  } else {
    while (--index > -1) {
      node.removeChild(childNodes[index]);
    }
    node.appendChild(document.createTextNode(text));
  }
}

