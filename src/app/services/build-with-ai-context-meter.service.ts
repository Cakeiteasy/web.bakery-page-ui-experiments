import { Injectable } from '@angular/core';

import {
  BuildWithAiChatMessage,
  BuildWithAiContextEstimate,
  BuildWithAiEditableFiles,
  BuildWithAiModelOption
} from '../models/build-with-ai.model';
import { BUILD_WITH_AI_CONTEXT_WARNING_RATIO } from '../pages/build-with-ai-page/build-with-ai.constants';

@Injectable({ providedIn: 'root' })
export class BuildWithAiContextMeterService {
  estimate(model: BuildWithAiModelOption, files: BuildWithAiEditableFiles, messages: BuildWithAiChatMessage[]): BuildWithAiContextEstimate {
    const messageChars = messages.reduce((sum, message) => {
      const attachmentChars = message.attachments.reduce((attachmentSum, attachment) => {
        if (attachment.kind === 'data-url') {
          return attachmentSum + (attachment.dataUrl?.length ?? 0);
        }

        return attachmentSum + (attachment.url?.length ?? 0);
      }, 0);

      return sum + message.text.length + attachmentChars;
    }, 0);

    const fileChars = files.html.length + files.css.length + files.js.length;
    const estimatedTokens = Math.ceil((messageChars + fileChars) / 4);
    const ratio = model.contextLimit > 0 ? estimatedTokens / model.contextLimit : 0;

    return {
      estimatedTokens,
      limit: model.contextLimit,
      ratio,
      nearLimit: ratio >= BUILD_WITH_AI_CONTEXT_WARNING_RATIO
    };
  }
}
