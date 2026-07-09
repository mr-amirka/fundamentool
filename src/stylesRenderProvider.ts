import {
  setStyleSheet, TSetStyleSheetDocument, 
} from './setStyleSheet';

export type TStylesRenderDocument = TSetStyleSheetDocument & {
  getElementById(id: string): any;
  head: { appendChild(node: any): any;
removeChild?(node: any): any } | null | undefined;
  createElement(tagName: string): any;
};

/**
 * A style item.
 * 
 * @param name - The name of the style.
 * @param revision - The revision of the style.
 * @param content - The content of the style.
 */
export type TStyleItem = {
  /**
   * The name of the style.
   */
  name: string;

  /**
   * The revision of the style.
   */
  revision: number;

  /**
   * The content of the style.
   */
  content?: string | null;
};

/**
 * Создаёт функцию, которая по массиву описаний стилей
 * монтирует/обновляет `<style>`‑элементы в документе.
 * 
 * @param doc - The document in which `<style>` elements are managed.
 * @param prefix - Prefix prepended to each style element's `id` attribute.
 * @returns A function that accepts an array of style items and syncs them to the DOM.
 * @example
 * const render = stylesRenderProvider(document, 'app-');
 * render([{ name: 'theme', revision: 1, content: 'body { color: red; }' }]);
 * // Inserts/updates <style id="app-theme"> with the given CSS.
 */
export function stylesRenderProvider(doc: TStylesRenderDocument, prefix: string) {
  let last: Record<string, [any, number]> = {};
  let head: TStylesRenderDocument['head'];

  /**
   * Gets a node by id.
   * 
   * @param id - The id of the node.
   * @returns The node.
   */
  function getNode(id: string): any {
    let node = doc.getElementById(id);
    if (!node) {
      head = head || doc.head;
      node = doc.createElement('style');
      node.setAttribute('id', id);
      head && head.appendChild(node);
    }
    return node;
  }

  /**
   * Renders the styles.
   * 
   * @param styles - The styles to render.
   */
  return (styles: TStyleItem[]) => {
    head = head || doc.head;
    if (!head) {
      return;
    }

    const trash = last;
    const length = styles.length;
    let slot: [any, number];
    let node: any;
    let item: TStyleItem;
    let revision: number;
    let name: string;
    let parentNode: any;
    let i = 0;

    last = {};

    while (i < length) {
      item = styles[i++];
      name = item.name;
      revision = item.revision;
      slot = last[name] = trash[name] || [getNode(prefix + name), 0];
      delete trash[name];
      node = slot[0];
      if (revision !== slot[1]) {
        slot[1] = revision;
        setStyleSheet(
          node, item.content || '', doc,
        );
      }
      head.appendChild(node);
    }

    // eslint-disable-next-line guard-for-in
    for (name in trash) {
      node = trash[name][0];
      parentNode = node.parentNode;
      if (parentNode) {
        parentNode.removeChild(node);
      }
    }
  };
}

