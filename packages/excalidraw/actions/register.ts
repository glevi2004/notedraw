import type { Action } from "./types";

export let actions: readonly Action[] = [];

type RegisteredAction<T extends Action<any>> = T & {
  keyTest?: unknown extends T["keyTest"] ? never : T["keyTest"];
};

// Use a non-type-parameter parameter type in the public signature so object
// literals passed to register() receive contextual typing in all TS versions.
export function register<TData extends any, TExtra extends object = {}>(
  action: Action<TData> & TExtra,
): RegisteredAction<Action<TData> & TExtra>;

export function register<T extends Action<any>>(action: T): RegisteredAction<T> {
  actions = actions.concat(action);
  return action as RegisteredAction<T>;
}
