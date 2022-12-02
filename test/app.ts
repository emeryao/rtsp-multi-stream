import { VideoStream } from '../src/video-stream';

const streamer: VideoStream = new VideoStream({
    debug: true,
    wsPort: 9999,
    ffmpegPath: 'ffmpeg',
    ffmpegArgs: {
        '-b:v': '2048K',
        '-an': '',
        '-r': '24',
    },
});

streamer.start();

setTimeout(() => {
    console.info([...streamer.liveMuxers.keys()]);
}, 9999);
