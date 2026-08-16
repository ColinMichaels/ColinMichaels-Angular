import type {BlockTool, BlockToolConstructorOptions, SanitizerConfig} from '@editorjs/editorjs';

import {isVideoUploadDate} from '../../../../../features/blog/utils/blog-youtube-journey.util';
import {getYouTubeVideoId} from '../../../../../features/youtube/utils/youtube-url.util';

export interface YouTubeEmbedBlockData {
  url?: string;
  isCompanionVideo?: boolean;
  videoTitle?: string;
  videoDescription?: string;
  videoUploadDate?: string;
  videoDurationSeconds?: number;
}

const plainTextSanitizer: SanitizerConfig = {};

export class YouTubeEmbedBlockTool implements BlockTool {
  static get toolbox(): {title: string; icon: string} {
    return {
      title: 'YouTube',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="1.75" y="4" width="14.5" height="10" rx="2.5" fill="currentColor"/><path d="m7.25 6.75 4 2.25-4 2.25v-4.5Z" fill="white"/></svg>',
    };
  }

  static get sanitize(): Record<string, SanitizerConfig> {
    return {
      url: plainTextSanitizer,
      isCompanionVideo: plainTextSanitizer,
      videoTitle: plainTextSanitizer,
      videoDescription: plainTextSanitizer,
      videoUploadDate: plainTextSanitizer,
      videoDurationSeconds: plainTextSanitizer,
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  private readonly data: {
    url: string;
    isCompanionVideo: boolean;
    videoTitle: string;
    videoDescription: string;
    videoUploadDate: string;
    videoDurationSeconds: number | null;
  };
  private readonly readOnly: boolean;

  constructor(options: BlockToolConstructorOptions<YouTubeEmbedBlockData>) {
    this.data = {
      url: typeof options.data?.url === 'string' ? options.data.url : '',
      isCompanionVideo: options.data?.isCompanionVideo === true,
      videoTitle: typeof options.data?.videoTitle === 'string' ? options.data.videoTitle : '',
      videoDescription: typeof options.data?.videoDescription === 'string' ? options.data.videoDescription : '',
      videoUploadDate: typeof options.data?.videoUploadDate === 'string' ? options.data.videoUploadDate : '',
      videoDurationSeconds: typeof options.data?.videoDurationSeconds === 'number'
      && Number.isFinite(options.data.videoDurationSeconds)
        ? options.data.videoDurationSeconds
        : null,
    };
    this.readOnly = options.readOnly;
  }

  render(): HTMLElement {
    const wrapper = document.createElement('section');
    wrapper.className = 'cms-youtube-embed-tool';
    wrapper.style.cssText = [
      'border:1px solid #d4d4d8',
      'border-left:4px solid #dc2626',
      'background:#fafafa',
      'padding:16px',
      'font-family:Arimo, sans-serif',
      'color:#18181b',
    ].join(';');

    const heading = document.createElement('p');
    heading.textContent = 'YouTube video';
    heading.style.cssText = 'margin:0;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#b91c1c';

    const description = document.createElement('p');
    description.textContent = 'Paste a YouTube watch, short, or share URL. The saved block remains compatible with existing posts.';
    description.style.cssText = 'margin:4px 0 12px;font-size:12px;line-height:1.45;color:#52525b';

    const label = document.createElement('label');
    label.style.cssText = 'display:block';

    const labelText = document.createElement('span');
    labelText.textContent = 'Video URL';
    labelText.style.cssText = 'display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#71717a';

    const input = document.createElement('input');
    input.type = 'url';
    input.value = this.data.url;
    input.placeholder = 'https://www.youtube.com/watch?v=...';
    input.readOnly = this.readOnly;
    input.dataset['youtubeEmbedUrl'] = 'true';
    input.style.cssText = 'display:block;width:100%;box-sizing:border-box;border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:14px;color:#18181b;outline:none';

    const preview = document.createElement('div');
    preview.dataset['youtubeEmbedPreview'] = 'true';
    preview.style.cssText = 'margin-top:12px';

    const updatePreview = (): void => renderPreview(preview, input.value);
    input.addEventListener('input', updatePreview);

    const companionLabel = document.createElement('label');
    companionLabel.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-top:12px;border:1px solid #d4d4d8;background:#fff;padding:11px 12px';

    const companionInput = document.createElement('input');
    companionInput.type = 'checkbox';
    companionInput.checked = this.data.isCompanionVideo;
    companionInput.disabled = this.readOnly;
    companionInput.dataset['youtubeCompanionVideo'] = 'true';
    companionInput.style.cssText = 'margin-top:2px';

    const companionCopy = document.createElement('span');
    companionCopy.style.cssText = 'display:grid;gap:3px';

    const companionTitle = document.createElement('strong');
    companionTitle.textContent = 'Use as this article\'s companion video';
    companionTitle.style.cssText = 'font-size:13px;color:#27272a';

    const companionDescription = document.createElement('span');
    companionDescription.textContent = 'Adds an exact Watch next card after the article. Select only one YouTube block per post.';
    companionDescription.style.cssText = 'font-size:12px;line-height:1.45;color:#71717a';

    companionCopy.append(companionTitle, companionDescription);
    companionLabel.append(companionInput, companionCopy);

    const metadataPanel = document.createElement('section');
    metadataPanel.hidden = !companionInput.checked;
    metadataPanel.dataset['youtubeVideoMetadata'] = 'true';
    metadataPanel.style.cssText = 'margin-top:12px;border:1px solid #d4d4d8;background:#fff;padding:12px;display:grid;gap:12px';

    const metadataHeading = document.createElement('strong');
    metadataHeading.textContent = 'Companion video search metadata';
    metadataHeading.style.cssText = 'font-size:13px;color:#27272a';

    const metadataDescription = document.createElement('p');
    metadataDescription.textContent = 'Copy the exact public YouTube title, description, upload date, and runtime. Complete metadata can qualify the article for video structured data; incomplete fields are never guessed.';
    metadataDescription.style.cssText = 'margin:-7px 0 0;font-size:12px;line-height:1.45;color:#71717a';

    const titleField = createMetadataTextField({
      label: 'Public video title',
      value: this.data.videoTitle,
      placeholder: 'Exact title shown on YouTube',
      dataAttribute: 'youtubeVideoTitle',
      readOnly: this.readOnly,
    });
    const descriptionField = createMetadataTextAreaField({
      label: 'Public video description',
      value: this.data.videoDescription,
      placeholder: 'A factual description of this exact video',
      dataAttribute: 'youtubeVideoDescription',
      readOnly: this.readOnly,
    });
    const uploadDateField = createMetadataTextField({
      label: 'Upload date',
      value: this.data.videoUploadDate,
      placeholder: '2026-08-13 or 2026-08-13T13:43:21Z',
      dataAttribute: 'youtubeVideoUploadDate',
      readOnly: this.readOnly,
    });

    const durationLabel = document.createElement('label');
    durationLabel.style.cssText = 'display:block';
    const durationLabelText = document.createElement('span');
    durationLabelText.textContent = 'Runtime in seconds';
    durationLabelText.style.cssText = metadataLabelStyle;
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = '0.001';
    durationInput.step = '0.001';
    durationInput.value = this.data.videoDurationSeconds === null ? '' : String(this.data.videoDurationSeconds);
    durationInput.placeholder = '158';
    durationInput.readOnly = this.readOnly;
    durationInput.dataset['youtubeVideoDurationSeconds'] = 'true';
    durationInput.style.cssText = metadataInputStyle;
    durationLabel.append(durationLabelText, durationInput);

    companionInput.addEventListener('change', () => {
      metadataPanel.hidden = !companionInput.checked;
    });

    metadataPanel.append(
      metadataHeading,
      metadataDescription,
      titleField,
      descriptionField,
      uploadDateField,
      durationLabel
    );

    label.append(labelText, input);
    wrapper.append(heading, description, label, companionLabel, metadataPanel, preview);
    updatePreview();

    return wrapper;
  }

  save(block: HTMLElement): YouTubeEmbedBlockData {
    const data: YouTubeEmbedBlockData = {
      url: block.querySelector<HTMLInputElement>('[data-youtube-embed-url]')?.value.trim() ?? '',
    };

    const isCompanionVideo = block.querySelector<HTMLInputElement>('[data-youtube-companion-video]')?.checked === true;

    if (isCompanionVideo) {
      data.isCompanionVideo = true;
    }

    const videoTitle = block.querySelector<HTMLInputElement>('[data-youtube-video-title]')?.value.trim() ?? '';
    const videoDescription = block.querySelector<HTMLTextAreaElement>('[data-youtube-video-description]')?.value.trim() ?? '';
    const videoUploadDate = block.querySelector<HTMLInputElement>('[data-youtube-video-upload-date]')?.value.trim() ?? '';
    const durationValue = block.querySelector<HTMLInputElement>('[data-youtube-video-duration-seconds]')?.value.trim() ?? '';
    const videoDurationSeconds = Number(durationValue);

    if (isCompanionVideo) {
      if (videoTitle) {
        data.videoTitle = videoTitle;
      }
      if (videoDescription) {
        data.videoDescription = videoDescription;
      }
      if (videoUploadDate) {
        data.videoUploadDate = videoUploadDate;
      }
      if (durationValue && Number.isFinite(videoDurationSeconds) && videoDurationSeconds > 0) {
        data.videoDurationSeconds = videoDurationSeconds;
      }
    }

    return data;
  }

  validate(data: YouTubeEmbedBlockData): boolean {
    const hasVideoMetadata = data.videoTitle !== undefined
      || data.videoDescription !== undefined
      || data.videoUploadDate !== undefined
      || data.videoDurationSeconds !== undefined;

    return (!hasVideoMetadata || data.isCompanionVideo === true)
      && getYouTubeVideoId(data.url ?? '') !== null
      && (data.videoTitle === undefined || typeof data.videoTitle === 'string')
      && (data.videoDescription === undefined || typeof data.videoDescription === 'string')
      && (data.videoUploadDate === undefined
        || (typeof data.videoUploadDate === 'string' && isVideoUploadDate(data.videoUploadDate)))
      && (data.videoDurationSeconds === undefined
        || (typeof data.videoDurationSeconds === 'number'
          && Number.isFinite(data.videoDurationSeconds)
          && data.videoDurationSeconds > 0));
  }
}

const metadataLabelStyle = 'display:block;margin-bottom:5px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#71717a';
const metadataInputStyle = 'display:block;width:100%;box-sizing:border-box;border:1px solid #d4d4d8;background:#fff;padding:9px 10px;font:inherit;font-size:14px;color:#18181b;outline:none';

function createMetadataTextField(options: {
  label: string;
  value: string;
  placeholder: string;
  dataAttribute: string;
  readOnly: boolean;
}): HTMLLabelElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:block';
  const labelText = document.createElement('span');
  labelText.textContent = options.label;
  labelText.style.cssText = metadataLabelStyle;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = options.value;
  input.placeholder = options.placeholder;
  input.readOnly = options.readOnly;
  input.dataset[options.dataAttribute] = 'true';
  input.style.cssText = metadataInputStyle;
  label.append(labelText, input);

  return label;
}

function createMetadataTextAreaField(options: {
  label: string;
  value: string;
  placeholder: string;
  dataAttribute: string;
  readOnly: boolean;
}): HTMLLabelElement {
  const label = document.createElement('label');
  label.style.cssText = 'display:block';
  const labelText = document.createElement('span');
  labelText.textContent = options.label;
  labelText.style.cssText = metadataLabelStyle;
  const input = document.createElement('textarea');
  input.value = options.value;
  input.placeholder = options.placeholder;
  input.readOnly = options.readOnly;
  input.rows = 3;
  input.dataset[options.dataAttribute] = 'true';
  input.style.cssText = `${metadataInputStyle};resize:vertical;line-height:1.45`;
  label.append(labelText, input);

  return label;
}

function renderPreview(container: HTMLElement, url: string): void {
  container.replaceChildren();
  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    const message = document.createElement('p');
    message.textContent = url.trim() ? 'Enter a valid YouTube URL to preview the video.' : 'Video preview will appear here.';
    message.style.cssText = 'margin:0;border:1px dashed #d4d4d8;padding:18px;text-align:center;font-size:12px;color:#71717a';
    container.append(message);
    return;
  }

  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube.com/embed/${videoId}`;
  frame.title = 'YouTube video preview';
  frame.loading = 'lazy';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;border:0;background:#18181b';
  container.append(frame);
}
