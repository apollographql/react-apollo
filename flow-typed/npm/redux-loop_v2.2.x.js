// flow-typed signature: 0ff7988e8b93db26682cd91dad89092d
// flow-typed version: 272b75768a/redux-loop_v2.2.x/flow_>=v0.33.x

declare module "redux-loop" {
  declare type Effect = $Subtype<{ @@isEffectSymbol: true }>

  declare type Reducer<S, A> = (state: S, action: A) => (S | [S, Effect])

  declare type ExtractStateType = <S, A>(r: (state: S, action: A) => any) => S

  declare function combineReducers<Reducers: Object, State: $ObjMap<Reducers, ExtractStateType>, Action>(
    reducersMap:   Reducers,
    initialState?: $Shape<State>,
    accessor?:     (state: State, key: $Keys<State>) => any,
    modifier?:     (state: State, key: $Keys<State>, value: any) => any,
  ): (state: State, action: Action) => [State, Effect]

  declare var Effects: {
    batch: (effects: Effect[]) => Effect,

    // Several of the effect constructors here accept a callback with arguments
    // to apply to the callback. Listing each possible callback argument with
    // a distinct type variable allows Flow to check that the types of arguments
    // match up with the signature of the callback. But there are two
    // limitations:
    //
    // - it is only possible to type out a finite number of callback arguments
    // (I chose a max of five)
    // - Flow will not report an error if the caller does not supply all of the
    // arguments that the callback requires

    call: <Action: { type: $Subtype<string> }, A, B, C, D, E>(actionFactory: (a: A, b: B, c: C, d: D, e: E) => Action, a?: A, b?: B, c?: C, d?: D, e?: E) => Effect,

    constant: <A: { type: $Subtype<string> }>(action: A) => Effect,

    // The `lift` constructor takes a callback that is called with given
    // arguments *and* with an `action` produced by the input `effect`. Keeping
    // track of whether the `action` is supposed to be the first or last
    // argument to the callback is something that I expect will trip people up.
    // (It is the last argument.) It would be nice to be able to catch the
    // problem during type-checking if the caller guesses wrong.
    // Unfortunately I do not know how to accomplish that consistently.

    lift: <Action1, Action2: { type: $Subtype<string> }, A, B, C, D, E>(effect: Effect, f: (a: A, b: B, c: C, d: D, e: E, action: Action1) => Action2, a?: A, b?: B, c?: C, d?: D, e?: E) => Effect,

    promise: <Action: { type: $Subtype<string> }, A, B, C, D, E>(actionFactory: (a: A, b: B, c: C, d: D, e: E) => Promise<Action>, a?: A, b?: B, c?: C, d?: D, e?: E) => Effect,

    none: () => Effect,
  };

  declare function getEffect<S>(loop: S | [S, Effect]): Effect | null;

  declare function getModel<S>(loop: S | [S, Effect]): S;

  // TODO: When we are able to import type definitions from other libdefs, this
  // declaration should be changed to:
  //
  //     declare function install<S, A>(): StoreEnhancer<S, A>;
  //
  // Where `StoreEnhancer` comes from 'redux'.
  //
  // see https://github.com/flowtype/flow-typed/issues/16
  //
  declare function install(): Function;

  declare function isLoop<S>(loop: S | [S, Effect]): boolean;

  declare function liftState<S>(state: S | [S, Effect]): [S, Effect];

  declare function loop<S>(state: S, effect: Effect): [S, Effect];
}
