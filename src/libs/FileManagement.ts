import path from 'path'
import fs from 'fs'

// import rimraf from 'rimraf'
const rimraf = require('rimraf')

const fsStatPromise = fs.promises.stat
const fsWriteFile = fs.promises.writeFile
const fsRmFile = fs.promises.unlink
const mkdirPromise = fs.promises.mkdir
const rmdirPromise = fs.promises.rmdir
const readFilePromise = fs.promises.readFile
const readdirPromise = fs.promises.readdir

export default function FileManagement() {
  return {
    async getLocalFile(
      filePath: string | Buffer,
      encoding?:
        | 'utf-8'
        | 'ascii'
        | 'utf8'
        | 'utf16le'
        | 'ucs2'
        | 'ucs-2'
        | 'base64'
        | 'latin1'
        | 'binary'
        | 'hex'
        | null
        | undefined
    ): Promise<string | Buffer> {
      return await readFilePromise(filePath, { encoding })
    },

    async deleteFile(filePath: string): Promise<void> {
      return await fsRmFile(filePath)
    },

    async mvFile(sourcePath: string, destPath: string): Promise<void> {
      return await fs.promises.rename(sourcePath, destPath)
    },

    async readDir(
      dirPath: string,
      options: null | object = null
    ): Promise<string[]> {
      return await readdirPromise(dirPath, options)
    },

    async readDirRecursive(dirPath: string): Promise<string[]> {
      const dirs = await this.readDir(dirPath)
      const files = await Promise.all(
        dirs.map(async (dirOrFile) => {
          const subPath: string = path.join(dirPath, dirOrFile)
          return (await this.doesDirectoryExist(subPath))
            ? await this.readDirRecursive(subPath)
            : subPath
        })
      )
      return files.flat(Infinity) as string[]
    },

    async deleteDir(dirPath: string): Promise<void> {
      // TODO: fs.rmdir does not provide `rm -rf` functionality,
      // it errors if directory is not empty. Need to use rimraf
      // for now, but should use std lib when it supports 'force'
      // return await rmdirPromise(dirPath, { recursive: true })
      return await new Promise((resolve, reject) => {
        rimraf(dirPath, (err: null | string | Error) => {
          if (err) return reject(err)
          resolve()
        })
      })
    },

    async checkAndCreateDirectoryOrFile(
      filepath: string,
      isFile: boolean = false,
      fileContents: any = JSON.stringify([])
    ): Promise<boolean> {
      try {
        if (isFile && !(await this.doesFileExist(filepath))) {
          // Since all files should hold JSON that will be large arrays,
          // initialize the file with an empty array
          await fsWriteFile(filepath, fileContents)
        } else if (!(await this.doesDirectoryExist(filepath))) {
          await mkdirPromise(filepath, { recursive: true })
        }

        return true
      } catch (err) {
        if (err.code == 'EEXIST') return true

        throw err
      }
    },

    async doesDirectoryExist(filePath: string): Promise<boolean> {
      return await this.doesDirOrFileExist(filePath, 'isDirectory')
    },

    async doesFileExist(filePath: string): Promise<boolean> {
      return await this.doesDirOrFileExist(filePath, 'isFile')
    },

    async doesDirOrFileExist(
      filePath: string,
      method: string
    ): Promise<boolean> {
      try {
        const stats = await fsStatPromise(filePath)
        return method === 'isFile' ? stats.isFile() : stats.isDirectory()
      } catch (e) {
        return false
      }
    },

    async getFileInfo(filePath: string): Promise<fs.Stats> {
      return await fsStatPromise(filePath)
    },

    async getFileType(fullPath: string): Promise<string> {
      try {
        await fs.promises.access(fullPath)
        return (
          ((await fs.promises.lstat(fullPath)).isDirectory() && 'directory') ||
          'file'
        )
      } catch (err) {
        return 'file'
      }
    },

    getFileName(
      fileName: string,
      extraText: number | string = Date.now()
    ): string {
      fileName = encodeURIComponent(fileName)
      return `${fileName
        .split('.')
        .slice(0, -1)
        .join('.')}_${extraText}${path.extname(fileName)}`
    },
  }
}
