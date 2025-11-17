"""
YouTube Captions Extractor

A script to extract and display captions/subtitles from YouTube videos.
Supports multiple YouTube URL formats and provides options to save output.
"""

import re
import sys
from typing import Optional
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    TooManyRequests
)


def extract_video_id(url_or_id: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats or return the ID if already provided.
    
    Supported formats:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://m.youtube.com/watch?v=VIDEO_ID
    - VIDEO_ID (direct ID)
    
    Args:
        url_or_id: YouTube URL or video ID
        
    Returns:
        Video ID string or None if extraction fails
    """
    # If it's already just an ID (alphanumeric, dashes, underscores, 11 chars typical)
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id
    
    # Pattern to match various YouTube URL formats
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    
    return None


def get_transcript(video_id: str, languages: Optional[list] = None) -> str:
    """
    Fetch transcript for a YouTube video.
    
    Args:
        video_id: YouTube video ID
        languages: Optional list of language codes (e.g., ['en', 'es'])
                   If None, tries to fetch in available languages
        
    Returns:
        Combined transcript text as a string
        
    Raises:
        Various exceptions from YouTubeTranscriptApi
    """
    try:
        if languages:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
        else:
            # Try to get transcript in any available language
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            transcript = transcript_list.find_transcript(['en', 'es', 'fr', 'de', 'it', 'pt'])
            transcript = transcript.fetch()
        
        # Combine all text entries
        captions = " ".join([item["text"] for item in transcript])
        return captions
        
    except TranscriptsDisabled:
        raise Exception(f"Transcripts are disabled for video ID: {video_id}")
    except NoTranscriptFound:
        raise Exception(f"No transcript found for video ID: {video_id}")
    except VideoUnavailable:
        raise Exception(f"Video is unavailable or doesn't exist: {video_id}")
    except TooManyRequests:
        raise Exception("Too many requests. Please try again later.")
    except Exception as e:
        raise Exception(f"An error occurred: {str(e)}")


def main():
    """Main function to run the YouTube captions extractor."""
    # Default video URL/ID - can be changed here or passed as command-line argument
    if len(sys.argv) > 1:
        video_input = sys.argv[1]
    else:
        video_input = "https://www.youtube.com/watch?v=VIDEO_ID"
    
    # Extract video ID
    video_id = extract_video_id(video_input)
    
    if not video_id:
        print("\n❌ Error: Could not extract video ID from the provided input.")
        print("Please provide a valid YouTube URL or video ID.")
        print("\nSupported formats:")
        print("  - https://www.youtube.com/watch?v=VIDEO_ID")
        print("  - https://youtu.be/VIDEO_ID")
        print("  - VIDEO_ID (direct ID)")
        sys.exit(1)
    
    print(f"\n📹 Extracting captions for video ID: {video_id}")
    print("⏳ Please wait...\n")
    
    try:
        captions = get_transcript(video_id)
        
        print("=" * 60)
        print("CAPTIONS")
        print("=" * 60)
        print(captions)
        print("=" * 60)
        
        # Option to save to file
        save_option = input("\n💾 Save to file? (y/n): ").strip().lower()
        if save_option == 'y':
            filename = f"captions_{video_id}.txt"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"YouTube Video ID: {video_id}\n")
                f.write(f"URL: https://www.youtube.com/watch?v={video_id}\n")
                f.write("=" * 60 + "\n")
                f.write("CAPTIONS\n")
                f.write("=" * 60 + "\n")
                f.write(captions)
            print(f"✅ Captions saved to: {filename}")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Operation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nPossible reasons:")
        print("  - Video doesn't have captions/subtitles enabled")
        print("  - Video is unavailable or private")
        print("  - Network connection issues")
        sys.exit(1)


if __name__ == "__main__":
    main()

