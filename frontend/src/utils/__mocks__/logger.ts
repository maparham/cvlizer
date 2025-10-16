/**
 * Mock Logger for Jest tests
 */

export class Logger {
  log = jest.fn();
  error = jest.fn();
  warn = jest.fn();
  info = jest.fn();
  debug = jest.fn();
}
