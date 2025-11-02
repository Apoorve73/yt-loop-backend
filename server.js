import express from 'express';
import cors from 'cors';
import { exec } from "child_process";
import { v4 as uuid } from "uuid";

// The following lines are used to obtain the current file's filename and directory in ES modules (since __filename and __dirname are not available by default):
import path from "path"; // Import Node's path module to work with file and directory paths
import { fileURLToPath } from "url"; // Import fileURLToPath to convert import.meta.url to a file path

const __filename = fileURLToPath(import.meta.url); // Get the absolute path of the current file
const __dirname = path.dirname(__filename); // Get the directory name of the current file

const app = express();
app.use(express.json());
app.use(cors());

// This line serves static files in the "files" directory at the "/files" route.
// That means if you access http://<server-address>/files/filename.ext, the file "filename.ext"
// in the "files" folder on the server will be returned as a static file.
// `express.static` is middleware provided by Express for serving such static files.
// `path.join(__dirname, "files")` constructs the absolute path to the files directory.
app.use("/files", express.static(path.join(__dirname, "files")));

app.post("/process-audio", (req, res) => {
    const { url, loops, audioFormat = 'mp3' } = req.body;

    if (!url || !loops) {
        return res.status(400).json({
            error: "url and loops required"
        });
    }

    const allowedFormats = ["mp3", "wav"];
    if (!allowedFormats.includes(audioFormat)) {
        return res.status(400).json({
            error: `Invalid format. Allowed: ${allowedFormats.join(", ")}`
        });
    }

    const id = uuid();
    const inputPath = `files/${id}.mp3`;
    const outputPath = `files/${id}-looped.${audioFormat}`;

    // Step 1: download and convert to audio file
    // yt-dlp internally uses ffmpeg so conversion still works
    const downloadCmd = `yt-dlp -f bestaudio -x --audio-format ${audioFormat} -o ${inputPath} "${url}"`;

    exec(downloadCmd, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                error: "Error downloading audio file"
            });
        }

        let loopCmd;

        if (audioFormat === "mp3") {
            // Using -c:a applies the codec option only to audio streams, while -c would apply it to both audio and video streams.
            // Because we are dealing with an audio-only file, both would technically work here, but -c:a is clearer and more explicit.
            loopCmd = `ffmpeg -stream_loop ${loops - 1} -i ${inputPath} -c:a copy ${outputPath}`;
        } else if (audioFormat === "wav") {
            loopCmd = `ffmpeg -stream_loop ${loops - 1} -i ${inputPath} -c:a pcm_s16le ${outputPath}`;
        }

        exec(loopCmd, (err2) => {
            if (err2) {
                console.log(err2);
                return res.status(500).json({ error: "Looping failed" });
            }

            return res.json({
                message: `Successfully processed ${audioFormat} (${loops} loops)`,
                format: audioFormat,
                loops,
                downloadUrl: `${req.protocol}://${req.get("host")}/${outputPath}`
            });
        });
    });
});

app.listen(3000, () => console.log(`Running on port 3000`));
