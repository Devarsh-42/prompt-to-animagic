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

PROFESSIONAL POSITIONING GUIDELINES:
- **Frame boundaries**: Keep all elements within x: [-6, 6] and y: [-3.5, 3.5]
- **Title positioning**: Place titles at y=3 to y=2.5 range
- **Main content**: Center main visualizations between y=-0.5 to y=2
- **Labels/descriptions**: Place at y=-2 to y=-3 range
- **Proper spacing**: Minimum 0.5 units between elements
- **Scaling**: Use appropriate sizes - titles (font_size=36), labels (font_size=24), values (font_size=18)
- **Alignment**: Use .arrange() method for automatic spacing in VGroup

LAYOUT STRUCTURE EXAMPLE:
\`\`\`python
# Title at top
title = Text("Algorithm Name", font_size=36).move_to([0, 2.8, 0])

# Main visualization in center
main_group = VGroup().move_to([0, 0.5, 0])

# Description at bottom
description = Text("Step description", font_size=20).move_to([0, -2.5, 0])

# Arrange groups properly
scene_group = VGroup(title, main_group, description)
scene_group.arrange(DOWN, buff=0.8)
\`\`\`

ANIMATION BEST PRACTICES:
- Use self.play() for smooth animations
- Include self.wait(1) between major steps
- Use Transform for object changes
- Scale objects appropriately for visibility
- Ensure text is readable (min font_size=18)
- Use consistent colors throughout
- Add progress indicators for multi-step algorithms

DATA STRUCTURE SPECIFIC RULES:
- **Arrays**: Use Rectangle width=0.8, height=0.8, spacing=0.1
- **Trees**: Use Circle radius=0.3, vertical spacing=1.5, horizontal spacing=1.0
- **Graphs**: Use Circle nodes radius=0.25, Line edges with arrows
- **Bars**: Scale height proportionally, max height=2.5

Generate ONLY the Python code with professional layout and positioning.`;

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

// Enhanced error fixing function
const fixCommonManimErrors = (code: string): string => {
  let fixedCode = code;
  
  // Fix move_to() calls with multiple arguments
  fixedCode = fixedCode.replace(
    /(\w+)\.move_to\s*\(\s*([^,[\]]+)\s*,\s*([^,[\]]+)\s*(?:,\s*([^,[\]]+))?\s*\)/g,
    (match, obj, x, y, z) => {
      if (z !== undefined) {
        return `${obj}.move_to([${x}, ${y}, ${z}])`;
      } else {
        return `${obj}.move_to([${x}, ${y}, 0])`;
      }
    }
  );
  
  // Fix positioning to stay within frame
  fixedCode = fixedCode.replace(/move_to\(\[([^,]+),\s*([^,]+),\s*([^,]+)\]\)/g, (match, x, y, z) => {
    // Only process if we can parse the coordinates as numbers
    const xStr = x.trim();
    const yStr = y.trim();
    const zStr = z.trim();
    
    // Skip if coordinates contain variables or complex expressions
    if (xStr.match(/[a-zA-Z_]/) || yStr.match(/[a-zA-Z_]/)) {
      return match; // Return original if it contains variables
    }
    
    const xVal = parseFloat(xStr);
    const yVal = parseFloat(yStr);
    
    if (!isNaN(xVal) && !isNaN(yVal)) {
      const clampedX = Math.max(-6, Math.min(6, xVal));
      const clampedY = Math.max(-3.5, Math.min(3.5, yVal));
      return `move_to([${clampedX}, ${clampedY}, ${zStr}])`;
    }
    
    return match; // Return original if parsing fails
  });
  
  // Add proper spacing for VGroup if arrange is not present
  if (!fixedCode.includes('.arrange(') && fixedCode.includes('VGroup(')) {
    // This is a basic enhancement - only add arrange to simple VGroup patterns
    fixedCode = fixedCode.replace(
      /(VGroup\([^)]*\))(?!\s*\.)/g,
      '$1.arrange(DOWN, buff=0.5)'
    );
  }
  
  return fixedCode;
};