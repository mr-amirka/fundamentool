/**
 * `childClassOfReact` — a component class extended the old way: the parent's constructor, then `constructor(self, …)`,
 * the prototype of the parent plus `proto`.
 */
import {
  childClassOfReact,
} from '../src/childClassOfReact';

describe('childClassOfReact', () => {
  it('runs the parent, then the constructor with the instance; the prototype chain and the extra members', () => {
    function Parent(this: any, props: { n: number }) {
      this.props = props;
    }
    Parent.prototype.hello = function hello(this: any) {
      return 'hello ' + this.props.n;
    };
    const Child = childClassOfReact(
      Parent, (self, props) => {
        self.doubled = (props?.n ?? 0) * 2;
      }, {
        extra: () => 'extra',
      },
    ) as any;
    const child = new Child({
      n: 3,
    });
    expect(child.props).toEqual({
      n: 3,
    });
    expect(child.doubled).toBe(6);
    expect(child.hello()).toBe('hello 3');
    expect(child.extra()).toBe('extra');
    expect(child).toBeInstanceOf(Parent);
  });
});
