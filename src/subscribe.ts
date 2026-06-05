/**
 * Subscribes to a collection of listeners.
 * 
 * @param collection - The collection to subscribe to.
 * @param listeners - The listeners to subscribe to.
 * @returns A function that, when called, removes all listeners from the collection.
 * @example
 * const unsubscribe = subscribe(handlers, [myHandler]);
 * unsubscribe(); // removes myHandler from handlers
 */
export const subscribe = (collection: any[] | null, listeners: any[] | null) => {
  listeners && collection && collection.push(...listeners);
  return () => {
    /*
      Вычищаем все ссылки в замыкании,
      чтобы сборщик мусора мог высвободить память
      и чтобы повторно что-нибудь не удалить
    */
    if (!listeners || !collection) {
      return;
    }

    const length = listeners.length;
    let i = 0;
    let index: number;

    for (; i < length; i++) {
      index = collection.indexOf(listeners[i]);
      index > -1 && collection.splice(index, 1);
    }
    listeners = collection = null;
  };
};
