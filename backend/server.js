const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/videos", express.static(path.join(__dirname, "generated_videos")));

// Helper function to find video files recursively
const findVideoFiles = async (dir, fileName) => {
  try {
    const files = [];

    const searchRecursively = async (currentDir) => {
      const items = await fs.readdir(currentDir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);

        if (item.isDirectory()) {
          await searchRecursively(fullPath);
        } else if (
          item.isFile() &&
          item.name.endsWith(".mp4") &&
          item.name.includes(fileName)
        ) {
          files.push(fullPath);
        }
      }
    };

    await searchRecursively(dir);
    return files;
  } catch (error) {
    console.error("Error searching for video files:", error);
    return [];
  }
};

// Check if Manim is available
const checkManimAvailability = () => {
  return new Promise((resolve) => {
    const testProcess = spawn("python", ["-m", "manim", "--version"], {
      stdio: "pipe",
    });

    testProcess.on("error", () => {
      console.log("Python -m manim not found, trying direct manim command");
      const fallbackProcess = spawn("manim", ["--version"], { stdio: "pipe" });

      fallbackProcess.on("error", () => {
        console.log("Manim not found in PATH");
        resolve(false);
      });

      fallbackProcess.on("close", (code) => {
        resolve(code === 0);
      });
    });

    testProcess.on("close", (code) => {
      resolve(code === 0);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      testProcess.kill();
      resolve(false);
    }, 10000);
  });
};

// Get the correct Manim command
const getManimCommand = async () => {
  return new Promise((resolve) => {
    const testProcess = spawn("python", ["-m", "manim", "--version"], {
      stdio: "pipe",
    });

    testProcess.on("error", () => {
      resolve(["manim"]);
    });

    testProcess.on("close", (code) => {
      if (code === 0) {
        resolve(["python", "-m", "manim"]);
      } else {
        resolve(["manim"]);
      }
    });
  });
};

// Ensure directories exist
const ensureDirectories = async () => {
  const dirs = ["temp", "generated_videos"];
  for (const dir of dirs) {
    try {
      await fs.access(dir);
      console.log(`Directory ${dir} exists`);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.log(`Created directory ${dir}`);
    }
  }
};

