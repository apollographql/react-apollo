const genericMessage = "Invariant Violation";

export class InvariantError extends Error {
  framesToPop = 1;
  name = genericMessage;
  constructor(message: string = genericMessage) {
    super(message);
  }
}

export default function invariant(condition: any, message: string) {
  if (!condition) {
    throw new InvariantError(message);
  }
}
