import { jest } from '@jest/globals'
import { read } from 'fs'
import { Readable, Writable } from 'stream'
import { handler } from '../../../server/routes'
export default class TestUtil {
    static generateReadableSStream(data) {
        return new Readable({
            read() {
                for (const item of data) {
                    this.push(item)
                }
                this.push(null)
            }
        })
    }

    static generateWritableStream(onData) {
        return new Writable({
            write(chunk, enc, cb) {
                onData(chunk)
                cb(bull, chunk)
            }
        })
    }

    static defaultHndleParams() {
        const requestStream = TestUtil.generateReadableSStream(['body da requisicao'])
        const response = TestUtil.generateWritableStream(() => { })

        const data = {
            request: Object.assign(requestStream, {
                headers: {},
                method: '',
                url: ''
            }),
            response: Object.assign(response, {
                writeHead: jest.fn(),
                end: jest.fn()
            })
        }
        handler(...data)
        return{
            values: () => Object.values(data), 
            ...data
        }

    }
}