// Create a mock video for testing when Manim is not available
const createMockVideo = async (fileName, outputDir) => {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Manim Animation Preview</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: #000;
            color: white;
        }
        .preview {
            text-align: center;
            padding: 40px;
            border: 2px dashed #666;
            border-radius: 10px;
        }
        .animation {
            width: 100px;
            height: 100px;
            background: #ff6b6b;
            border-radius: 50%;
            margin: 20px auto;
            animation: bounce 2s infinite;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-30px); }
        }
        .code-preview {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="preview">
        <h2>Manim Code Generated</h2>
        <div class="animation"></div>
        <p>Manim is installed but not accessible via command line.</p>
        <p>The Python code was generated successfully.</p>
        <div class="code-preview" id="code-content">
            Loading generated code...
        </div>
        <p><strong>To run this code manually:</strong><br>
           Save as .py file and run: <code>python -m manim -pql yourfile.py SceneName</code></p>
    </div>
</body>
</html>`;

  const mockFilePath = path.join(outputDir, `${fileName}.html`);
  await fs.writeFile(mockFilePath, htmlContent, "utf8");
  return `${fileName}.html`;
};

// Helper: attempt a safe, context-aware bracket balancer to fix common mismatched bracket/paren errors
// Notes:
// - Minimal parser: ignores characters inside single/double/triple quotes to avoid touching string content.
// - When a closing bracket doesn't match the last opener, it replaces the closing with the expected one.
// - If openers remain at EOF, it appends the required closers.
// This is a heuristic fixer (not perfect) but fixes common generator bugs like `move_to([axes.c2p(...)))`.
const smartBalanceBrackets = (src) => {
  const openToClose = { "(": ")", "[": "]", "{": "}" };
  const closeToOpen = { ")": "(", "]": "[", "}": "{" };
  const chars = Array.from(src);
  const stack = [];
  let i = 0;

  // simple string literal state tracking
  let inSingle = false;
  let inDouble = false;
  let inTripleSingle = false;
  let inTripleDouble = false;

  while (i < chars.length) {
    const ch = chars[i];
    const next2 = i + 2 < chars.length ? chars[i + 1] + chars[i + 2] : "";

    // handle triple quotes start/end
    if (!inSingle && !inDouble) {
      if (!inTripleSingle && ch === "'" && next2 === "''") {
        inTripleSingle = true;
        i += 1; // will advance normally; still mark state
      } else if (inTripleSingle && ch === "'" && next2 === "''") {
        inTripleSingle = false;
        i += 1;
      } else if (!inTripleDouble && ch === '"' && next2 === '""') {
        inTripleDouble = true;
        i += 1;
      } else if (inTripleDouble && ch === '"' && next2 === '""') {
        inTripleDouble = false;
        i += 1;
      }
    }

    // skip any bracket handling if inside any string/triple string
    if (inSingle || inDouble || inTripleSingle || inTripleDouble) {
      // toggle single/double if it's starting/ending (and not escaped)
      if (!inTripleSingle && !inTripleDouble) {
        if (ch === "'" && !inDouble) {
          // check for escape
          const prev = chars[i - 1];
          if (prev !== "\\") inSingle = !inSingle;
        } else if (ch === '"' && !inSingle) {
          const prev = chars[i - 1];
          if (prev !== "\\") inDouble = !inDouble;
        }
      }
      i++;
      continue;
    }

    // Normal bracket parsing
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push({ ch, idx: i });
    } else if (ch === ")" || ch === "]" || ch === "}") {
      if (stack.length === 0) {
        // stray closer: try to ignore (leave as-is)
      } else {
        const top = stack[stack.length - 1];
        const expected = openToClose[top.ch];
        if (ch === expected) {
          stack.pop();
        } else {
          // mismatch: replace this closer with the expected one to balance the last opener
          chars[i] = expected;
          stack.pop();
        }
      }
    }
    i++;
  }

  // append missing closers for any remaining openers
  if (stack.length > 0) {
    for (let j = stack.length - 1; j >= 0; j--) {
      const expected = openToClose[stack[j].ch];
      chars.push(expected);
    }
  }

  return chars.join("");
};

app.post("/api/execute-manim", async (req, res) => {
  const { code } = req.body;

  console.log("Received request to execute Manim code");
  console.log("Code length:", code?.length || 0);

  if (!code) {
    console.error("No code provided in request");
    return res.status(400).json({ error: "No code provided" });
  }

  // Set headers for streaming response
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
  });

  const sendProgress = (progress, status) => {
    const message = JSON.stringify({ type: "progress", progress, status });
    console.log("Sending progress:", message);
    res.write(message + "\n");
  };

  const sendError = (message) => {
    const errorMessage = JSON.stringify({ type: "error", message });
    console.error("Sending error:", errorMessage);
    res.write(errorMessage + "\n");
    res.end();
  };

  const sendComplete = (result) => {
    const completeMessage = JSON.stringify({ type: "complete", result });
    console.log("Sending complete:", completeMessage);
    res.write(completeMessage + "\n");
    res.end();
  };

  try {
    await ensureDirectories();

    const timestamp = Date.now();
    const fileName = `animation_${timestamp}`;
    const tempFilePath = path.join(__dirname, "temp", `${fileName}.py`);
    const outputDir = path.join(__dirname, "generated_videos");

    console.log("Temp file path:", tempFilePath);
    console.log("Output directory:", outputDir);

    sendProgress(10, "Preparing Python file");

    // write original code
    await fs.writeFile(tempFilePath, code, "utf8");
    console.log("Written code to temp file");

    // Attempt quick automatic bracket fixes (non-destructive) before running Manim
    try {
      const originalSource = await fs.readFile(tempFilePath, "utf8");
      const fixedSource = smartBalanceBrackets(originalSource);

      if (fixedSource !== originalSource) {
        await fs.writeFile(tempFilePath, fixedSource, "utf8");
        console.log(
          "Applied automatic bracket/paren balancing fixes to temp file"
        );
        sendProgress(
          15,
          "Applied automatic syntax fixes (brackets/parentheses)"
        );
      }
    } catch (fixErr) {
      console.warn("Automatic bracket fixer failed:", fixErr);
    }

    // NEW: run a Python syntax check (py_compile) before invoking Manim
    try {
      const compileCheck = spawnSync(
        "python",
        ["-m", "py_compile", tempFilePath],
        {
          cwd: outputDir,
          encoding: "utf8",
        }
      );

      if (compileCheck.status !== 0) {
        // Try re-applying smart balancer once more (in case previous fix didn't run)
        try {
          const src = await fs.readFile(tempFilePath, "utf8");
          const reFixed = smartBalanceBrackets(src);
          if (reFixed !== src) {
            await fs.writeFile(tempFilePath, reFixed, "utf8");
            const recompile = spawnSync(
              "python",
              ["-m", "py_compile", tempFilePath],
              { encoding: "utf8" }
            );
            if (recompile.status !== 0) {
              const stderr = recompile.stderr || compileCheck.stderr || "";
              console.error("Python compile failed after fixes:", stderr);
              sendError(`Python syntax error:\n${stderr}`);
              return;
            } else {
              console.log("File compiles after re-fix, proceeding to Manim");
              sendProgress(17, "Syntax fixes applied, ready for rendering");
            }
          } else {
            const stderr = compileCheck.stderr || compileCheck.stdout || "";
            console.error("Python compile failed:", stderr);
            sendError(`Python syntax error:\n${stderr}`);
            return;
          }
        } catch (err) {
          console.error("Re-fix attempt failed:", err);
          const stderr = compileCheck.stderr || compileCheck.stdout || "";
          sendError(`Python syntax error:\n${stderr}`);
          return;
        }
      } else {
        console.log("Python syntax check passed");
      }
    } catch (err) {
      console.warn(
        "Failed to run python -m py_compile; proceeding to Manim (will surface errors):",
        err
      );
    }

    const manimCommand = await getManimCommand();
    console.log("Using Manim command:", manimCommand);

    const manimAvailable = await checkManimAvailability();

    if (!manimAvailable) {
      console.log("Manim not available, creating mock preview");
      sendProgress(30, "Manim not accessible, creating code preview...");

      const mockFile = await createMockVideo(fileName, outputDir);
      const videoUrl = `/videos/${mockFile}`;

      sendProgress(
        100,
        "Code preview ready (Fix Manim PATH for video generation)"
      );

      sendComplete({
        success: true,
        videoUrl: `http://localhost:${PORT}${videoUrl}`,
        videoPath: path.join(outputDir, mockFile),
        logs: ["Manim installed but not accessible via command line"],
        isMock: true,
        code: code, // Include the generated code
      });
      return;
    }

    sendProgress(20, "Starting Manim rendering");

    // Build args for Manim - remove preview flag (-p) so system media player won't open
    // use -ql (quick low) or -qm (medium) depending on desired quality.
    const args = [
      ...manimCommand.slice(1),
      "-ql",
      "--output_file",
      fileName,
      tempFilePath,
    ];
    const command = manimCommand[0];

    console.log("Executing command:", command, args);

    const manimProcess = spawn(command, args, {
      cwd: outputDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let logs = [];
    let hasError = false;

    manimProcess.stdout.on("data", (data) => {
      const output = data.toString();
      logs.push(output);
      console.log("Manim stdout:", output);

      // Parse progress from Manim output
      if (output.includes("INFO")) {
        if (output.includes("Writing")) {
          sendProgress(60, "Writing video frames");
        } else if (output.includes("Rendered")) {
          sendProgress(80, "Rendering complete");
        }
      }
    });

    manimProcess.stderr.on("data", (data) => {
      const error = data.toString();
      logs.push(error);
      console.error("Manim stderr:", error);

      if (
        error.toLowerCase().includes("error") ||
        error.toLowerCase().includes("exception")
      ) {
        hasError = true;
      }
    });

    manimProcess.on("close", async (exitCode) => {
      try {
        console.log("Manim process closed with code:", exitCode);

        // Clean up temp file
        try {
          await fs.unlink(tempFilePath);
          console.log("Cleaned up temp file");
        } catch (cleanupError) {
          console.warn("Failed to cleanup temp file:", cleanupError.message);
        }

        if (exitCode !== 0 || hasError) {
          const errorMsg = `Manim execution failed with exit code ${exitCode}. Logs: ${logs.join(
            "\n"
          )}`;
          console.error(errorMsg);
          sendError(errorMsg);
          return;
        }

        sendProgress(85, "Searching for generated video...");

        // Search for video files recursively in the media directory
        const videoFiles = await findVideoFiles(outputDir, fileName);
        console.log("Found video files:", videoFiles);

        if (videoFiles.length === 0) {
          // Fallback: list all files in output directory for debugging
          const allFiles = await fs.readdir(outputDir);
          console.log("All files in output directory:", allFiles);

          const errorMsg = `Video file not found after rendering. Expected file containing: ${fileName}. No video files found in media directory.`;
          console.error(errorMsg);
          sendError(errorMsg);
          return;
        }

        // Use the first found video file
        const videoPath = videoFiles[0];
        const relativePath = path.relative(outputDir, videoPath);
        const videoUrl = `/videos/${relativePath.replace(/\\/g, "/")}`;

        console.log("Video generated successfully at:", videoPath);
        console.log("Video URL:", videoUrl);

        sendProgress(95, "Video file found, preparing response...");

        // Read the video file to get its size info
        const stats = await fs.stat(videoPath);
        console.log(
          `Video file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
        );

        sendProgress(100, "Video ready!");

        // Add a small delay to ensure the 100% progress is visible
        setTimeout(() => {
          sendComplete({
            success: true,
            videoUrl: `http://localhost:${PORT}${videoUrl}`,
            videoPath: videoPath,
            logs,
            code: code,
            fileSize: stats.size,
          });
        }, 500);
      } catch (error) {
        console.error("Post-processing error:", error);
        sendError(`Post-processing error: ${error.message}`);
      }
    });

    manimProcess.on("error", (error) => {
      console.error("Failed to start Manim process:", error);
      sendError(`Failed to start Manim: ${error.message}`);
    });
  } catch (error) {
    console.error("Server error:", error);
    sendError(`Server error: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Checking Manim availability...");

  // Test both commands
  const testPythonManim = spawn("python", ["-m", "manim", "--version"], {
    stdio: "pipe",
  });
  testPythonManim.on("close", (code) => {
    if (code === 0) {
      console.log("✓ Manim available via: python -m manim");
    } else {
      console.log("✗ python -m manim failed");
      // Test direct manim command
      const testDirectManim = spawn("manim", ["--version"], { stdio: "pipe" });
      testDirectManim.on("close", (directCode) => {
        if (directCode === 0) {
          console.log("✓ Manim available via: manim");
        } else {
          console.log("✗ Direct manim command failed");
          console.log("💡 Try: python -m manim --version");
        }
      });
      testDirectManim.on("error", () => {
        console.log("✗ Direct manim command not found");
        console.log(
          "💡 Manim is installed but not in PATH. Use: python -m manim"
        );
      });
    }
  });
  testPythonManim.on("error", () => {
    console.log("✗ Python not found in PATH");
  });
});
