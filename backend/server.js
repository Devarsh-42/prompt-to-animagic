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

// Check if Manim is available
const checkManimAvailability = () => {
  return new Promise((resolve) => {
    // Try python -m manim first (more reliable on Windows)
    const testProcess = spawn("python", ["-m", "manim", "--version"], {
      stdio: "pipe",
    });

    testProcess.on("error", () => {
      console.log("Python -m manim not found, trying direct manim command");
      // Fallback to direct manim command
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
    // Try python -m manim first
    const testProcess = spawn("python", ["-m", "manim", "--version"], {
      stdio: "pipe",
    });

    testProcess.on("error", () => {
      // Fallback to direct manim command
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

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `animation_${timestamp}`;
    const tempFilePath = path.join(__dirname, "temp", `${fileName}.py`);
    const outputDir = path.join(__dirname, "generated_videos");

    console.log("Temp file path:", tempFilePath);
    console.log("Output directory:", outputDir);

    sendProgress(10, "Preparing Python file");

    // Write Python code to temporary file
    await fs.writeFile(tempFilePath, code, "utf8");
    console.log("Written code to temp file");

    // Get the correct Manim command
    const manimCommand = await getManimCommand();
    console.log("Using Manim command:", manimCommand);

    // Check if Manim is available
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

    // Build the full command arguments
    const args = [
      ...manimCommand.slice(1),
      "-pql",
      "--output_file",
      fileName,
      tempFilePath,
    ];
    const command = manimCommand[0];

    console.log("Executing command:", command, args);

    // Execute Manim command
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

        sendProgress(90, "Finalizing video");

        // Find the generated video file
        const videoFiles = await fs.readdir(outputDir);
        console.log("Files in output directory:", videoFiles);

        const videoFile = videoFiles.find(
          (file) => file.includes(fileName) && file.endsWith(".mp4")
        );

        if (!videoFile) {
          const errorMsg = `Video file not found after rendering. Expected file containing: ${fileName}. Found files: ${videoFiles.join(
            ", "
          )}`;
          console.error(errorMsg);
          sendError(errorMsg);
          return;
        }

        const videoPath = path.join(outputDir, videoFile);
        const videoUrl = `/videos/${videoFile}`;

        console.log("Video generated successfully:", videoFile);

        sendProgress(100, "Video ready");

        sendComplete({
          success: true,
          videoUrl: `http://localhost:${PORT}${videoUrl}`,
          videoPath,
          logs,
          code: code,
        });
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
