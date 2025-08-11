export interface GeminiResponse {
  code: string;
  explanation?: string;
}

export const generateManimCode = async (
  prompt: string,
  model: string = "gemini-1.5-pro"
): Promise<GeminiResponse> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please add VITE_GEMINI_API_KEY to your environment variables.");
  }

  const systemInstructions = `You are an expert Manim (Mathematical Animation Engine) developer. Your task is to generate high-quality Python code using Manim Community v0.19.0 to visualize data structures and algorithms.

CRITICAL MANIM SYNTAX RULES:
1. **move_to() method**: Use ONLY one argument for position: obj.move_to([x, y, z]) or obj.move_to(point)
2. **Positioning**: Use np.array([x, y, 0]) for 3D coordinates or [x, y] for 2D
3. **Colors**: Use predefined colors like RED, BLUE, GREEN, WHITE, etc.
4. **VGroup**: Always use VGroup() for grouping objects
5. **Proper imports**: from manim import *
6. **Scene class**: Must inherit from Scene and have construct(self) method

CORRECT EXAMPLES:
- bar.move_to(np.array([x_pos, y_pos, 0]))  # CORRECT
- bar.move_to([x_pos, y_pos, 0])  # CORRECT
- bar.move_to(x_pos, y_pos, 0)  # WRONG - will cause error

FRAME MANAGEMENT:
- Use self.camera.frame_width and self.camera.frame_height for boundaries
- Keep elements within [-7, 7] for x-axis and [-4, 4] for y-axis
- Use appropriate scaling for better visibility

ANIMATION BEST PRACTICES:
- Use self.play() for animations
- Use self.add() for static objects
- Include self.wait() between animations
- Use run_time parameter to control animation speed
- Create smooth transitions with Transform, FadeIn, FadeOut

DATA STRUCTURE VISUALIZATIONS:
- Use Rectangle for array elements/bars
- Use Circle for nodes
- Use Line or Arrow for connections/edges
- Use Text for labels and values
- Position elements with proper spacing

Generate ONLY the Python code with proper Manim syntax. No explanations before or after.`;

  const enhancedPrompt = `${prompt}

REQUIREMENTS:
- Create a clear, educational visualization
- Use proper Manim syntax (especially move_to() method)
- Include step-by-step animation
- Add descriptive text labels
- Use appropriate colors and sizing
- Ensure all elements fit within the frame
- Include timing pauses for comprehension`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `${systemInstructions}\n\nUser Request: ${enhancedPrompt}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2, // Lower temperature for more consistent code
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response generated from Gemini API");
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Extract Python code from the response
    const codeMatch = generatedText.match(/```python\n([\s\S]*?)\n```/) || 
                     generatedText.match(/```\n([\s\S]*?)\n```/);
    
    let code = codeMatch ? codeMatch[1] : generatedText;
    
    // Clean up the code
    code = code.trim();
    
    // Ensure proper imports if missing
    if (!code.includes('from manim import *')) {
      code = 'from manim import *\nimport numpy as np\n\n' + code;
    } else if (!code.includes('import numpy as np')) {
      code = code.replace('from manim import *', 'from manim import *\nimport numpy as np');
    }

    // Fix common syntax errors
    code = fixCommonManimErrors(code);

    return {
      code,
      explanation: generatedText.includes('```') ? 
        generatedText.replace(/```python[\s\S]*?```/g, '').trim() : 
        undefined
    };

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error(
      error instanceof Error ? 
      `Failed to generate code: ${error.message}` : 
      'Failed to generate code: Unknown error'
    );
  }
};

// Fix common Manim syntax errors
const fixCommonManimErrors = (code: string): string => {
  let fixedCode = code;
  
  // Fix move_to() calls with multiple arguments
  // Replace patterns like: obj.move_to(x, y, z) with obj.move_to([x, y, z])
  fixedCode = fixedCode.replace(
    /(\w+)\.move_to\s*\(\s*([^,\[\]]+)\s*,\s*([^,\[\]]+)\s*(?:,\s*([^,\[\]]+))?\s*\)/g,
    (match, obj, x, y, z) => {
      if (z !== undefined) {
        return `${obj}.move_to([${x}, ${y}, ${z}])`;
      } else {
        return `${obj}.move_to([${x}, ${y}, 0])`;
      }
    }
  );
  
  // Fix common positioning issues
  fixedCode = fixedCode.replace(/\.move_to\(UP \* ([^)]+)\)/g, '.move_to([0, $1, 0])');
  fixedCode = fixedCode.replace(/\.move_to\(DOWN \* ([^)]+)\)/g, '.move_to([0, -$1, 0])');
  fixedCode = fixedCode.replace(/\.move_to\(LEFT \* ([^)]+)\)/g, '.move_to([-$1, 0, 0])');
  fixedCode = fixedCode.replace(/\.move_to\(RIGHT \* ([^)]+)\)/g, '.move_to([$1, 0, 0])');
  
  return fixedCode;
};