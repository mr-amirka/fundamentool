/**
 * Creates predicate that checks instance of a class by getter.
 * 
 * @param getter - The getter to use.
 * @returns The predicate.
 * @example
 * const isClass = providerOfIsClass(() => Class);
 * isClass(new Class()); // => true
 * isClass(new Class2()); // => false
 */
export function providerOfIsClass(getter: () => any) {
  return (instance: any): boolean => {
    const _Class = getter();
    return !!_Class && instance instanceof _Class;
  };
}

