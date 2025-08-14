import { supabase } from '@/integrations/supabase/client';

export interface VideoRecord {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  code: string;
  video_url: string;
  file_path: string;
  created_at: string;
}

export const uploadVideoToSupabase = async (
  videoFile: File | Blob,
  fileName: string,
  metadata: {
    title: string;
    prompt: string;
    code: string;
  }
): Promise<VideoRecord | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create unique file path
    const timestamp = Date.now();
    const filePath = `${user.id}/${timestamp}_${fileName}`;
    
    // Upload video to storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('manim-videos')
      .upload(filePath, videoFile, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('manim-videos')
      .getPublicUrl(filePath);

    // Save record to database
    const { data: videoRecord, error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        title: metadata.title,
        prompt: metadata.prompt,
        code: metadata.code,
        video_url: publicUrl,
        file_path: filePath
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return videoRecord;
  } catch (error) {
    console.error('Error uploading video:', error);
    return null;
  }
};

export const getUserVideos = async (): Promise<VideoRecord[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
};

export const deleteVideo = async (videoId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get video record to find file path
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('file_path')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !video) {
      throw new Error('Video not found');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('manim-videos')
      .remove([video.file_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', user.id);

    if (dbError) {
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Error deleting video:', error);
    return false;
  }
};