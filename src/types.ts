import * as bunyan from 'bunyan'

export interface IStringMap {
  [key: string]: any
}

export interface IFactoryOptions {
  log: bunyan
}
