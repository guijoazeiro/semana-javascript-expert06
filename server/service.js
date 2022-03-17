import fs from 'fs'
import config from './config.js'
import {randomUUID} from 'crypto'
import { join, extname } from 'path'
import fsPromises from 'fs/promises'
import {PassThrough} from 'stream'

const {
    dir: {
        publicDirectory
    }
} = config

export class Service {
    constructor(){
        this.clientStreams = new Map()
    }

    createClientStream(){
        const id = randomUUID()
        const clientStreams = new PassThrough()
        this.clientStreams.set(id, clientStreams)

        return{
            id,
            clientStreams
        }
    }
    removeClientStream(id){
        this.clientStreams.delete(id)
    }
    createFileStream(filename) {
        return fs.createReadStream(filename)
    }

    async getFileInfo(file) {
        const fullFilePath = join(publicDirectory, file)
        await fsPromises.access(fullFilePath)
        const fileType = extname(fullFilePath)
        return {
            type: fileType,
            name: fullFilePath
        }
    }

    async getFileStrem(file) {
        const { name, type } = await this.getFileInfo(file)
        return {
            stream: this.createFileStream(name),
            type
        }
    }
}