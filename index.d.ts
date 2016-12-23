// cssobj-core definition

declare namespace CssObjCore {
  interface Config {
    plugins?: any[];
    state?: Object;
  }

  interface Node {
    children: Object;
    diff?: Object;
    lastVal?: Object;
    parentRule: any;
    prevVal: any;
    prop: Object;
  }

  interface Result {
    update (obj?:Object, state?: any): Result;
    state: Object;
    nodes: Node[];
    obj: Object;
    config: Config;
    ref: Object;
    root: Node;
  }

  interface CssObjFactory {
    (obj?: Object, state?: any): Result;
  }

  interface Static {
    (config?: Config): CssObjFactory;
  }
}

declare module 'cssobjCore' {
  const cssobjCore: CssObjCore.Static
  export = cssobjCore
}
