#!/usr/bin/env bash
# Renders Gource animation of the lmaa.space WebApp repo and exports MP4 + HLS.
# If .gource/background.mp3 (or .m4a/.wav/.ogg) exists, it's mixed in as audio.
#
# Output: .gource/lmaa-history.mp4
# HLS:    .gource/lmaa-history-hls/index.m3u8
#
# Usage: ./gource.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AVATAR_DIR="$SCRIPT_DIR/.gource/avatars"
OUTPUT=".gource/lmaa-history.mp4"
SILENT=".gource/lmaa-history-silent.mp4"
HLS_DIR=".gource/lmaa-history-hls"
HLS_PLAYLIST="$HLS_DIR/index.m3u8"
HLS_SEGMENT_SECONDS=6
AUDIO_VOLUME=0.4
AUDIO_CROSSFADE_SECONDS=3
AUDIO_EDGE_FADE_SECONDS=3

get_media_duration() {
  ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"
}

clamp_fade_duration() {
  local media_duration="$1"
  local requested_duration="$2"

  awk -v media="$media_duration" -v requested="$requested_duration" 'BEGIN {
    fade = requested;
    max = media / 2;
    if (fade > max) fade = max;
    if (fade < 0) fade = 0;
    printf "%.3f", fade;
  }'
}

calculate_audio_repeats() {
  local video_duration="$1"
  local audio_duration="$2"
  local crossfade_duration="$3"

  awk -v video="$video_duration" -v audio="$audio_duration" -v fade="$crossfade_duration" 'BEGIN {
    if (video <= audio) {
      print 1;
      exit;
    }

    step = audio - fade;
    if (step <= 0) step = audio;

    repeats = 1;
    duration = audio;
    while (duration < video) {
      repeats += 1;
      duration += step;
    }

    print repeats;
  }'
}

build_audio_filter() {
  local video_duration="$1"
  local repeat_count="$2"
  local crossfade_duration="$3"
  local edge_fade_duration="$4"
  local edge_fade_start="$5"

  local filter=""
  local previous_label=""
  local next_label=""

  for ((i = 0; i < repeat_count; i++)); do
    filter+="[$((i + 1)):a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${AUDIO_VOLUME}[a${i}];"
  done

  previous_label="a0"
  for ((i = 1; i < repeat_count; i++)); do
    next_label="xf${i}"
    filter+="[${previous_label}][a${i}]acrossfade=d=${crossfade_duration}:c1=tri:c2=tri[${next_label}];"
    previous_label="$next_label"
  done

  filter+="[${previous_label}]atrim=0:${video_duration},asetpts=N/SR/TB"
  if awk -v fade="$edge_fade_duration" 'BEGIN { exit !(fade > 0) }'; then
    filter+=",afade=t=in:d=${edge_fade_duration},afade=t=out:st=${edge_fade_start}:d=${edge_fade_duration}"
  fi
  filter+="[audio]"

  printf "%s" "$filter"
}

generate_hls_output() {
  local input="$1"

  rm -rf "$HLS_DIR"
  mkdir -p "$HLS_DIR"

  ffmpeg -y -i "$input" \
    -map 0:v:0 -map "0:a?" \
    -c:v copy -c:a copy \
    -hls_time "$HLS_SEGMENT_SECONDS" \
    -hls_playlist_type vod \
    -hls_flags independent_segments \
    -hls_segment_filename "$HLS_DIR/segment_%03d.ts" \
    "$HLS_PLAYLIST"
}

# --- Detect background audio ---
AUDIO=""
for ext in mp3 m4a wav ogg; do
  if [[ -f ".gource/background.$ext" ]]; then
    AUDIO=".gource/background.$ext"
    break
  fi
done

# --- Render video ---
echo "Rendering repo history..."
gource --load-config .gource.conf \
  --user-image-dir "$AVATAR_DIR" \
  --stop-at-end --disable-input \
  -o - \
| ffmpeg -y -r 60 -f image2pipe -vcodec ppm -i - \
    -vcodec libx264 -preset medium -pix_fmt yuv420p -crf 18 \
    -g 120 -keyint_min 120 -sc_threshold 0 \
    "$SILENT"

# --- Mux audio if available ---
if [[ -n "$AUDIO" ]]; then
  echo "Mixing audio: $AUDIO"
  VIDEO_DURATION="$(get_media_duration "$SILENT")"
  AUDIO_DURATION="$(get_media_duration "$AUDIO")"
  CROSSFADE_DURATION="$(clamp_fade_duration "$AUDIO_DURATION" "$AUDIO_CROSSFADE_SECONDS")"
  EDGE_FADE_DURATION="$(clamp_fade_duration "$VIDEO_DURATION" "$AUDIO_EDGE_FADE_SECONDS")"
  EDGE_FADE_START="$(awk -v video="$VIDEO_DURATION" -v fade="$EDGE_FADE_DURATION" 'BEGIN {
    start = video - fade;
    if (start < 0) start = 0;
    printf "%.3f", start;
  }')"
  AUDIO_REPEATS="$(calculate_audio_repeats "$VIDEO_DURATION" "$AUDIO_DURATION" "$CROSSFADE_DURATION")"
  AUDIO_FILTER="$(build_audio_filter "$VIDEO_DURATION" "$AUDIO_REPEATS" "$CROSSFADE_DURATION" "$EDGE_FADE_DURATION" "$EDGE_FADE_START")"

  AUDIO_INPUTS=()
  for ((i = 0; i < AUDIO_REPEATS; i++)); do
    AUDIO_INPUTS+=(-i "$AUDIO")
  done

  echo "Audio duration: ${AUDIO_DURATION}s; video duration: ${VIDEO_DURATION}s"
  echo "Audio repeats: $AUDIO_REPEATS; loop crossfade: ${CROSSFADE_DURATION}s"

  ffmpeg -y -i "$SILENT" "${AUDIO_INPUTS[@]}" \
    -filter_complex "$AUDIO_FILTER" \
    -map 0:v:0 -map "[audio]" \
    -c:v copy -c:a aac -b:a 192k \
    -shortest -movflags +faststart \
    "$OUTPUT"
  rm "$SILENT"
else
  ffmpeg -y -i "$SILENT" -c copy -movflags +faststart "$OUTPUT"
  rm "$SILENT"
fi

echo "Generating HLS output..."
generate_hls_output "$OUTPUT"

echo "Done -> $OUTPUT"
echo "HLS  -> $HLS_PLAYLIST"
