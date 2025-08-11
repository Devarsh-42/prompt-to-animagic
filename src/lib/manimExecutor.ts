export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  videoPath?: string;
  error?: string;
  logs?: string[];
}

export const executeManimCode = async (
  code: string,
  onProgress?: (progress: number, status: string) => void
): Promise<VideoGenerationResult> => {
  try {
    onProgress?.(5, 'Connecting to backend...');
    
    const response = await fetch('/api/execute-manim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body from backend');
    }

    let result: VideoGenerationResult = { success: false };
    let receivedData = false;
    
    onProgress?.(10, 'Reading response stream...');
    
    // Read streaming response
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          receivedData = true;
          
          console.log('Received data:', data); // Debug logging
          
          if (data.type === 'progress') {
            onProgress?.(data.progress, data.status);
          } else if (data.type === 'complete') {
            result = data.result;
            console.log('Complete result:', result); // Debug logging
          } else if (data.type === 'error') {
            throw new Error(`Backend error: ${data.message}`);
          }
        } catch (parseError) {
          console.warn('Failed to parse JSON line:', line, parseError);
          // Continue processing other lines
        }
      }
    }
    
    if (!receivedData) {
      throw new Error('No data received from backend');
    }
    
    console.log('Final result:', result); // Debug logging
    return result;
    
  } catch (error) {
    console.error('Error executing Manim code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};