import { InvalidInputError } from './invalid_input_error';
import { InvalidStateError } from './invalid_state_error';

export { InvalidInputError, InvalidStateError };

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class MutateDataException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MutateDataException.prototype);
  }
}
