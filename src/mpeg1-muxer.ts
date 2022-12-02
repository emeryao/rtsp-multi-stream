import { ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

export interface MuxerOptions {
    url?: string;
    ffmpegArgs?: Record<string, string>;
    ffmpegPath?: string;

    /** weather the spawned `ffmpeg` child process should be detached or not */
    shouldDetached?: boolean;

    /** seconds to wait for rtsp connection */
    timeout?: number;

    debug?: boolean;
}

export class Mpeg1Muxer extends EventEmitter {

    public streamProcess?: ChildProcess;

    private streamStarted: boolean = false;

    public constructor(options?: MuxerOptions) {
        super();

        if (!options || typeof options == 'undefined') { return; }
        if (!options.ffmpegPath) { return; }
        if (!options.url) { return; }

        let inputFfmpegArgs: Array<string> = [];
        if (options.ffmpegArgs) {
            inputFfmpegArgs = Object.keys(options.ffmpegArgs).flatMap(key => (options.ffmpegArgs?.[key] ? [key, options.ffmpegArgs[key]] : [key]));
        }

        const spawnFfmpegArgs: Array<string> = [
            '-i',
            options.url,
            '-f',
            'mpegts',
            '-vcodec',
            'mpeg1video',
            ...inputFfmpegArgs,
            '-',
        ];

        this.streamProcess = spawn(options.ffmpegPath, spawnFfmpegArgs, { detached: options.shouldDetached });

        this.streamProcess.stdout?.on('data', data => {
            if (!this.streamStarted) {
                this.streamStarted = true;
            }
            this.emit('mpeg1data', data);
        });

        this.streamProcess.stderr?.on('data', (data: string | Uint8Array) => {
            if (options.debug ?? false) {
                process.stderr.write(data);
            }
            if ((data as Buffer).toString('utf-8').includes('Server returned')) {
                const errorOutputLine: string = (data as Buffer).toString('utf-8');
                this.emit('liveErr', errorOutputLine.substr(errorOutputLine.indexOf('Server returned')));
                this.stop();
            }
        });

        this.streamProcess.on('exit', (code, signal) => {
            if (code != 0) {
                this.emit('ffmpeg process exited with error', code, signal);
            }
        });

        setTimeout(() => {
            if (!this.streamStarted) {
                this.emit('liveErr', 'Timeout');
                this.stop();
            }
        }, (options.timeout || 9) * 1000);
    }

    public stop(): void {
        this.streamProcess?.kill();
        this.removeAllListeners();
    }

}
