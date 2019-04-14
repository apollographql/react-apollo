/// <reference types="jest" />
export declare const wrap: <TArgs>(done: jest.DoneCallback, cb: (...args: TArgs[]) => void) => (...args: TArgs[]) => void;
